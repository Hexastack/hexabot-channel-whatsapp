/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  ChannelInboundEventContext,
  ChannelName,
  MessageInboundEvent,
} from "@hexabot-ai/api";

import { WhatsApp, type WhatsAppSubscriberChannelAttrs } from "../../../types";

export abstract class WhatsAppMessageInboundEvent<
  N extends ChannelName = ChannelName,
> extends MessageInboundEvent<
  N,
  WhatsApp.WebhookMessage,
  WhatsAppSubscriberChannelAttrs<N>
> {
  protected constructor(
    context: ChannelInboundEventContext<
      N,
      WhatsApp.WebhookMessage,
      WhatsAppSubscriberChannelAttrs<N>
    >,
    handler?: Parameters<MessageInboundEvent<N>["setHandler"]>[0],
  ) {
    super(context, handler);
  }

  override getRaw<T = WhatsApp.WebhookMessage>(): T {
    return super.getRaw<T>();
  }
}

export default WhatsAppMessageInboundEvent;
