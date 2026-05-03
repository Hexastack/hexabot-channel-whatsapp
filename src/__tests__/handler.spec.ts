/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createHmac } from "crypto";

import type { Source } from "@hexabot-ai/types";
import { Request, Response } from "express";

import { WhatsAppInboundEventDecoder } from "../inbound";
import WhatsAppChannelHandler from "../index.channel";
import { WHATSAPP_CHANNEL_NAME } from "../settings.schema";

class TestWhatsAppChannelHandler extends WhatsAppChannelHandler {
  callVerifySignature(req: Request, source: Source) {
    return this.verifySignature(req, {} as Response, source);
  }

  callVerifyWebhook(req: Request, res: Response, source: Source) {
    return this.verifyWebhook(req, res, source);
  }

  callDecode(req: Request, source: Source) {
    return this.decode(req, source);
  }
}

const source = {
  id: "source-1",
  channel: WHATSAPP_CHANNEL_NAME,
  state: true,
  settings: {
    app_secret: "credential-app-secret",
    access_token: "credential-access-token",
    verify_token: "credential-verify-token",
    business_account_id: "waba-1",
    phone_number_id: "phone-1",
  },
} as unknown as Source;
const credentialValues: Record<string, string> = {
  "credential-app-secret": "secret",
  "credential-access-token": "access-token",
  "credential-verify-token": "verify-token",
};
const buildRequest = (body: unknown, headers: Record<string, string> = {}) =>
  ({
    body,
    headers,
    rawBody: JSON.stringify(body),
    query: {},
  }) as Request & { rawBody: string };

describe("WhatsAppChannelHandler webhook security", () => {
  let handler: TestWhatsAppChannelHandler;

  beforeEach(() => {
    handler = new TestWhatsAppChannelHandler();
    (handler as any).logger = {
      warn: jest.fn(),
      error: jest.fn(),
    };
    (handler as any).credentialService = {
      findOneValue: jest.fn(
        async (credentialId: string) => credentialValues[credentialId] ?? "",
      ),
    };
    (handler as any).inboundEventDecoder = new WhatsAppInboundEventDecoder(
      WHATSAPP_CHANNEL_NAME,
    );
  });

  it("accepts a valid SHA-256 webhook signature", async () => {
    const req = buildRequest({
      object: "whatsapp_business_account",
      entry: [],
    });
    const digest = createHmac("sha256", "secret")
      .update(req.rawBody)
      .digest("hex");
    req.headers["x-hub-signature-256"] = `sha256=${digest}`;

    await expect(
      handler.callVerifySignature(req, source),
    ).resolves.toBeUndefined();
  });

  it("rejects an invalid webhook signature", async () => {
    const req = buildRequest(
      {
        object: "whatsapp_business_account",
        entry: [],
      },
      { "x-hub-signature-256": "sha256=bad" },
    );

    await expect(handler.callVerifySignature(req, source)).rejects.toThrow(
      "Invalid WhatsApp webhook signature",
    );
  });

  it("supports legacy SHA-1 signatures when SHA-256 is absent", async () => {
    const req = buildRequest({
      object: "whatsapp_business_account",
      entry: [],
    });
    const digest = createHmac("sha1", "secret")
      .update(req.rawBody)
      .digest("hex");
    req.headers["x-hub-signature"] = `sha1=${digest}`;

    await expect(
      handler.callVerifySignature(req, source),
    ).resolves.toBeUndefined();
  });

  it("rejects missing raw request bodies", async () => {
    const req = buildRequest({
      object: "whatsapp_business_account",
      entry: [],
    });
    const digest = createHmac("sha256", "secret")
      .update(req.rawBody)
      .digest("hex");
    req.headers["x-hub-signature-256"] = `sha256=${digest}`;
    delete (req as Request & { rawBody?: string }).rawBody;

    await expect(handler.callVerifySignature(req, source)).rejects.toThrow(
      "Missing raw request body",
    );
  });

  it("rejects missing resolved app secret values", async () => {
    const req = buildRequest(
      {
        object: "whatsapp_business_account",
        entry: [],
      },
      { "x-hub-signature-256": "sha256=bad" },
    );
    const missingSecretSource = {
      ...source,
      settings: {
        ...(source.settings as Record<string, unknown>),
        app_secret: "",
      },
    } as Source;

    await expect(
      handler.callVerifySignature(req, missingSecretSource),
    ).rejects.toThrow("WhatsApp app secret is required");
  });

  it("responds to valid webhook verification challenges", async () => {
    const req = {
      query: {
        "hub.mode": "subscribe",
        "hub.verify_token": "verify-token",
        "hub.challenge": "challenge-code",
      },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await handler.callVerifyWebhook(req, res, source);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("challenge-code");
  });

  it("rejects invalid webhook verification challenges", async () => {
    const req = {
      query: {
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong",
        "hub.challenge": "challenge-code",
      },
    } as unknown as Request;
    const res = {
      sendStatus: jest.fn(),
    } as unknown as Response;

    await handler.callVerifyWebhook(req, res, source);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });

  it("decodes matching source webhook events", async () => {
    const req = buildRequest({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: "phone-1",
                  display_phone_number: "+15550000000",
                },
                contacts: [
                  {
                    wa_id: "15551112222",
                    profile: {
                      name: "Jane Subscriber",
                    },
                  },
                ],
                messages: [
                  {
                    from: "15551112222",
                    id: "wamid.message",
                    timestamp: "1710000000",
                    type: "text",
                    text: {
                      body: "hello",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await expect(handler.callDecode(req, source)).resolves.toHaveLength(1);
  });

  it("drops webhook events for another configured business account", async () => {
    const req = buildRequest({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "other-waba",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: "phone-1",
                },
                messages: [
                  {
                    from: "15551112222",
                    id: "wamid.message",
                    timestamp: "1710000000",
                    type: "text",
                    text: {
                      body: "hello",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await expect(handler.callDecode(req, source)).resolves.toEqual([]);
  });

  it("drops webhook events for another configured phone number", async () => {
    const req = buildRequest({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: "other-phone",
                },
                messages: [
                  {
                    from: "15551112222",
                    id: "wamid.message",
                    timestamp: "1710000000",
                    type: "text",
                    text: {
                      body: "hello",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await expect(handler.callDecode(req, source)).resolves.toEqual([]);
  });
});
