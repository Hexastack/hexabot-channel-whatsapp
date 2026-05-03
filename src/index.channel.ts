/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createHmac, timingSafeEqual } from "crypto";

import {
  ChannelCapabilities,
  ChannelHealthContext,
  CredentialService,
  DEFAULT_CHANNEL_CAPABILITIES,
  ExtensionInject,
  HttpChannelHandler,
  LanguageService,
  MessageInboundEvent,
  SubscriberCreateDto,
} from "@hexabot-ai/api";
import type {
  ActionOptions,
  IntegrationHealthItem,
  Source,
  StdOutgoingMessageEnvelope,
} from "@hexabot-ai/types";
import { Inject, Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Request, Response } from "express";

import {
  WhatsAppInboundEventDecoder,
  createWhatsAppInboundEventDecoder,
} from "./inbound";
import { WhatsAppAttachmentMessageInboundEvent } from "./inbound/events";
import {
  WhatsAppOutboundMessageEncoder,
  createWhatsAppOutboundMessageEncoder,
} from "./outbound";
import { WhatsAppGraphApiService } from "./services";
import {
  WHATSAPP_CHANNEL_NAME,
  WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA,
  WHATSAPP_CREDENTIAL_SETTING_KEYS,
  WhatsAppChannelSettings,
  WhatsAppCredentialSettingKey,
  WhatsAppResolvedChannelSettings,
} from "./settings.schema";
import { WhatsApp } from "./types";

type RawBodyRequest = Request & {
  rawBody?: string | Buffer;
};

const MAX_TYPING_DELAY_MS = 25000;

@Injectable()
export default class WhatsAppChannelHandler extends HttpChannelHandler<
  typeof WHATSAPP_CHANNEL_NAME
