import { ChannelSetting } from '@/channel/types';
import { SettingType } from '@/setting/schemas/types';

import { Whatsapp } from './types';

export const WHATSAPP_CHANNEL_NAME = 'whatsapp-channel' as const;

export const WHATSAPP_GROUP_NAME = 'whatsapp_channel';

export default [
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.app_secret,
    value: '',
    type: SettingType.secret,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.access_token,
    value:
      '',
    type: SettingType.secret,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.verify_token,
    value: '',
    type: SettingType.secret,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.get_started_button,
    value: false,
    type: SettingType.checkbox,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.composer_input_disabled,
    value: false,
    type: SettingType.checkbox,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.greeting_text,
    value: 'Welcome! Ready to start a conversation with our chatbot?',
    type: SettingType.textarea,
  },
  {
    group: WHATSAPP_GROUP_NAME,
    label: Whatsapp.SettingLabel.user_fields,
    value: 'first_name,last_name,profile_pic,locale,timezone,gender',
    type: SettingType.text,
  },
] as const satisfies ChannelSetting<typeof WHATSAPP_CHANNEL_NAME>[];
