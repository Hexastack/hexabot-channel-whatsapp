/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ButtonType, FileType, OutgoingMessageType } from "@hexabot-ai/types";

import { WhatsAppOutboundMessageEncoder } from "../outbound";

const channelAttachmentService = {
  getPublicUrl: jest.fn(
    async (_sourceId: string, attachment: { url?: string }) =>
      attachment.url ?? "https://cdn.example.com/file",
  ),
};
const i18n = {
  t: jest.fn((key: string) => key),
};

describe("WhatsAppOutboundMessageEncoder", () => {
  const encoder = new WhatsAppOutboundMessageEncoder(
    i18n as any,
    channelAttachmentService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("encodes text messages", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.text,
          data: {
            text: "Hello",
          },
        },
        { sourceId: "source-1" },
      ),
    ).resolves.toEqual({
      type: "text",
      text: {
        body: "Hello",
      },
    });
  });

  it("encodes quick replies as interactive reply buttons", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.quickReply,
          data: {
            text: "Pick one",
            quickReplies: [{ title: "A", payload: "A" }],
          },
        },
        { sourceId: "source-1" },
      ),
    ).resolves.toMatchObject({
      type: "interactive",
      interactive: {
        type: "button",
        action: {
          buttons: [
            {
              reply: {
                id: "A",
                title: "A",
              },
            },
          ],
        },
      },
    });
  });

  it("encodes postback buttons as interactive reply buttons", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.buttons,
          data: {
            text: "Choose",
            buttons: [
              {
                type: ButtonType.postback,
                title: "Select",
                payload: "SELECT",
              },
            ],
          },
        },
        { sourceId: "source-1" },
      ),
    ).resolves.toMatchObject({
      interactive: {
        type: "button",
        body: {
          text: "Choose",
        },
      },
    });
  });

  it("encodes a single URL button as a CTA URL message", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.buttons,
          data: {
            text: "Open link",
            buttons: [
              {
                type: ButtonType.web_url,
                title: "Open",
                url: "example.com",
              },
            ],
          },
        },
        { sourceId: "source-1" },
      ),
    ).resolves.toMatchObject({
      type: "interactive",
      interactive: {
        type: "cta_url",
        action: {
          name: "cta_url",
          parameters: {
            display_text: "Open",
            url: "https://example.com",
          },
        },
      },
    });
  });

  it("rejects mixed URL and postback buttons", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.buttons,
          data: {
            text: "Choose",
            buttons: [
              {
                type: ButtonType.web_url,
                title: "Open",
                url: "example.com",
              },
              {
                type: ButtonType.postback,
                title: "Select",
                payload: "SELECT",
              },
            ],
          },
        },
        { sourceId: "source-1" },
      ),
    ).rejects.toThrow("single URL button");
  });

  it("rejects too many reply buttons", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.quickReply,
          data: {
            text: "Pick one",
            quickReplies: [
              { title: "A", payload: "A" },
              { title: "B", payload: "B" },
              { title: "C", payload: "C" },
              { title: "D", payload: "D" },
            ],
          },
        },
        { sourceId: "source-1" },
      ),
    ).rejects.toThrow("up to 3");
  });

  it("encodes attachments with public URLs", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.attachment,
          data: {
            attachment: {
              type: FileType.image,
              payload: {
                id: "attachment-1",
                url: "https://files.example.com/image.png",
              },
            },
          },
        },
        { sourceId: "source-1" },
      ),
    ).resolves.toEqual({
      type: "image",
      image: {
        link: "https://files.example.com/image.png",
      },
    });
  });

  it("rejects attachment quick replies", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.attachment,
          data: {
            attachment: {
              type: FileType.file,
              payload: {
                id: "attachment-1",
              },
            },
            quickReplies: [{ title: "A", payload: "A" }],
          },
        },
        { sourceId: "source-1" },
      ),
    ).rejects.toThrow("attachment quick replies");
  });

  it("encodes overflowing lists with a reserved View More row", async () => {
    const elements = Array.from({ length: 10 }, (_, index) => ({
      id: `item-${index}`,
      title: `Item ${index}`,
      subtitle: `Description ${index}`,
    }));
    const message = await encoder.encode(
      {
        type: OutgoingMessageType.list,
        data: {
          elements,
          pagination: {
            total: 20,
            skip: 0,
            limit: 10,
          },
          options: {
            fields: {
              title: "title",
              subtitle: "subtitle",
            },
            buttons: [
              {
                type: ButtonType.postback,
                title: "Open",
                payload: "",
              },
            ],
          } as any,
        },
      },
      {
        sourceId: "source-1",
        content: {
          fields: {
            title: "title",
            subtitle: "subtitle",
          },
          buttons: [
            {
              type: ButtonType.postback,
              title: "Open",
              payload: "",
            },
          ],
          limit: 10,
        },
      } as any,
    );
    const rows = (message as any).interactive.action.sections[0].rows;

    expect(rows).toHaveLength(10);
    expect(rows.at(-1)).toMatchObject({
      id: "VIEW_MORE",
      title: "View More",
    });
  });

  it("requires source id in encode options", async () => {
    await expect(
      encoder.encode(
        {
          type: OutgoingMessageType.text,
          data: {
            text: "Hello",
          },
        },
        {} as any,
      ),
    ).rejects.toThrow("Missing sourceId");
  });
});
