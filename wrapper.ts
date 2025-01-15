/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { Attachment } from '@/attachment/schemas/attachment.schema';
import EventWrapper from '@/channel/lib/EventWrapper';
import { AttachmentPayload } from '@/chat/schemas/types/attachment';
import {
  IncomingMessageType,
  PayloadType,
  StdEventType,
  StdIncomingMessage,
} from '@/chat/schemas/types/message';
import { Payload } from '@/chat/schemas/types/quick-reply';

import WhatsAppHandler from './index.channel';
import { WHATSAPP_CHANNEL_NAME } from './settings';
import { WhatsApp } from './types';

type WhatsAppEventAdapter =
  | {
      eventType: StdEventType.unknown;
      messageType: never;
      raw: WhatsApp.Event;
      attachment: never;
    }
  | {
      eventType: StdEventType.delivery;
      messageType: never;
      raw: WhatsApp.Webhook.Status;
      attachment: never;
    }
  | {
      eventType: StdEventType.read;
      messageType: never;
      raw: WhatsApp.Webhook.Status;
      attachment: never;
    }
  | {
      eventType: StdEventType.message;
      messageType: IncomingMessageType.message;
      raw: WhatsApp.Webhook.TextMessage;
      attachment: never;
    }
  | {
      eventType: StdEventType.message;
      messageType: IncomingMessageType.attachments;
      raw: WhatsApp.Webhook.MediaMessage;
      attachment: Attachment;
    }
  | {
      eventType: StdEventType.message;
      messageType: IncomingMessageType.location;
      raw: WhatsApp.Webhook.LocationMessage;
      attachment: never;
    }
  | {
      eventType: StdEventType.message;
      messageType: IncomingMessageType.postback;
      raw: WhatsApp.Webhook.InteractiveMessage | WhatsApp.Webhook.ButtonMessage;
      attachment: never;
    };

export default class WhatsAppEventWrapper extends EventWrapper<
  WhatsAppEventAdapter,
  WhatsApp.Event,
  typeof WHATSAPP_CHANNEL_NAME,
  WhatsAppHandler
