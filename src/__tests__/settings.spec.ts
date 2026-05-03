/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA,
  WHATSAPP_CREDENTIAL_SETTING_KEYS,
} from "../settings.schema";

describe("WhatsApp channel settings", () => {
  it("applies secure defaults", () => {
    const settings = WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA.parse({});

    expect(settings).toMatchObject({
      app_secret: "",
      access_token: "",
      verify_token: "",
      business_account_id: "",
      phone_number_id: "",
      graph_api_version: "v25.0",
      thread_inactivity_hours: 24,
    });
  });

  it("exposes required credential settings", () => {
    expect(WHATSAPP_CREDENTIAL_SETTING_KEYS).toEqual([
      "app_secret",
      "access_token",
      "verify_token",
    ]);
  });

  it("rejects unknown source settings", () => {
    expect(() =>
      WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA.parse({
        unknown: true,
      }),
    ).toThrow();
  });
});
