import { DEFAULT_WHATSAPP_SETTINGS, WHATSAPP_GROUP_NAME } from './settings';

declare global {
  interface Settings extends SettingTree<typeof DEFAULT_WHATSAPP_SETTINGS> {}
}

declare module '@nestjs/event-emitter' {
  interface IHookExtensionsOperationMap {
    [WHATSAPP_GROUP_NAME]: TDefinition<
      object,
      SettingMapByType<typeof DEFAULT_WHATSAPP_SETTINGS>
    >;
  }
}