> {
  /**
   * Constructor : channel's event wrapper
   *
   * @param handler - The channel's handler
   * @param event - The message event received
   */
  constructor(
    handler: WhatsAppHandler,
    event: WhatsApp.Event,
    channelData: SubscriberChannelDict[typeof WHATSAPP_CHANNEL_NAME],
  ) {
    super(handler, event, channelData);
  }

  /**
   * Called by the parent constructor, it defines :
   *     - The type of event received
   *     - The type of message when the event is a message.
   *     - Sets a typed raw object of the event data
   *
   * @param event - The message event received
   */
  _init(event: WhatsApp.Event) {
    if ('status' in event) {
      switch (event.status) {
        case 'delivered':
          this._adapter.eventType = StdEventType.delivery;
          break;
        case 'read':
          this._adapter.eventType = StdEventType.read;
          break;
        default:
          this._adapter.eventType = StdEventType.unknown;
          break;
      }
    } else {
      this._adapter.eventType = StdEventType.message;
      switch (event.type) {
        case WhatsApp.Webhook.MessageType.Contacts:
          // @ts-expect-error We will consider contacts messages as text
          event.text = this.serializeContactsToText(event.contacts);
        case WhatsApp.Webhook.MessageType.Text:
          this._adapter.messageType = IncomingMessageType.message;
          break;

        case WhatsApp.Webhook.MessageType.Image:
        case WhatsApp.Webhook.MessageType.Audio:
        case WhatsApp.Webhook.MessageType.Video:
        case WhatsApp.Webhook.MessageType.Document:
        case WhatsApp.Webhook.MessageType.Sticker:
          this._adapter.messageType = IncomingMessageType.attachments;
          break;
        case WhatsApp.Webhook.MessageType.Button:
        case WhatsApp.Webhook.MessageType.Interactive:
          this._adapter.messageType = IncomingMessageType.postback;
          break;
        case WhatsApp.Webhook.MessageType.Location:
          this._adapter.messageType = IncomingMessageType.location;
          break;
        default:
          this._adapter.eventType = StdEventType.unknown;
          break;
      }
    }
    this._adapter.raw = event;
  }

  /**
   * Returns the message id
   *
   * @returns Message ID
   */
  getId(): string {
    return this._adapter.raw.id;
  }

  /**
   * Return payload whenever user clicks on a button/quick reply or sends an attachment
   *
   * @returns The payload content
   */
  getPayload(): Payload | string | undefined {
    if (this._adapter.eventType === StdEventType.message) {
      switch (this._adapter.messageType) {
        case IncomingMessageType.postback: {
          const event = this._adapter.raw;
          if ('interactive' in event) {
            return (
              event.interactive.button_reply?.id ||
              event.interactive.list_reply.id
            );
          } else {
            return event.button.payload;
          }
        }
        case IncomingMessageType.location: {
          const event = this._adapter.raw as WhatsApp.Webhook.LocationMessage;
          const coordinates = event.location;
          return {
            type: PayloadType.location,
            coordinates: {
              lat: coordinates?.latitude || 0,
              lon: coordinates?.longitude || 0,
            },
          };
        }
        case IncomingMessageType.attachments: {
          if (!this._adapter.attachment) {
            throw new Error('Unable to find attachment');
          }

          const attachment = this._adapter.attachment;

          return {
            type: PayloadType.attachments,
            attachments: {
              type: Attachment.getTypeByMime(attachment.type),
              payload: {
                id: attachment.id,
              },
            },
          };
        }
      }
    }
    return undefined;
  }

  /**
   * Return a standard message format that can be stored in DB
   *
   * @returns  Received message in standard format
   */
  getMessage(): StdIncomingMessage {
    switch (this._adapter.messageType) {
      case IncomingMessageType.message:
        return {
          text: this._adapter.raw.text.body,
        };
      case IncomingMessageType.postback: {
        if ('interactive' in this._adapter.raw) {
          const interactive = this._adapter.raw.interactive;
          return {
            postback:
              interactive.button_reply?.id || interactive.list_reply?.id,
            text:
              interactive.button_reply?.title || interactive.list_reply?.title,
          };
        } else {
          return {
            postback: this._adapter.raw.button.payload,
            text: this._adapter.raw.button.text,
          };
        }
      }
      case IncomingMessageType.location: {
        const coordinates = this._adapter.raw.location;
        return {
          type: PayloadType.location,
          coordinates: {
            lat: coordinates?.latitude || 0,
            lon: coordinates?.longitude || 0,
          },
        };
      }
      case IncomingMessageType.attachments: {
        if (!this._adapter.attachment) {
          throw new Error('Unable to find attachment');
        }

        const attachment = this._adapter.attachment;

        const serialized = ['attachment'];
        const type = Attachment.getTypeByMime(attachment.type);

        serialized.concat([type, attachment.name]);

        return {
          type: PayloadType.attachments,
          serialized_text: serialized.join(':'),
          attachment: {
            type,
            payload: { id: attachment.id },
          },
        };
      }
      default:
        return undefined;
    }
  }

  /**
   * @deprecated
   */
  getAttachments(): AttachmentPayload[] {
    return [];
  }

  /**
   * Returns event sender (subscriber) phone number
   *
   * @returns Subscriber phone number
   */
  getSenderForeignId(): string {
    if (this._adapter.eventType === StdEventType.message) {
      return this._adapter.raw.from;
    }
    return undefined;
  }

  /**
   * Returns event recipient phone number
   *
   * @returns Subscriber phone number
   */
  getRecipientForeignId(): string {
    if ('recipient_id' in this._adapter.raw) {
      return this._adapter.raw.recipient_id;
    }
    return undefined;
  }

  /**
   * Return the delivered messages ids
   *
   * @returns return delivered messages ids
   */
  getDeliveredMessages(): string[] {
    if (
      this._adapter.eventType === StdEventType.delivery &&
      this._adapter.raw.status === 'delivered'
    ) {
      return [this._adapter.raw.id];
    }
    return [];
  }

  /**
   * Return the event's timestamp
   *
   * @returns The timestamp
   */
  getWatermark() {
    return parseInt(this._adapter.raw.timestamp);
  }

  /**
   * Serialize contacts to a string
   *
   * @param contacts Array of message contacts
   * @returns A text containing the contacts
   */
  private serializeContactsToText(
    contacts: WhatsApp.Messages.Contact[],
  ): string {
    return contacts
      .reduce((result, contact) => {
        const lines: string[] = [];

        // Name
        lines.push(`Name: ${contact.name.formatted_name}`);
        if (contact.name.first_name)
          lines.push(`  First Name: ${contact.name.first_name}`);
        if (contact.name.last_name)
          lines.push(`  Last Name: ${contact.name.last_name}`);
        if (contact.name.middle_name)
          lines.push(`  Middle Name: ${contact.name.middle_name}`);
        if (contact.name.prefix) lines.push(`  Prefix: ${contact.name.prefix}`);
        if (contact.name.suffix) lines.push(`  Suffix: ${contact.name.suffix}`);

        // Birthday
        if (contact.birthday) {
          lines.push(`Birthday: ${contact.birthday}`);
        }

        // Organization
        if (contact.org) {
          lines.push(`Organization:`);
          if (contact.org.company)
            lines.push(`  Company: ${contact.org.company}`);
          if (contact.org.department)
            lines.push(`  Department: ${contact.org.department}`);
          if (contact.org.title) lines.push(`  Title: ${contact.org.title}`);
        }

        // Emails
        if (contact.emails?.length) {
          lines.push(`Emails:`);
          contact.emails.forEach((email) => {
            lines.push(
              `  - Email: ${email.email || 'N/A'}, Type: ${email.type || 'N/A'}`,
            );
          });
        }

        // Phones
        if (contact.phones?.length) {
          lines.push(`Phones:`);
          contact.phones.forEach((phone) => {
            lines.push(
              `  - Phone: ${phone.phone || 'N/A'}, Type: ${phone.type || 'N/A'}, WhatsApp ID: ${phone.wa_id || 'N/A'}`,
            );
          });
        }

        // Addresses
        if (contact.addresses?.length) {
          lines.push(`Addresses:`);
          contact.addresses.forEach((address) => {
            lines.push(
              `  - Street: ${address.street || 'N/A'}, City: ${address.city || 'N/A'}, State: ${
                address.state || 'N/A'
              }, ZIP: ${address.zip || 'N/A'}, Country: ${address.country || 'N/A'}, Country Code: ${
                address.country_code || 'N/A'
              }, Type: ${address.type || 'N/A'}`,
            );
          });
        }

        // URLs
        if (contact.urls?.length) {
          lines.push(`URLs:`);
          contact.urls.forEach((url) => {
            lines.push(`  - ${url}`);
          });
        }

        // Add a blank line between contacts
        return result + lines.join('\n') + '\n\n';
      }, '')
      .trim(); // Remove trailing newline
  }
}
