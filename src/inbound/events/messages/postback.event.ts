/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ChannelInboundEventContext, ChannelName } from "@hexabot-ai/api";
import { IncomingMessageType, StdIncomingMessage } from "@hexabot-ai/types";

import { WhatsApp, type WhatsAppSubscriberChannelAttrs } from "../../../types";

import WhatsAppMessageInboundEvent from "./whatsapp-message.event";

export class WhatsAppPostbackInboundEvent<
  N extends ChannelName = ChannelName,
> extends WhatsAppMessageInboundEvent<N> {
  constructor(
    context: ChannelInboundEventContext<
      N,
      WhatsApp.WebhookMessage,
      WhatsAppSubscriberChannelAttrs<N>
    >,
    private readonly payload: string,
    private readonly text: string,
  ) {
    super(context);
  }

  override getMessageType(): IncomingMessageType {
    return IncomingMessageType.postback;
  }

  override getPayload(): string {
    return this.payload;
  }

  override toStdIncomingMessage(): StdIncomingMessage {
    return {
      type: IncomingMessageType.postback,
      data: {
        payload: this.payload,
        text: this.text,
      },
    };
  }
}

export default WhatsAppPostbackInboundEvent;
