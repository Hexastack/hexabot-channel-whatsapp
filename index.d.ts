/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import {
  DEFAULT_WHATSAPP_SETTINGS,
  WHATSAPP_GROUP_NAME,
  WHATSAPP_CHANNEL_NAME,
} from './settings';

declare global {
  interface Settings extends SettingTree<typeof DEFAULT_WHATSAPP_SETTINGS> {}
  interface SubscriberChannelDict {
    [WHATSAPP_CHANNEL_NAME]: Record<string, never>;
  }
}

declare module '@nestjs/event-emitter' {
  interface IHookExtensionsOperationMap {
    [WHATSAPP_GROUP_NAME]: TDefinition<
      object,
      SettingMapByType<typeof DEFAULT_WHATSAPP_SETTINGS>
    >;
  }
}
