/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ChannelName } from "@hexabot-ai/api";
import { z } from "zod";

export namespace WhatsApp {
  export type ChannelAttrs = {
    businessAccountId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    contact?: {
      waId: string;
      profileName?: string;
    };
  };

  export const metadataSchema = z.looseObject({
    display_phone_number: z.string().optional(),
    phone_number_id: z.string(),
  });

  export type Metadata = z.infer<typeof metadataSchema>;

  export const webhookContactSchema = z.looseObject({
    wa_id: z.string(),
    profile: z
      .looseObject({
        name: z.string().optional(),
      })
      .optional(),
  });

  export type WebhookContact = z.infer<typeof webhookContactSchema>;

  export enum WebhookMessageType {
    Text = "text",
    Image = "image",
    Audio = "audio",
    Video = "video",
    Document = "document",
    Sticker = "sticker",
    Interactive = "interactive",
    Button = "button",
    Contacts = "contacts",
    Location = "location",
    Order = "order",
    System = "system",
    Reaction = "reaction",
    Unknown = "unknown",
  }

  export const webhookMediaSchema = z.looseObject({
    id: z.string(),
    mime_type: z.string().optional(),
    sha256: z.string().optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
  });

  export type WebhookMedia = z.infer<typeof webhookMediaSchema>;

  export const contactMessageSchema = z.looseObject({
    name: z.looseObject({
      formatted_name: z.string(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      middle_name: z.string().optional(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
    }),
    birthday: z.string().optional(),
    org: z
      .looseObject({
        company: z.string().optional(),
        department: z.string().optional(),
        title: z.string().optional(),
      })
      .optional(),
    emails: z
      .array(
        z.looseObject({
          email: z.string().optional(),
          type: z.string().optional(),
        }),
      )
      .optional(),
    phones: z
      .array(
        z.looseObject({
          phone: z.string().optional(),
          type: z.string().optional(),
          wa_id: z.string().optional(),
        }),
      )
      .optional(),
    addresses: z
      .array(
        z.looseObject({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
          country_code: z.string().optional(),
          type: z.string().optional(),
        }),
      )
      .optional(),
    urls: z
      .array(
        z.union([
          z.string(),
          z.looseObject({
            url: z.string().optional(),
            type: z.string().optional(),
          }),
        ]),
      )
      .optional(),
  });

  export type ContactMessage = z.infer<typeof contactMessageSchema>;

  export const webhookMessageSchema = z.looseObject({
    from: z.string(),
    id: z.string(),
    timestamp: z.union([z.string(), z.number()]),
    type: z.enum(WebhookMessageType),
    text: z
      .looseObject({
        body: z.string(),
      })
      .optional(),
    image: webhookMediaSchema.optional(),
    audio: webhookMediaSchema.optional(),
    video: webhookMediaSchema.optional(),
    document: webhookMediaSchema.optional(),
    sticker: webhookMediaSchema.optional(),
    interactive: z
      .looseObject({
        type: z.enum(["button_reply", "list_reply"]),
        button_reply: z
          .looseObject({
            id: z.string(),
            title: z.string(),
          })
          .optional(),
        list_reply: z
          .looseObject({
            id: z.string(),
            title: z.string(),
            description: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    button: z
      .looseObject({
        payload: z.string(),
        text: z.string(),
      })
      .optional(),
    location: z
      .looseObject({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    contacts: z.array(contactMessageSchema).optional(),
    errors: z
      .array(
        z.looseObject({
          code: z.union([z.string(), z.number()]).optional(),
          title: z.string().optional(),
          message: z.string().optional(),
          details: z.string().optional(),
        }),
      )
      .optional(),
  });

  export type WebhookMessage = z.infer<typeof webhookMessageSchema>;

  export const webhookStatusSchema = z.looseObject({
    id: z.string(),
    recipient_id: z.string(),
    status: z.enum(["sent", "delivered", "read", "failed", "deleted"]),
    timestamp: z.union([z.string(), z.number()]),
    type: z.string().optional(),
    errors: z
      .array(
        z.looseObject({
          code: z.union([z.string(), z.number()]).optional(),
          title: z.string().optional(),
          message: z.string().optional(),
          details: z.string().optional(),
        }),
      )
      .optional(),
  });

  export type WebhookStatus = z.infer<typeof webhookStatusSchema>;

  export type Event = WebhookMessage | WebhookStatus;

  export const valueSchema = z.looseObject({
    messaging_product: z.literal("whatsapp"),
    metadata: metadataSchema,
    contacts: z.array(webhookContactSchema).optional(),
    messages: z.array(webhookMessageSchema).optional(),
    statuses: z.array(webhookStatusSchema).optional(),
    errors: z
      .array(
        z.looseObject({
          code: z.union([z.string(), z.number()]).optional(),
          title: z.string().optional(),
          message: z.string().optional(),
          details: z.string().optional(),
        }),
      )
      .optional(),
  });

  export type WebhookValue = z.infer<typeof valueSchema>;

  export const webhookSchema = z.looseObject({
    object: z.string(),
    entry: z.array(
      z.looseObject({
        id: z.string().optional(),
        changes: z.array(
          z.looseObject({
            field: z.string(),
            value: valueSchema,
          }),
        ),
      }),
    ),
  });

  export type Webhook = z.infer<typeof webhookSchema>;

  export type MediaMetadata = {
    messaging_product?: "whatsapp";
    url: string;
    mime_type?: string;
    sha256?: string;
    file_size?: string;
    id: string;
  };

  export type MediaObject = {
    link: string;
    caption?: string;
    filename?: string;
  };

  export type ReplyButton = {
    type: "reply";
    reply: {
      id: string;
      title: string;
    };
  };

  export type Row = {
    id: string;
    title: string;
    description?: string;
  };

  export type InteractiveMessage =
    | {
        type: "interactive";
        interactive: {
          type: "button";
          body: {
            text: string;
          };
          action: {
            buttons: ReplyButton[];
          };
        };
      }
    | {
        type: "interactive";
        interactive: {
          type: "list";
          body: {
            text: string;
          };
          action: {
            button: string;
            sections: Array<{
              title?: string;
              rows: Row[];
            }>;
          };
        };
      }
    | {
        type: "interactive";
        interactive: {
          type: "cta_url";
          body: {
            text: string;
          };
          action: {
            name: "cta_url";
            parameters: {
              display_text: string;
              url: string;
            };
          };
        };
      };

  export type OutboundMessage =
    | {
        type: "text";
        text: {
          body: string;
          preview_url?: boolean;
        };
      }
    | InteractiveMessage
    | {
        type: "image";
        image: MediaObject;
      }
    | {
        type: "audio";
        audio: MediaObject;
      }
    | {
        type: "video";
        video: MediaObject;
      }
    | {
        type: "document";
        document: MediaObject;
      };

  export type SendMessagePayload = {
    messaging_product: "whatsapp";
    recipient_type: "individual";
    to: string;
  } & OutboundMessage;

  export type SendMessageResponse = {
    messaging_product?: "whatsapp";
    contacts?: Array<{
      input?: string;
      wa_id?: string;
    }>;
    messages: Array<{
      id: string;
    }>;
  };

  export type TypingIndicatorPayload = {
    messaging_product: "whatsapp";
    status: "read";
    message_id: string;
    typing_indicator?: {
      type: "text";
    };
  };

  export type ReadReceiptResponse = {
    success: boolean;
  };
}

export type WhatsAppSubscriberChannelAttrs<
  N extends ChannelName = ChannelName,
> = N extends keyof SubscriberChannelDict
  ? SubscriberChannelDict[N]
  : WhatsApp.ChannelAttrs;
