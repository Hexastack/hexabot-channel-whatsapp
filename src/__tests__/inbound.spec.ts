/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  IncomingMessageType,
  PayloadType,
  StdEventType,
} from "@hexabot-ai/types";

import { WhatsAppInboundEventDecoder } from "../inbound";
import {
  WhatsAppAttachmentMessageInboundEvent,
  WhatsAppDeliveryInboundEvent,
  WhatsAppErrorInboundEvent,
  WhatsAppLocationMessageInboundEvent,
  WhatsAppPostbackInboundEvent,
  WhatsAppReadInboundEvent,
  WhatsAppTextMessageInboundEvent,
} from "../inbound/events";
import { WHATSAPP_CHANNEL_NAME } from "../settings.schema";
import { WhatsApp } from "../types";

const attrs = {
  businessAccountId: "waba-1",
  phoneNumberId: "phone-1",
  displayPhoneNumber: "+15550000000",
  contact: {
    waId: "15551112222",
    profileName: "Jane Subscriber",
  },
};
const baseMessage = {
  from: "15551112222",
  id: "wamid.message",
  timestamp: "1710000000",
};
const expectWhatsAppEvent = <T>(
  event: unknown,
  eventClass: abstract new (...args: any[]) => T,
): T => {
  expect(event).toBeInstanceOf(eventClass);

  return event as T;
};

describe("WhatsAppInboundEventDecoder", () => {
  const decoder = new WhatsAppInboundEventDecoder(WHATSAPP_CHANNEL_NAME);

  it("decodes text messages", () => {
    const [event] = decoder.createEvents(
      {
        ...baseMessage,
        type: WhatsApp.WebhookMessageType.Text,
        text: {
          body: "hello",
        },
      },
      attrs,
    );
    const messageEvent = expectWhatsAppEvent(
      event,
      WhatsAppTextMessageInboundEvent,
    );

    expect(messageEvent.getEventType()).toBe(StdEventType.message);
    expect(messageEvent.getSenderForeignId()).toBe("15551112222");
    expect(messageEvent.getRecipientForeignId()).toBe("phone-1");
    expect(messageEvent.getOccurredAt().toISOString()).toBe(
      "2024-03-09T16:00:00.000Z",
    );
    expect(messageEvent.getMessage()).toEqual({
      type: IncomingMessageType.text,
      data: { text: "hello" },
    });
  });

  it("serializes contact cards as text messages", () => {
    const [event] = decoder.createEvents(
      {
        ...baseMessage,
        type: WhatsApp.WebhookMessageType.Contacts,
        contacts: [
          {
            name: {
              formatted_name: "John Doe",
              first_name: "John",
              last_name: "Doe",
            },
            phones: [{ phone: "+15550000001" }],
            emails: [{ email: "john@example.com" }],
          },
        ],
      },
      attrs,
    );
    const messageEvent = expectWhatsAppEvent(
      event,
      WhatsAppTextMessageInboundEvent,
    );

    expect(messageEvent.getText()).toContain("Name: John Doe");
    expect(messageEvent.getText()).toContain("Phones: +15550000001");
  });

  it("decodes interactive button and list replies as postbacks", () => {
    const [button] = decoder.createEvents(
      {
        ...baseMessage,
        id: "wamid.button",
        type: WhatsApp.WebhookMessageType.Interactive,
        interactive: {
          type: "button_reply",
          button_reply: {
            id: "YES",
            title: "Yes",
          },
        },
      },
      attrs,
    );
    const [list] = decoder.createEvents(
      {
        ...baseMessage,
        id: "wamid.list",
        type: WhatsApp.WebhookMessageType.Interactive,
        interactive: {
          type: "list_reply",
          list_reply: {
            id: "ITEM_1",
            title: "Item 1",
          },
        },
      },
      attrs,
    );

    expect(
      expectWhatsAppEvent(button, WhatsAppPostbackInboundEvent).getPayload(),
    ).toBe("YES");
    expect(
      expectWhatsAppEvent(list, WhatsAppPostbackInboundEvent).getPayload(),
    ).toBe("ITEM_1");
  });

  it("decodes template button replies as postbacks", () => {
    const [event] = decoder.createEvents(
      {
        ...baseMessage,
        type: WhatsApp.WebhookMessageType.Button,
        button: {
          payload: "TEMPLATE_REPLY",
          text: "Reply",
        },
      },
      attrs,
    );
    const messageEvent = expectWhatsAppEvent(
      event,
      WhatsAppPostbackInboundEvent,
    );

    expect(messageEvent.getMessage()).toEqual({
      type: IncomingMessageType.postback,
      data: {
        payload: "TEMPLATE_REPLY",
        text: "Reply",
      },
    });
  });

  it("decodes location messages", () => {
    const [event] = decoder.createEvents(
      {
        ...baseMessage,
        type: WhatsApp.WebhookMessageType.Location,
        location: {
          latitude: 36.8,
          longitude: 10.18,
        },
      },
      attrs,
    );
    const messageEvent = expectWhatsAppEvent(
      event,
      WhatsAppLocationMessageInboundEvent,
    );

    expect(messageEvent.getPayload()).toEqual({
      type: PayloadType.location,
      coordinates: {
        lat: 36.8,
        lon: 10.18,
      },
    });
  });

  it("decodes media messages as attachment messages", () => {
    const [event] = decoder.createEvents(
      {
        ...baseMessage,
        type: WhatsApp.WebhookMessageType.Image,
        image: {
          id: "media-1",
          mime_type: "image/jpeg",
          sha256: "checksum",
        },
      },
      attrs,
    );
    const messageEvent = expectWhatsAppEvent(
      event,
      WhatsAppAttachmentMessageInboundEvent,
    );

    expect(messageEvent.getRemoteAttachments()).toHaveLength(1);
  });

  it("decodes delivered, read, and failed statuses", () => {
    const [delivery] = decoder.createEvents(
      {
        id: "wamid.sent",
        recipient_id: "15551112222",
        status: "delivered",
        timestamp: "1710000001",
      },
      attrs,
    );
    const [read] = decoder.createEvents(
      {
        id: "wamid.sent",
        recipient_id: "15551112222",
        status: "read",
        timestamp: "1710000002",
      },
      attrs,
    );
    const [failed] = decoder.createEvents(
      {
        id: "wamid.sent",
        recipient_id: "15551112222",
        status: "failed",
        timestamp: "1710000003",
        errors: [{ code: 131000, message: "Failed" }],
      },
      attrs,
    );

    expect(
      expectWhatsAppEvent(
        delivery,
        WhatsAppDeliveryInboundEvent,
      ).getDeliveredMessages(),
    ).toEqual(["wamid.sent"]);
    expect(
      expectWhatsAppEvent(read, WhatsAppReadInboundEvent).getWatermark(),
    ).toBe(1710000002000);
    expect(
      expectWhatsAppEvent(
        failed,
        WhatsAppErrorInboundEvent,
      ).getFailedMessageId(),
    ).toBe("wamid.sent");
  });

  it("ignores unsupported messages and non-actionable statuses", () => {
    expect(
      decoder.createEvents(
        {
          ...baseMessage,
          type: WhatsApp.WebhookMessageType.Unknown,
        },
        attrs,
      ),
    ).toEqual([]);
    expect(
      decoder.createEvents(
        {
          id: "wamid.sent",
          recipient_id: "15551112222",
          status: "sent",
          timestamp: "1710000001",
        },
        attrs,
      ),
    ).toEqual([]);
  });
});
