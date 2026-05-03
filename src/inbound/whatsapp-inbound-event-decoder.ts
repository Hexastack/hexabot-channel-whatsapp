/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { randomUUID } from "crypto";

import {
  ChannelInboundEvent,
  ChannelInboundEventContext,
  ChannelInboundEventDecoder,
  ChannelName,
} from "@hexabot-ai/api";
import { Injectable, Type } from "@nestjs/common";

import { WhatsApp, type WhatsAppSubscriberChannelAttrs } from "../types";

import WhatsAppDeliveryInboundEvent from "./events/delivery.event";
import WhatsAppErrorInboundEvent from "./events/error.event";
import WhatsAppAttachmentMessageInboundEvent from "./events/messages/attachment.event";
import WhatsAppLocationMessageInboundEvent from "./events/messages/location.event";
import WhatsAppPostbackInboundEvent from "./events/messages/postback.event";
import WhatsAppTextMessageInboundEvent from "./events/messages/text.event";
import WhatsAppReadInboundEvent from "./events/read.event";

export class WhatsAppInboundEventDecoder<
  N extends ChannelName = ChannelName,
> implements ChannelInboundEventDecoder<
  N,
  ChannelInboundEvent<N, WhatsApp.Event, WhatsAppSubscriberChannelAttrs<N>>,
  WhatsAppSubscriberChannelAttrs<N>
