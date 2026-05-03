/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Readable } from "stream";

import { of } from "rxjs";

import { WhatsAppGraphApiService } from "../services";

const settings = {
  app_secret: "secret",
  access_token: "access-token",
  verify_token: "verify-token",
  business_account_id: "",
  phone_number_id: "",
  graph_api_version: "v25.0",
  thread_inactivity_hours: 24,
};

describe("WhatsAppGraphApiService", () => {
  let httpService: {
    request: jest.Mock;
    get: jest.Mock;
  };
  let service: WhatsAppGraphApiService;

  beforeEach(() => {
    httpService = {
      request: jest.fn(),
      get: jest.fn(),
    };
    service = new WhatsAppGraphApiService(httpService as any);
  });

  it("sends messages through the phone-number messages endpoint", async () => {
    httpService.request.mockReturnValue(
      of({
        data: {
          messages: [{ id: "wamid.out" }],
        },
      }),
    );

    await expect(
      service.sendMessage(settings, "phone-1", {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "15551112222",
        type: "text",
        text: {
          body: "hello",
        },
      }),
    ).resolves.toEqual({
      messages: [{ id: "wamid.out" }],
    });

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://graph.facebook.com/v25.0/phone-1/messages",
        headers: {
          Authorization: "Bearer access-token",
        },
      }),
    );
  });

  it("sends typing indicators as read receipts", async () => {
    httpService.request.mockReturnValue(
      of({
        data: {
          success: true,
        },
      }),
    );

    await service.sendTypingIndicator(settings, "phone-1", "wamid.in");

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          messaging_product: "whatsapp",
          status: "read",
          message_id: "wamid.in",
          typing_indicator: {
            type: "text",
          },
        },
      }),
    );
  });

  it("retrieves media metadata with phone-number ownership checks", async () => {
    httpService.request.mockReturnValue(
      of({
        data: {
          id: "media-1",
          url: "https://lookaside.example/media",
        },
      }),
    );

    await service.getMediaMetadata(settings, "media-1", "phone-1");

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "https://graph.facebook.com/v25.0/media-1",
        params: {
          phone_number_id: "phone-1",
        },
      }),
    );
  });

  it("downloads media URLs with Bearer auth and converts response headers", async () => {
    const stream = Readable.from(["file"]);
    httpService.get.mockReturnValue(
      of({
        data: stream,
        headers: {
          "content-type": "image/jpeg; charset=utf-8",
          "content-length": "123",
        },
      }),
    );

    await expect(
      service.downloadMediaUrl(
        settings,
        "https://lookaside.example/media",
        "image",
      ),
    ).resolves.toMatchObject({
      file: stream,
      name: "image",
      size: 123,
      type: "image/jpeg",
    });

    expect(httpService.get).toHaveBeenCalledWith(
      "https://lookaside.example/media",
      expect.objectContaining({
        responseType: "stream",
        headers: {
          Authorization: "Bearer access-token",
        },
      }),
    );
  });
});
