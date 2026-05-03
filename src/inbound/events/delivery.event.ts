/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ChannelInboundEventContext, ChannelName } from "@hexabot-ai/api";
import { StdEventType } from "@hexabot-ai/types";

import { WhatsApp, type WhatsAppSubscriberChannelAttrs } from "../../types";

import BaseWhatsAppInboundEvent from "./base-whatsapp-inbound.event";

export class WhatsAppDeliveryInboundEvent<
  N extends ChannelName = ChannelName,
> extends BaseWhatsAppInboundEvent<N> {
  constructor(
    context: ChannelInboundEventContext<
      N,
      WhatsApp.Event,
      WhatsAppSubscriberChannelAttrs<N>
    >,
    private readonly deliveredMessageIds: string[],
  ) {
    super(context);
  }

  override getEventType(): StdEventType {
    return StdEventType.delivery;
  }

  getDeliveredMessages(): string[] {
    return this.deliveredMessageIds;
  }
}

export default WhatsAppDeliveryInboundEvent;
