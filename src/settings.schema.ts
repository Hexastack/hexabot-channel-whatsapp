/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import z from "zod";

export const WHATSAPP_CHANNEL_NAME = "whatsapp" as const;

const credentialSetting = (title: string, description: string) =>
  z
    .string()
    .default("")
    .meta({
      title,
      description,
      "ui:widget": "AutoCompleteWidget",
      "ui:options": {
        entity: "Credential",
        valueKey: "id",
        labelKey: "name",
        enableEntityAddButton: true,
      },
    });

export const WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA = z
  .strictObject({
    app_secret: credentialSetting(
      "App secret credential",
      "Credential containing the Meta app secret used to verify webhook signatures.",
    ),
    access_token: credentialSetting(
      "Access token credential",
      "Credential containing the WhatsApp Cloud API access token.",
    ),
    verify_token: credentialSetting(
      "Verify token credential",
      "Credential containing the token Meta sends during webhook verification.",
    ),
    business_account_id: z.string().default("").meta({
      title: "WhatsApp Business Account ID",
      description:
        "Optional WABA ID. When set, webhook entries for other business accounts are ignored.",
    }),
    phone_number_id: z.string().default("").meta({
      title: "Phone number ID",
      description:
        "Optional WhatsApp Business phone number ID. When set, webhook changes for other phone numbers are ignored.",
    }),
    graph_api_version: z.string().default("v25.0").meta({
      title: "Graph API version",
      description: "Graph API version used for WhatsApp Cloud API requests.",
    }),
    thread_inactivity_hours: z.int().nonnegative().default(24).meta({
      title: "Thread inactivity (hours)",
      description:
        "Automatically start a new thread when the last message is older than this threshold.",
    }),
  })
  .meta({
    title: "WhatsApp Channel",
  });

export type WhatsAppChannelSettings = z.infer<
  typeof WHATSAPP_CHANNEL_SOURCE_SETTINGS_SCHEMA
>;

export const WHATSAPP_CREDENTIAL_SETTING_KEYS = [
  "app_secret",
  "access_token",
  "verify_token",
] as const;

export type WhatsAppCredentialSettingKey =
  (typeof WHATSAPP_CREDENTIAL_SETTING_KEYS)[number];

export type WhatsAppResolvedChannelSettings = WhatsAppChannelSettings;
