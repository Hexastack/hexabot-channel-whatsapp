/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  ChannelInboundEvent,
  ChannelInboundEventContext,
  ChannelName,
} from "@hexabot-ai/api";

import { WhatsApp, type WhatsAppSubscriberChannelAttrs } from "../../types";

export abstract class BaseWhatsAppInboundEvent<
  N extends ChannelName = ChannelName,
> extends ChannelInboundEvent<
  N,
  WhatsApp.Event,
  WhatsAppSubscriberChannelAttrs<N>
> {
  protected constructor(
    context: ChannelInboundEventContext<
      N,
      WhatsApp.Event,
      WhatsAppSubscriberChannelAttrs<N>
    >,
  ) {
    super(context);
  }

  override getRaw<T = WhatsApp.Event>(): T {
    return super.getRaw<T>();
  }
}

export default BaseWhatsAppInboundEvent;