> {
  @Inject(LanguageService)
  private readonly languageService!: LanguageService;

  @Inject(ModuleRef)
  private readonly credentialsModuleRef!: ModuleRef;

  @ExtensionInject((name) => createWhatsAppInboundEventDecoder(name))
  private inboundEventDecoder!: WhatsAppInboundEventDecoder<
    typeof WHATSAPP_CHANNEL_NAME
  >;

  @ExtensionInject((name) => createWhatsAppOutboundMessageEncoder(name))
  private outboundMessageEncoder!: WhatsAppOutboundMessageEncoder;

  @ExtensionInject(WhatsAppGraphApiService)
  private graphApi!: WhatsAppGraphApiService;

  private credentialService?: CredentialService;

  constructor() {
    super(WHATSAPP_CHANNEL_NAME, WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA);
  }

  getCapabilities(): ChannelCapabilities {
    return {
      ...DEFAULT_CHANNEL_CAPABILITIES,
      typingIndicator: true,
      maxTextLength: 4096,
    };
  }

  protected async verifyWebhook(
    req: Request,
    res: Response,
    source: Source,
  ): Promise<void> {
    const settings = await this.parseSettingsWithCredentials(source.settings, [
      "verify_token",
    ]);
    const mode = this.getQueryParam(req, "hub.mode");
    const token = this.getQueryParam(req, "hub.verify_token");
    const challenge = this.getQueryParam(req, "hub.challenge");

    if (
      mode === "subscribe" &&
      challenge !== null &&
      token === settings.verify_token &&
      settings.verify_token.length > 0
    ) {
      res.status(200).send(challenge);

      return;
    }

    res.sendStatus(403);
  }

  protected async verifySignature(
    req: Request,
    _res: Response,
    source: Source,
  ): Promise<void> {
    const settings = await this.parseSettingsWithCredentials(source.settings, [
      "app_secret",
    ]);

    if (!settings.app_secret) {
      throw new Error("WhatsApp app secret is required");
    }

    const sha256Signature = this.getHeader(req, "x-hub-signature-256");
    const sha1Signature = this.getHeader(req, "x-hub-signature");
    const signature = sha256Signature ?? sha1Signature;

    if (!signature) {
      throw new Error("Missing WhatsApp webhook signature");
    }

    const [algorithm, digest] = signature.split("=");
    const normalizedAlgorithm =
      algorithm === "sha256" ? "sha256" : algorithm === "sha1" ? "sha1" : null;

    if (!normalizedAlgorithm || !digest) {
      throw new Error("Unsupported WhatsApp webhook signature");
    }

    const rawBody = (req as RawBodyRequest).rawBody;

    if (rawBody === undefined) {
      throw new Error("Missing raw request body");
    }

    const expected = createHmac(normalizedAlgorithm, settings.app_secret)
      .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
      .digest("hex");

    if (!this.safeCompareHex(digest, expected)) {
      throw new Error("Invalid WhatsApp webhook signature");
    }
  }

  protected async decode(req: Request, source: Source) {
    const settings = this.parseSettings(source.settings);
    const payload = WhatsApp.webhookSchema.parse(req.body);

    if (payload.object !== "whatsapp_business_account") {
      throw new Error("Unsupported WhatsApp webhook object");
    }

    return payload.entry.flatMap((entry) => {
      const businessAccountId = entry.id ?? "";

      if (
        settings.business_account_id &&
        businessAccountId &&
        settings.business_account_id !== businessAccountId
      ) {
        this.logger.warn(
          `Ignoring WhatsApp webhook entry for unexpected business account ${businessAccountId}`,
        );

        return [];
      }

      return entry.changes.flatMap((change) => {
        if (change.field !== "messages") {
          return [];
        }

        const { value } = change;
        const phoneNumberId = value.metadata.phone_number_id;

        if (
          settings.phone_number_id &&
          phoneNumberId &&
          settings.phone_number_id !== phoneNumberId
        ) {
          this.logger.warn(
            `Ignoring WhatsApp webhook change for unexpected phone number ${phoneNumberId}`,
          );

          return [];
        }

        const baseAttrs = {
          businessAccountId,
          phoneNumberId,
          displayPhoneNumber: value.metadata.display_phone_number ?? "",
        };
        const messageEvents = (value.messages ?? []).flatMap((message) => {
          const contact = value.contacts?.find(
            ({ wa_id }) => wa_id === message.from,
          );
          const channelAttrs = {
            ...baseAttrs,
            ...(contact
              ? {
                  contact: {
                    waId: contact.wa_id,
                    profileName: contact.profile?.name,
                  },
                }
              : {}),
          } satisfies WhatsApp.ChannelAttrs;

          return this.inboundEventDecoder.createEvents(message, channelAttrs);
        });
        const statusEvents = (value.statuses ?? []).flatMap((status) =>
          this.inboundEventDecoder.createEvents(status, baseAttrs),
        );

        return [...messageEvents, ...statusEvents];
      });
    });
  }

  protected async doSendMessage(
    event: MessageInboundEvent<typeof WHATSAPP_CHANNEL_NAME>,
    envelope: StdOutgoingMessageEnvelope,
    options: ActionOptions,
  ): Promise<{ mid: string }> {
    const settings = await this.parseSettingsWithCredentials(
      event.getSourceSettings(),
      ["access_token"],
    );
    const sourceId = event.getSourceId();

    if (!sourceId) {
      throw new Error("Cannot send WhatsApp message without source id");
    }

    const channelAttrs = event.getChannelAttrs<WhatsApp.ChannelAttrs>();
    const phoneNumberId =
      channelAttrs.phoneNumberId || settings.phone_number_id;

    if (!phoneNumberId) {
      throw new Error("Cannot send WhatsApp message without phone number id");
    }

    const recipientId = event.getSenderForeignId();
    const message = await this.outboundMessageEncoder.encode(envelope, {
      ...(options ?? {}),
      sourceId,
    });

    if (options?.typing) {
      const timeout = this.resolveTypingTimeout(envelope, options.typing);

      try {
        await this.graphApi.sendTypingIndicator(
          settings,
          phoneNumberId,
          event.getId(),
        );
        await this.sleep(timeout);
      } catch (err) {
        this.logger.error("Failed to send WhatsApp typing indicator", err);
      }
    }

    const response = await this.graphApi.sendMessage(settings, phoneNumberId, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientId,
      ...message,
    });

    return { mid: response.messages[0]?.id ?? "" };
  }

  async getSubscriberData(
    event: MessageInboundEvent<typeof WHATSAPP_CHANNEL_NAME>,
  ): Promise<SubscriberCreateDto> {
    const sourceId = event.getSourceId();
    const foreignId = event.getSenderForeignId();
    const channelAttrs = event.getChannelAttrs<WhatsApp.ChannelAttrs>();
    const [firstName, lastName] = this.splitName(
      channelAttrs.contact?.profileName,
    );

    return {
      foreignId,
      firstName,
      lastName,
      assignedTo: null,
      assignedAt: null,
      lastvisit: new Date(),
      retainedFrom: new Date(),
      avatar: null,
      channel: event.getChannelData(),
      language: await this.getDefaultLanguageSafe(),
      locale: "",
      timezone: 0,
      gender: null,
      country: null,
      labels: [],
      source: sourceId ?? "",
    };
  }

  async getMessageAttachments(
    event: MessageInboundEvent<typeof WHATSAPP_CHANNEL_NAME>,
  ) {
    if (!(event instanceof WhatsAppAttachmentMessageInboundEvent)) {
      return [];
    }

    const settings = await this.parseSettingsWithCredentials(
      event.getSourceSettings(),
      ["access_token"],
    );
    const channelAttrs = event.getChannelAttrs<WhatsApp.ChannelAttrs>();

    return await Promise.all(
      event
        .getRemoteAttachments()
        .map((media) =>
          this.graphApi.downloadMedia(
            settings,
            media,
            channelAttrs.phoneNumberId || settings.phone_number_id,
            this.resolveAttachmentName(media),
          ),
        ),
    );
  }

  async getIntegrationHealth(context: ChannelHealthContext) {
    const activeSources = context.sources.filter((source) => source.state);
    const missingSecrets = (
      await Promise.all(
        activeSources.map(async (source) => {
          const settings = this.parseSettings(source.settings);

          if (!this.hasCredentialRefs(settings)) {
            return source;
          }

          const resolvedSettings = await this.resolveSettingsCredentials(
            settings,
            WHATSAPP_CREDENTIAL_SETTING_KEYS,
          );

          return this.hasCredentialValues(resolvedSettings) ? null : source;
        }),
      )
    ).filter((source): source is Source => source !== null);

    if (activeSources.length === 0 || missingSecrets.length === 0) {
      return {
        ...context.defaultHealth,
        details: {
          ...(context.defaultHealth.details ?? {}),
          requiredSettings: [...WHATSAPP_CREDENTIAL_SETTING_KEYS],
        },
      } satisfies Partial<IntegrationHealthItem>;
    }

    return {
      status: "unhealthy",
      reason: "whatsapp.missing_required_settings",
      message: `${missingSecrets.length} active WhatsApp source${
        missingSecrets.length === 1 ? "" : "s"
      } missing required settings.`,
      details: {
        activeSources: activeSources.length,
        missingRequiredSettings: missingSecrets.length,
        requiredSettings: [...WHATSAPP_CREDENTIAL_SETTING_KEYS],
      },
    } satisfies Partial<IntegrationHealthItem>;
  }

  private resolveTypingTimeout(
    envelope: StdOutgoingMessageEnvelope,
    typing: boolean | number,
  ): number {
    const autoTimeout =
      envelope.data && "text" in envelope.data
        ? String(envelope.data.text).length * 10
        : 1000;
    const timeout = typeof typing === "number" ? typing : autoTimeout;

    return Math.min(timeout, MAX_TYPING_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseSettings(settings: unknown): WhatsAppChannelSettings {
    return WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA.parse(settings ?? {});
  }

  private async parseSettingsWithCredentials(
    settings: unknown,
    credentialKeys: readonly WhatsAppCredentialSettingKey[],
  ): Promise<WhatsAppResolvedChannelSettings> {
    return await this.resolveSettingsCredentials(
      this.parseSettings(settings),
      credentialKeys,
    );
  }

  private async resolveSettingsCredentials(
    settings: WhatsAppChannelSettings,
    credentialKeys: readonly WhatsAppCredentialSettingKey[],
  ): Promise<WhatsAppResolvedChannelSettings> {
    const resolvedSettings = { ...settings };

    await Promise.all(
      credentialKeys.map(async (key) => {
        resolvedSettings[key] = await this.resolveCredentialValue(
          settings[key],
        );
      }),
    );

    return resolvedSettings;
  }

  private async resolveCredentialValue(credentialId: string): Promise<string> {
    const id = credentialId.trim();

    if (!id) {
      return "";
    }

    const value = await this.getCredentialService().findOneValue(id);

    return value.trim();
  }

  private getCredentialService(): CredentialService {
    if (!this.credentialService) {
      this.credentialService = this.credentialsModuleRef.get(
        CredentialService,
        { strict: false },
      );
    }

    return this.credentialService;
  }

  private hasCredentialRefs(settings: WhatsAppChannelSettings): boolean {
    return WHATSAPP_CREDENTIAL_SETTING_KEYS.every((key) =>
      Boolean(settings[key].trim()),
    );
  }

  private hasCredentialValues(
    settings: WhatsAppResolvedChannelSettings,
  ): boolean {
    return WHATSAPP_CREDENTIAL_SETTING_KEYS.every((key) =>
      Boolean(settings[key].trim()),
    );
  }

  private getDefaultLanguageSafe(): Promise<string> {
    return this.languageService
      .getDefaultLanguage()
      .then((language) => language.code)
      .catch(() => "");
  }

  private splitName(value: string | undefined): [string, string] {
    const normalized = value?.trim();

    if (!normalized) {
      return ["WhatsApp", "User"];
    }

    const [firstName, ...rest] = normalized.split(/\s+/);

    return [firstName, rest.length > 0 ? rest.join(" ") : "User"];
  }

  private getQueryParam(req: Request, key: string): string | null {
    const value = req.query[key];

    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : null;
    }

    return typeof value === "string" ? value : null;
  }

  private getHeader(req: Request, key: string): string | null {
    const value = req.headers[key.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return typeof value === "string" ? value : null;
  }

  private safeCompareHex(actual: string, expected: string): boolean {
    const actualBuffer = Uint8Array.from(Buffer.from(actual, "hex"));
    const expectedBuffer = Uint8Array.from(Buffer.from(expected, "hex"));

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private resolveAttachmentName(media: WhatsApp.WebhookMedia): string {
    if (media.filename) {
      return media.filename;
    }

    if (media.caption) {
      return media.caption;
    }

    if (media.mime_type) {
      return `whatsapp-${media.mime_type.split("/")[0]}-${media.id}`;
    }

    return `whatsapp-media-${media.id}`;
  }
}
