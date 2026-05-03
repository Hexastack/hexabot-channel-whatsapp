/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  ChannelAttachmentService,
  ChannelOutboundMessageEncoder,
  ContentOrmEntity,
  I18nService,
} from "@hexabot-ai/api";
import {
  ActionOptions,
  Button,
  ButtonType,
  ContentElement,
  FileType,
  OutgoingMessageType,
  StdOutgoingAttachmentMessageData,
  StdOutgoingButtonsMessageData,
  StdOutgoingListMessageData,
  StdOutgoingMessageEnvelope,
  StdOutgoingQuickRepliesMessageData,
  StdOutgoingTextMessageData,
} from "@hexabot-ai/types";
import { Injectable, Type } from "@nestjs/common";

import { WhatsApp } from "../types";

export type WhatsAppSourceScopedEncodeOptions = ActionOptions & {
  sourceId: string;
};

const WHATSAPP_TEXT_LIMIT = 4096;
const WHATSAPP_INTERACTIVE_BODY_LIMIT = 1024;
const WHATSAPP_REPLY_BUTTON_LIMIT = 3;
const WHATSAPP_REPLY_TITLE_LIMIT = 20;
const WHATSAPP_REPLY_ID_LIMIT = 256;
const WHATSAPP_LIST_ROW_LIMIT = 10;
const WHATSAPP_LIST_BUTTON_LIMIT = 20;
const WHATSAPP_LIST_ROW_ID_LIMIT = 200;
const WHATSAPP_LIST_ROW_TITLE_LIMIT = 24;
const WHATSAPP_LIST_ROW_DESCRIPTION_LIMIT = 72;
const WHATSAPP_LIST_SECTION_TITLE_LIMIT = 24;
const VIEW_MORE_PAYLOAD = "VIEW_MORE";

export class WhatsAppOutboundMessageEncoder extends ChannelOutboundMessageEncoder<
  WhatsApp.OutboundMessage,
  WhatsAppSourceScopedEncodeOptions
