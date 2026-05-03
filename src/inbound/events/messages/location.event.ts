/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ChannelInboundEventContext, ChannelName } from "@hexabot-ai/api";
import {
  IncomingMessageType,
  Payload,
  PayloadType,
  StdIncomingMessage,
} from "@hexabot-ai/types";

import { WhatsApp, type WhatsAppSubscriberChannelAttrs } from "../../../types";

import WhatsAppMessageInboundEvent from "./whatsapp-message.event";

export class WhatsAppLocationMessageInboundEvent<
  N extends ChannelName = ChannelName,
> extends WhatsAppMessageInboundEvent<N> {
  constructor(
    context: ChannelInboundEventContext<
      N,
      WhatsApp.WebhookMessage,
      WhatsAppSubscriberChannelAttrs<N>
    >,
    private readonly lat: number,
    private readonly lon: number,
  ) {
    super(context);
  }

  override getMessageType(): IncomingMessageType {
    return IncomingMessageType.location;
  }

  override getPayload(): Payload {
    return {
      type: PayloadType.location,
      coordinates: {
        lat: this.lat,
        lon: this.lon,
      },
    };
  }

  override toStdIncomingMessage(): StdIncomingMessage {
    return {
      type: IncomingMessageType.location,
      data: {
        coordinates: {
          lat: this.lat,
          lon: this.lon,
        },
      },
    };
  }
}

export default WhatsAppLocationMessageInboundEvent;