> {
  readonly channel: N;

  constructor(channel: N) {
    this.channel = channel;
  }

  createEvents(
    raw: unknown,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): Array<
    ChannelInboundEvent<N, WhatsApp.Event, WhatsAppSubscriberChannelAttrs<N>>
  > {
    const event = this.isStatusPayload(raw)
      ? WhatsApp.webhookStatusSchema.parse(raw)
      : WhatsApp.webhookMessageSchema.parse(raw);
    const concreteEvent = this.createEvent(event, channelAttrs);

    return concreteEvent ? [concreteEvent] : [];
  }

  private createEvent(
    event: WhatsApp.Event,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): ChannelInboundEvent<
    N,
    WhatsApp.Event,
    WhatsAppSubscriberChannelAttrs<N>
  > | null {
    if (this.isStatus(event)) {
      return this.createStatusEvent(event, channelAttrs);
    }

    return this.createMessageEvent(event, channelAttrs);
  }

  private createStatusEvent(
    status: WhatsApp.WebhookStatus,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): ChannelInboundEvent<
    N,
    WhatsApp.Event,
    WhatsAppSubscriberChannelAttrs<N>
  > | null {
    if (status.status === "delivered") {
      return new WhatsAppDeliveryInboundEvent(
        this.createStatusContext(status, channelAttrs),
        [status.id],
      );
    }

    if (status.status === "read") {
      return new WhatsAppReadInboundEvent(
        this.createStatusContext(status, channelAttrs),
        this.toWatermark(status.timestamp),
      );
    }

    if (status.status === "failed") {
      return new WhatsAppErrorInboundEvent(
        this.createStatusContext(status, channelAttrs),
        status,
      );
    }

    return null;
  }

  private createMessageEvent(
    message: WhatsApp.WebhookMessage,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): ChannelInboundEvent<
    N,
    WhatsApp.WebhookMessage,
    WhatsAppSubscriberChannelAttrs<N>
  > | null {
    switch (message.type) {
      case WhatsApp.WebhookMessageType.Text:
        return new WhatsAppTextMessageInboundEvent(
          this.createMessageContext(message, channelAttrs),
          message.text?.body ?? "",
        );

      case WhatsApp.WebhookMessageType.Contacts:
        return new WhatsAppTextMessageInboundEvent(
          this.createMessageContext(message, channelAttrs),
          this.serializeContactsToText(message.contacts ?? []),
        );

      case WhatsApp.WebhookMessageType.Interactive:
        return this.createInteractiveReplyEvent(message, channelAttrs);

      case WhatsApp.WebhookMessageType.Button:
        return new WhatsAppPostbackInboundEvent(
          this.createMessageContext(message, channelAttrs),
          message.button?.payload ?? message.button?.text ?? "",
          message.button?.text ?? message.button?.payload ?? "",
        );

      case WhatsApp.WebhookMessageType.Location:
        if (!message.location) {
          return null;
        }

        return new WhatsAppLocationMessageInboundEvent(
          this.createMessageContext(message, channelAttrs),
          message.location.latitude,
          message.location.longitude,
        );

      case WhatsApp.WebhookMessageType.Image:
      case WhatsApp.WebhookMessageType.Audio:
      case WhatsApp.WebhookMessageType.Video:
      case WhatsApp.WebhookMessageType.Document:
      case WhatsApp.WebhookMessageType.Sticker: {
        const media = this.getMessageMedia(message);

        return media
          ? new WhatsAppAttachmentMessageInboundEvent(
              this.createMessageContext(message, channelAttrs),
              [media],
            )
          : null;
      }

      default:
        return null;
    }
  }

  private createInteractiveReplyEvent(
    message: WhatsApp.WebhookMessage,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): WhatsAppPostbackInboundEvent<N> | null {
    const interactive = message.interactive;

    if (!interactive) {
      return null;
    }

    const reply =
      interactive.type === "button_reply"
        ? interactive.button_reply
        : interactive.list_reply;

    if (!reply) {
      return null;
    }

    return new WhatsAppPostbackInboundEvent(
      this.createMessageContext(message, channelAttrs),
      reply.id,
      reply.title,
    );
  }

  private createMessageContext(
    message: WhatsApp.WebhookMessage,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): ChannelInboundEventContext<
    N,
    WhatsApp.WebhookMessage,
    WhatsAppSubscriberChannelAttrs<N>
  > {
    return new ChannelInboundEventContext(
      this.channel,
      message,
      channelAttrs,
      this.getOccurredAt(message.timestamp),
      message.id,
      message.from,
      this.getRecipientForeignId(channelAttrs),
    );
  }

  private createStatusContext(
    status: WhatsApp.WebhookStatus,
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): ChannelInboundEventContext<
    N,
    WhatsApp.Event,
    WhatsAppSubscriberChannelAttrs<N>
  > {
    return new ChannelInboundEventContext(
      this.channel,
      status,
      channelAttrs,
      this.getOccurredAt(status.timestamp),
      `${status.status}:${status.id}:${status.timestamp}`,
      status.recipient_id,
      this.getRecipientForeignId(channelAttrs),
    );
  }

  private getMessageMedia(
    message: WhatsApp.WebhookMessage,
  ): WhatsApp.WebhookMedia | null {
    switch (message.type) {
      case WhatsApp.WebhookMessageType.Image:
        return message.image ?? null;
      case WhatsApp.WebhookMessageType.Audio:
        return message.audio ?? null;
      case WhatsApp.WebhookMessageType.Video:
        return message.video ?? null;
      case WhatsApp.WebhookMessageType.Document:
        return message.document ?? null;
      case WhatsApp.WebhookMessageType.Sticker:
        return message.sticker ?? null;
      default:
        return null;
    }
  }

  private getRecipientForeignId(
    channelAttrs: WhatsAppSubscriberChannelAttrs<N>,
  ): string {
    const attrs = channelAttrs as unknown as Partial<WhatsApp.ChannelAttrs>;

    return attrs.phoneNumberId ?? attrs.displayPhoneNumber ?? "";
  }

  private getOccurredAt(timestamp: string | number): Date {
    const value = Number(timestamp);
    const milliseconds = value < 100000000000 ? value * 1000 : value;
    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private toWatermark(timestamp: string | number): number {
    const date = this.getOccurredAt(timestamp);

    return date.getTime();
  }

  private isStatusPayload(raw: unknown): boolean {
    return !!raw && typeof raw === "object" && "status" in raw;
  }

  private isStatus(event: WhatsApp.Event): event is WhatsApp.WebhookStatus {
    return "status" in event;
  }

  private serializeContactsToText(contacts: WhatsApp.ContactMessage[]): string {
    if (contacts.length === 0) {
      return "Contacts";
    }

    return contacts
      .map((contact) => {
        const lines: string[] = [`Name: ${contact.name.formatted_name}`];

        if (contact.name.first_name) {
          lines.push(`First Name: ${contact.name.first_name}`);
        }

        if (contact.name.last_name) {
          lines.push(`Last Name: ${contact.name.last_name}`);
        }

        if (contact.org?.company) {
          lines.push(`Company: ${contact.org.company}`);
        }

        if (contact.phones?.length) {
          lines.push(
            `Phones: ${contact.phones
              .map((phone) => phone.phone ?? phone.wa_id)
              .filter(Boolean)
              .join(", ")}`,
          );
        }

        if (contact.emails?.length) {
          lines.push(
            `Emails: ${contact.emails
              .map((email) => email.email)
              .filter(Boolean)
              .join(", ")}`,
          );
        }

        if (contact.urls?.length) {
          lines.push(
            `URLs: ${contact.urls
              .map((url) => (typeof url === "string" ? url : url.url))
              .filter(Boolean)
              .join(", ")}`,
          );
        }

        return lines.join("\n");
      })
      .join("\n\n")
      .trim();
  }

  protected getFallbackEventId(): string {
    return randomUUID();
  }
}

export function createWhatsAppInboundEventDecoder<N extends ChannelName>(
  channelName: N,
): Type<WhatsAppInboundEventDecoder<N>> {
  @Injectable()
  class BoundWhatsAppInboundEventDecoder extends WhatsAppInboundEventDecoder<N> {
    constructor() {
      super(channelName);
    }
  }

  return BoundWhatsAppInboundEventDecoder;
}

export default WhatsAppInboundEventDecoder;