> {
  constructor(
    private readonly i18n: I18nService,
    private readonly channelAttachmentService: ChannelAttachmentService,
  ) {
    super();
  }

  async encode(
    envelope: StdOutgoingMessageEnvelope,
    options: WhatsAppSourceScopedEncodeOptions,
  ): Promise<WhatsApp.OutboundMessage> {
    if (!options?.sourceId) {
      throw new Error("Missing sourceId in outbound encode options");
    }

    return await this.dispatchEnvelope(envelope, options, {
      [OutgoingMessageType.text]: ({ data }) => this.encodeTextMessage(data),
      [OutgoingMessageType.quickReply]: ({ data }) =>
        this.encodeQuickRepliesMessage(data),
      [OutgoingMessageType.buttons]: ({ data }) =>
        this.encodeButtonsMessage(data),
      [OutgoingMessageType.attachment]: ({ data }, sourceOptions) =>
        this.encodeAttachmentMessage(data, sourceOptions.sourceId),
      [OutgoingMessageType.list]: ({ data }, actionOptions) =>
        this.encodeListMessage(data, actionOptions),
      [OutgoingMessageType.carousel]: ({ data }, actionOptions) =>
        this.encodeCarouselMessage(data, actionOptions),
    });
  }

  protected encodeTextMessage(
    message: StdOutgoingTextMessageData,
  ): WhatsApp.OutboundMessage {
    this.assertLength(
      "WhatsApp text message body",
      message.text,
      WHATSAPP_TEXT_LIMIT,
    );

    return {
      type: "text",
      text: {
        body: message.text,
      },
    };
  }

  protected encodeQuickRepliesMessage(
    message: StdOutgoingQuickRepliesMessageData,
  ): WhatsApp.OutboundMessage {
    this.assertLength(
      "WhatsApp interactive body",
      message.text,
      WHATSAPP_INTERACTIVE_BODY_LIMIT,
    );

    return this.encodeReplyButtons(
      message.text,
      message.quickReplies.map(({ title, payload }) => ({
        title,
        payload,
      })),
    );
  }

  protected encodeButtonsMessage(
    message: StdOutgoingButtonsMessageData,
  ): WhatsApp.OutboundMessage {
    if (message.buttons.length === 0) {
      throw new Error("WhatsApp buttons message requires at least one button");
    }

    this.assertLength(
      "WhatsApp interactive body",
      message.text,
      WHATSAPP_INTERACTIVE_BODY_LIMIT,
    );

    const urlButtons = message.buttons.filter(
      (button): button is Extract<Button, { type: ButtonType.web_url }> =>
        button.type === ButtonType.web_url,
    );
    const postbackButtons = message.buttons.filter(
      (button): button is Extract<Button, { type: ButtonType.postback }> =>
        button.type === ButtonType.postback,
    );

    if (urlButtons.length === 1 && postbackButtons.length === 0) {
      const [button] = urlButtons;
      this.assertLength(
        "WhatsApp CTA button title",
        button.title,
        WHATSAPP_REPLY_TITLE_LIMIT,
      );

      return {
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: {
            text: message.text,
          },
          action: {
            name: "cta_url",
            parameters: {
              display_text: button.title,
              url: this.ensureHttpUrl(button.url),
            },
          },
        },
      };
    }

    if (urlButtons.length > 0) {
      throw new Error(
        "WhatsApp supports a single URL button only when no postback buttons are present",
      );
    }

    return this.encodeReplyButtons(
      message.text,
      postbackButtons.map(({ title, payload }) => ({
        title,
        payload,
      })),
    );
  }

  protected async encodeAttachmentMessage(
    message: StdOutgoingAttachmentMessageData,
    sourceId: string,
  ): Promise<WhatsApp.OutboundMessage> {
    if (message.quickReplies && message.quickReplies.length > 0) {
      throw new Error(
        "WhatsApp attachment quick replies are not supported in this version",
      );
    }

    const link = await this.channelAttachmentService.getPublicUrl(
      sourceId,
      message.attachment.payload,
    );
    const media = {
      link,
    };

    switch (message.attachment.type) {
      case FileType.image:
        return {
          type: "image",
          image: media,
        };
      case FileType.audio:
        return {
          type: "audio",
          audio: media,
        };
      case FileType.video:
        return {
          type: "video",
          video: media,
        };
      case FileType.file:
      case FileType.unknown:
      default:
        return {
          type: "document",
          document: media,
        };
    }
  }

  protected async encodeListMessage(
    message: StdOutgoingListMessageData,
    options: WhatsAppSourceScopedEncodeOptions,
  ): Promise<WhatsApp.OutboundMessage> {
    if (!message.elements.length) {
      throw new Error("WhatsApp list message requires at least one element");
    }

    return this.encodeInteractiveList(message, options);
  }

  protected async encodeCarouselMessage(
    message: StdOutgoingListMessageData,
    options: WhatsAppSourceScopedEncodeOptions,
  ): Promise<WhatsApp.OutboundMessage> {
    if (!message.elements.length) {
      throw new Error(
        "WhatsApp carousel message requires at least one element",
      );
    }

    return this.encodeInteractiveList(message, options);
  }

  private encodeReplyButtons(
    text: string,
    buttons: Array<{ title: string; payload: string }>,
  ): WhatsApp.OutboundMessage {
    if (buttons.length === 0) {
      throw new Error("WhatsApp reply buttons require at least one button");
    }

    if (buttons.length > WHATSAPP_REPLY_BUTTON_LIMIT) {
      throw new Error(
        `WhatsApp supports up to ${WHATSAPP_REPLY_BUTTON_LIMIT} reply buttons`,
      );
    }

    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text,
        },
        action: {
          buttons: buttons.map((button) => this.encodeReplyButton(button)),
        },
      },
    };
  }

  private encodeReplyButton(button: {
    title: string;
    payload: string;
  }): WhatsApp.ReplyButton {
    this.assertLength(
      "WhatsApp reply button title",
      button.title,
      WHATSAPP_REPLY_TITLE_LIMIT,
    );
    this.assertLength(
      "WhatsApp reply button payload",
      button.payload,
      WHATSAPP_REPLY_ID_LIMIT,
    );

    return {
      type: "reply",
      reply: {
        id: button.payload,
        title: button.title,
      },
    };
  }

  private async encodeInteractiveList(
    message: StdOutgoingListMessageData,
    options: WhatsAppSourceScopedEncodeOptions,
  ): Promise<WhatsApp.OutboundMessage> {
    const fields = options.content?.fields ?? message.options.fields;
    const buttons = options.content?.buttons ?? message.options.buttons ?? [];

    if (!fields?.title) {
      throw new Error("Content options are missing the title field");
    }

    const hasMore =
      message.pagination.total -
        message.pagination.skip -
        message.pagination.limit >
      0;
    const rowLimit = hasMore
      ? WHATSAPP_LIST_ROW_LIMIT - 1
      : WHATSAPP_LIST_ROW_LIMIT;
    const rows = this.encodeContentRows(
      message.elements.slice(0, rowLimit),
      fields,
      buttons,
    );

    if (hasMore) {
      rows.push({
        id: VIEW_MORE_PAYLOAD,
        title: this.truncateText(
          this.i18n.t("View More"),
          WHATSAPP_LIST_ROW_TITLE_LIMIT,
        ),
      });
    }

    const buttonText = this.truncateText(
      buttons[0]?.title || this.i18n.t("Options"),
      WHATSAPP_LIST_BUTTON_LIMIT,
    );
    const bodyText = this.truncateText(
      this.i18n.t("Select an option"),
      WHATSAPP_INTERACTIVE_BODY_LIMIT,
    );

    return {
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: bodyText,
        },
        action: {
          button: buttonText,
          sections: [
            {
              title: this.truncateText(
                this.i18n.t("Options"),
                WHATSAPP_LIST_SECTION_TITLE_LIMIT,
              ),
              rows,
            },
          ],
        },
      },
    };
  }

  private encodeContentRows(
    elements: ContentElement[],
    fields: NonNullable<ActionOptions["content"]>["fields"],
    buttons: Button[],
  ): WhatsApp.Row[] {
    return elements.map((item) => {
      const title = this.stringifyField(item[fields.title]);
      const description =
        fields.subtitle && item[fields.subtitle] !== undefined
          ? this.stringifyField(item[fields.subtitle])
          : undefined;
      const id = this.resolveContentPayload(item, fields, buttons);

      this.assertLength("WhatsApp list row id", id, WHATSAPP_LIST_ROW_ID_LIMIT);

      return {
        id,
        title: this.truncateText(title, WHATSAPP_LIST_ROW_TITLE_LIMIT),
        ...(description
          ? {
              description: this.truncateText(
                description,
                WHATSAPP_LIST_ROW_DESCRIPTION_LIMIT,
              ),
            }
          : {}),
      };
    });
  }

  private resolveContentPayload(
    item: ContentElement,
    fields: NonNullable<ActionOptions["content"]>["fields"],
    buttons: Button[],
  ): string {
    const postbackButton = buttons.find(
      (button): button is Extract<Button, { type: ButtonType.postback }> =>
        button.type === ButtonType.postback,
    );
    const payload =
      fields.action_payload && item[fields.action_payload] !== undefined
        ? this.stringifyField(item[fields.action_payload])
        : ContentOrmEntity.getPayload(item);

    return postbackButton ? `${postbackButton.title}:${payload}` : payload;
  }

  private assertLength(name: string, value: string, max: number): void {
    if (value.length > max) {
      throw new Error(`${name} exceeds ${max} characters`);
    }
  }

  private truncateText(value: string, max: number): string {
    if (value.length <= max) {
      return value;
    }

    return value.slice(0, Math.max(0, max - 3)) + "...";
  }

  private stringifyField(value: unknown): string {
    return value === undefined || value === null ? "" : String(value);
  }

  private ensureHttpUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
}

export function createWhatsAppOutboundMessageEncoder(
  _channelName: string,
): Type<WhatsAppOutboundMessageEncoder> {
  @Injectable()
  class BoundWhatsAppOutboundMessageEncoder extends WhatsAppOutboundMessageEncoder {
    constructor(
      i18n: I18nService,
      channelAttachmentService: ChannelAttachmentService,
    ) {
      super(i18n, channelAttachmentService);
    }
  }

  return BoundWhatsAppOutboundMessageEncoder;
}

export default WhatsAppOutboundMessageEncoder;
