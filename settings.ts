/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { ChannelSetting } from '@/channel/types';
import { SettingType } from '@/setting/schemas/types';

export const WHATSAPP_CHANNEL_NAME = 'whatsapp-channel';

export const WHATSAPP_GROUP_NAME = 'whatsapp_channel';

export default [
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'app_secret',
    value: '',
    type: SettingType.secret,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'access_token',
    value: '',
    type: SettingType.secret,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'verify_token',
    value: '',
    type: SettingType.secret,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'get_started_button',
    value: false,
    type: SettingType.checkbox,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'composer_input_disabled',
    value: false,
    type: SettingType.checkbox,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'greeting_text',
    value: 'Welcome! Ready to start a conversation with our chatbot?',
    type: SettingType.textarea,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: 'user_fields',
    value: 'first_name,last_name,profile_pic,locale,timezone,gender',
    type: SettingType.text,
  },
] as const satisfies ChannelSetting<typeof WHATSAPP_CHANNEL_NAME>[];
