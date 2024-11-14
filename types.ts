import { StdQuickReply } from '@/chat/schemas/types/quick-reply';

export namespace Whatsapp {
  export enum SettingLabel {
    app_secret = 'app_secret',
    access_token = 'access_token',
    verify_token = 'verify_token',
    get_started_button = 'get_started_button',
    composer_input_disabled = 'composer_input_disabled',
    greeting_text = 'greeting_text',
    page_id = 'page_id',
    app_id = 'app_id',
    user_fields = 'user_fields',
  }

  export type Settings = Record<SettingLabel, any>;

  // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
  // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#webhooks-notification-payload-reference

  // export interface MessagingEvent {
  //   object: string;
  //   entry: Entry[];
  // }

  export interface MessagingEvent {
    id: string; //The WhatsApp Bus. Acc ID for the bus. that is subscribed to the webhook
    changes: Change[];
  }

  export interface Change {
    value: IncomingMessage;
    field: string; //Notification type. Value will be messages.
  }

  export interface TextMessage {
    messaging_product: 'whatsapp';
    recipient_type: 'individual';
    to: string;
    type: 'text';
    text: {
      preview_url: boolean;
      body: string;
    };
  }

  export interface OutgoingMessage {
    messaging_product: 'whatsapp';
    to: string;
    type: string;
    text: {
      preview_url: boolean;
      body: string;
    };
  }

  export type IncomingMessage = {
    value: {
      messaging_product: string;
      metadata: Metadata;
      contacts: UserData[];
      messages: IncomingMessageBase[];
      statuses: Statuses[];
      errors: Error[];
    };
    field: string;
  };

  export type IncomingPostback = {
    value: {
      messaging_product: string;
      metadata: Metadata;
      contacts: UserData[];
      messages: IncomingMessageBase[];
    };
    field: string;
  };

  export interface Metadata {
    display_phone_number: string; //The phone number that is displayed for a business.
    phone_number_id: string; //ID for the phone number. A business can respond to a message using this ID.
  }

  export interface UserData {
    profile: {
      name: string; //The customer's name
    };
    wa_id: string; //The customer's WhatsApp ID (This ID may not match the customer's phone number, which is returned by the API as input when sending a message to the customer.)
    user_id?: string; //Additional unique, alphanumeric identifier for a WhatsApp user.
  }

  export interface IncomingMessageBase {
    from: string; //The customer's WhatsApp ID.
    id: string; //The ID for the message that was received by the business.
    // identity: {};
    timestamp: string;
    text: Text;
    type: messageType;
    audio?: Audio;
    button?: Button;
    context?: Context;
    document: Document;
    image: Image;
    video: Video;
    interactive: Interactive;
    errors: Error[];
  }

  export type Statuses = {
    biz_opaque_callback_data: string;
    conversation: conversation;
    errors: Error[];
    id: string;
    // pricing:
    recipient_id: string; //The customer's WhatsApp ID
    status: messageStatus;
    timestamp: string;
  };

  export type conversation = {
    id: string; //Represents the ID of the conversation the given status notification belongs to
    origin: {
      //todo: check if this is correct
      type: string;
    };
    expiration_timestamp?: string; //This field is only present for messages with a `status` set to `sent`.
  };

  export type Error = {
    code: number;
    title: string;
    message: string;
    error_data: {
      details: string; //Describes the error
    };
  };

  export type Text = {
    body: string;
  };

  export type Interactive = {
    type: string;
    button_reply: InteractiveButtonReply;
  };

  export type InteractiveButtonReply = {
    id: string;
    title: string;
  };

  export interface Image {
    caption: string;
    sha256: string;
    id: string; //ID for the image.
    mime_type: string;
  }

  export type Video = {
    caption: string;
    sha256: string; //The hash for the video.
    mime_type: string;
    id: string; //ID for the document.
  };

  export type Audio = {
    id: string;
    mime_type: string;
  };

  export type Button = {
    payload: string;
    text: string;
  };

  export interface Context {
    forwarded: boolean;
    frequently_forwarded: boolean;
    from: string; //The WhatsApp ID for the customer who replied to an inbound message.
    id: string; //The message ID for the sent message for an inbound reply.
    referred_product: {
      catalog_id: string;
      product_retailer_id: string;
    };
  }

  export interface Document {
    caption: string;
    filename: string;
    sha256: string;
    mime_type: string;
    id: string; //ID for the document.
  }

  export enum messageType {
    audio = 'audio',
    button = 'button',
    document = 'document',
    text = 'text',
    image = 'image',
    interactive = 'interactive',
    order = 'order',
    system = 'system',
    sticker = 'sticker',
    unknown = 'unknown',
    video = 'video',
  }

  export enum messageStatus {
    delivered = 'delivered',
    read = 'read',
    sent = 'sent',
  }

  export interface OutgoingMessageBase {
    text?: string;
    quick_replies?: StdQuickReply[];
  }

  export type Event = IncomingMessage;

  export interface OutgoingMessageBase {
    text?: string;
  }

  export type Recipient = {
    id: string; //whatsapp phone number
  };

  export type RequestBody =
    | OutgoingMessage
    | string
    | { messages: OutgoingMessageBase[] };
}
