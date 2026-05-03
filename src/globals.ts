/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { WHATSAPP_CHANNEL_NAME } from "./settings.schema";

declare global {
  interface SubscriberChannelDict {
    [WHATSAPP_CHANNEL_NAME]: {
      businessAccountId: string;
      phoneNumberId: string;
      displayPhoneNumber: string;
      contact?: {
        waId: string;
        profileName?: string;
      };
    };
  }
}

export {};
