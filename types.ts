/*
 * Copyright © 2025 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

export namespace WhatsApp {
  export type Event = Webhook.Message | Webhook.Status;

  export type BusinessAccountData = {
    id: string;
    verified_name: string;
    timezone_id: number;
  };

  export type MessageApiResponse = {
    messaging_product: 'whatsapp';
    contacts: Messages.Contact[];
    messages: { id: string }[];
  };

  export type MediaMetadata = {
    messaging_product: string;
    url: string;
    mime_type: string;
    sha256: string;
    file_size: string;
    id: string;
  };

  export namespace Messages {
    // Enums
    export enum ParameterType {
      Text = 'text',
      Currency = 'currency',
      DateTime = 'date_time',
      Image = 'image',
      Document = 'document',
    }

    export enum ComponentType {
      Header = 'header',
      Body = 'body',
      Footer = 'footer',
      Button = 'button',
    }

    export enum ButtonType {
      QuickReply = 'quick_reply',
      URL = 'url',
    }

    export enum DayOfWeek {
      Monday = 'MONDAY',
      Tuesday = 'TUESDAY',
      Wednesday = 'WEDNESDAY',
      Thursday = 'THURSDAY',
      Friday = 'FRIDAY',
      Saturday = 'SATURDAY',
      Sunday = 'SUNDAY',
    }

    export enum CalendarType {
      Gregorian = 'GREGORIAN',
      SolarHijri = 'SOLAR_HIJRI',
    }

    export enum PhoneType {
      Cell = 'CELL',
      Main = 'MAIN',
      IPhone = 'IPHONE',
      Home = 'HOME',
      Work = 'WORK',
    }

    export enum AddressType {
      Home = 'HOME',
      Work = 'WORK',
    }

    export enum InteractiveType {
      List = 'list',
      Button = 'button',
      Product = 'product',
      ProductList = 'product_list',
    }

    //objects
    export interface Text {
      body: string; // Required. The text of the message, supports URLs and formatting. Maximum length: 4096 characters.
      preview_url?: boolean; // Optional. Indicates whether to include a URL preview in the message.
    }

    export interface Reaction {
      message_id: string; // Required. Specifies the WhatsApp message ID (WAMID) that this reaction is being sent to.
      emoji: string; // Required. The emoji used for the reaction. Set to "" (empty string) to remove the reaction.
    }

    export interface Media {
      id?: string; // Required when type is an image, audio, document, sticker, or video and not using a link.
      link?: string; // Required when type is audio, document, image, sticker, or video and not using an uploaded media ID.
      caption?: string; // Optional. Describes the specified image, document, or video. Not applicable to audio or sticker media.
      filename?: string; // Optional. Describes the filename for the specific media.
    }

    export interface Template {
      name: string; // Required. The name of the template.
      language: Language; // Required. Specifies the language the template may be rendered in.
      components?: Component[]; // Optional. An array of components containing the parameters of the message.
    }

    export interface Component {
      type: string; // E.g., "header", "body", "footer", or "button".
      parameters?: Parameter[]; // Optional. Parameters for the component.
    }

    export interface Parameter {
      type: ParameterType; // E.g., "text", "currency", or "date_time".
      text?: string; // Used when the parameter type is "text".
      currency?: Currency; // Used when the parameter type is "currency".
      date_time?: DateTime; // Used when the parameter type is "date_time".
    }

    export interface Language {
      policy?: 'deterministic'; // Optional. Default and only supported value is "deterministic".
      code: string; // Required. The language or locale code (e.g., "en", "en_US").
    }

    export interface Components {
      type: ComponentType; // Required. Describes the component type.
      parameters?: Parameter[]; // Required when type is "button". The namespace of the template.
      sub_type?: ButtonType; // Required when type is "button". Specifies the type of button.
      index?: 0 | 1 | 2; // Required when type is "button". Position index of the button (up to 3 buttons: 0 to 2).
    }

    export interface Parameter {
      type: ParameterType; // Required. Describes the parameter type.
      text?: string; // Required when type is "text". Message text with specific character limits based on the component.
      currency?: Currency; // Required when type is "currency". Defines the currency details.
      date_time?: DateTime; // Required when type is "date_time". Defines the date and time details.
      image?: Media; // Required when type is "image". A media object of type image.
      document?: Media; // Required when type is "document". A media object of type document (PDF only).
    }

    export interface DateTime {
      fallbackValue: string; // A fallback text value for the date/time.
    }

    export interface Media {
      id?: string; // Required when not using a link. Media object ID.
      link?: string; // Required when using a link. HTTP/HTTPS URL to the media.
      caption?: string; // Optional. Describes the image or document.
      filename?: string; // Optional. Describes the filename of the media.
    }

    export interface Currency {
      fallback_value: string; // Required. The default text if localization fails.
      code: string; // Required. The currency code as defined in ISO 4217.
      amount_1000: number; // Required. The amount multiplied by 1000.
      currencyCode: string; // The currency code (e.g., "USD").
      amount: number; // The amount in the specified currency.
    }

    export interface DateTime {
      fallback_value: string; // Required. The default text if localization fails.
      day_of_week?: DayOfWeek | 1 | 2 | 3 | 4 | 5 | 6 | 7; // Optional. The day of the week, either as a string or number.
      year?: number; // Optional. Specifies the year.
      month?: number; // Optional. Specifies the month.
      day_of_month?: number; // Optional. Specifies the day of the month.
      hour?: number; // Optional. Specifies the hour.
      minute?: number; // Optional. Specifies the minute.
      calendar?: CalendarType; // Optional. The type of calendar.
    }

    export interface ButtonParameter {
      type: 'payload' | 'text'; // Required. Specifies the type of parameter for the button.
      payload?: string; // Required for quick_reply buttons. Developer-defined payload returned when the button is clicked.
      text?: string; // Required for URL buttons. Developer-provided suffix appended to the predefined prefix URL in the template.
    }

    export interface Url {
      url?: string; // Optional. The URL.
      type?: AddressType; // Optional. Standard values: HOME or WORK.
    }

    export interface Context {
      message_id: string;
    }

    export interface Phone {
      phone?: string; // Optional. Automatically populated with the wa_id value as a formatted phone number.
      type?: PhoneType; // Optional. Standard values for phone types.
      wa_id?: string; // Optional. WhatsApp ID.
    }

    export interface Organization {
      company?: string; // Optional. Name of the contact's company.
      department?: string; // Optional. Name of the contact's department.
      title?: string; // Optional. The contact's business title.
    }

    export interface Name {
      formatted_name: string; // Required. Full name, as it normally appears.
      first_name?: string; // Optional. First name.
      last_name?: string; // Optional. Last name.
      middle_name?: string; // Optional. Middle name.
      suffix?: string; // Optional. Name suffix.
      prefix?: string; // Optional. Name prefix.
    }

    export interface Email {
      email?: string; // Optional. The email address.
      type?: AddressType; // Optional. Standard values for email type.
    }

    export interface Address {
      street?: string; // Optional. Street number and name.
      city?: string; // Optional. The name of the city.
      state?: string; // Optional. The abbreviation name of the state.
      zip?: string; // Optional. The ZIP code.
      country?: string; // Optional. The full name of the country.
      country_code?: string; // Optional. The two-letter country abbreviation.
      type?: AddressType; // Optional. Standard values: HOME or WORK.
    }

    export interface Contact {
      addresses?: Address[]; // Optional. An array of address objects.
      birthday?: string; // Optional. A YYYY-MM-DD formatted string.
      emails?: Email[]; // Optional. An array of email objects.
      name: Name; // Required. Specifies the name object.
      org?: Organization; // Optional. Specifies the org object.
      phones?: Phone[]; // Optional. An array of phone objects.
      urls?: Url[]; // Optional. An array of URL objects.
    }

    export interface Location {
      longitude: number; // Required. The longitude of the location.
      latitude: number; // Required. The latitude of the location.
      name?: string; // Optional. The name of the location.
      address?: string; // Optional. The address of the location. Displayed only if name is present.
    }

    export interface Section {
      title?: string; // Optional. Required if the message has more than one section. Max length: 24 characters.
      rows?: Row[]; // Required for List Messages. A list of rows (max 10 rows across all sections).
      product_items?: ProductItem[]; // Required for Multi-Product Messages. A list of product objects.
    }

    export interface Row {
      title: string; // Required. The title of the row. Max length: 24 characters.
      id: string; // Required. Unique identifier for the row. Max length: 200 characters.
      description?: string; // Optional. Description of the row. Max length: 72 characters.
    }

    export interface ProductItem {
      product_retailer_id: string; // Required. Unique identifier for the product in the catalog.
    }

    export interface Action {
      button?: string; // Required for all List Messages. Button content. Max length: 20 characters.
      buttons?: ReplyButton[]; // Required for Reply Button. Array of button objects (max 3).
      sections?: Section[]; // Required for List Messages and Multi-Product Messages. Min 1 and max 10 sections.
      catalog_id?: string; // Required for Single Product and Multi-Product Messages. Unique identifier of the Facebook catalog.
      product_retailer_id?: string; // Required for Single Product and Multi-Product Messages. Unique identifier for the product in the catalog.
    }

    export interface ReplyButton {
      type: 'reply'; // Only supported value for Reply Button.
      reply: {
        title: string; // Required. Button title. Max length: 20 characters.
        id: string; // Required. Unique identifier for the button. Max length: 256 characters.
      };
    }

    export interface Footer {
      text: string; // Required if the footer object is present. The footer content of the message. Max length: 60 characters.
    }

    export interface Body {
      text: string; // Required. The body content of the message. Supports emojis, markdown, and links. Max length: 1024 characters.
    }

    export interface Header {
      type: ParameterType; // Required. The header type to use.
      text?: string; // Required if type is "text". Max length: 60 characters.
      video?: Media; // Required if type is "video". Contains the media object for the video.
      image?: Media; // Required if type is "image". Contains the media object for the image.
      document?: Media; // Required if type is "document". Contains the media object for the document.
    }

    export interface Interactive {
      type: InteractiveType; // Required
      header?: Header; // Optional, required for `product_list` type
      body?: Body; // Optional for `product` type, required for other types
      footer?: Footer; // Optional
      action: Action; // Required
    }

    export enum MediaType {
      Image = 'image', // For image (media) messages
      Document = 'document', // For document (media) messages
      Audio = 'audio', // For audio and voice (media) messages
      Video = 'video', // For video (media) messages
    }

    export type MessageType =
      | MediaType
      | 'text'
      | 'interactive'
      | 'reaction'
      | 'contacts'
      | 'location'
      | 'template';

    // Base Interfaces
    export interface BaseMessage {
      messaging_product: 'whatsapp'; // Specifies the messaging product being used.
      recipient_type?: 'individual'; // Indicates the type of recipient, defaults to 'individual'.
      to: string; // The recipient's phone number.
      context?: Context; // Optional. Refers to the context of the previous message.
    }

    // Specific Message Interfaces
    export interface TextMessage {
      type: 'text';
      text: Text;
    }

    export interface ReactionMessage {
      type: 'reaction';
      reaction: Reaction;
    }

    export interface MediaMessageBase<T extends MediaType> {
      type: T;
    }

    export type MediaMessage<T extends MediaType = MediaType> =
      MediaMessageBase<T> & {
        [key in T]: Media;
      };

    export type ImageMessage = MediaMessage<MediaType.Image>;

    export type AudioMessage = MediaMessage<MediaType.Audio>;

    export type VideoMessage = MediaMessage<MediaType.Video>;

    export type DocumentMessage = MediaMessage<MediaType.Document>;

    export interface ContactsMessage {
      type: 'contacts';
      contacts: Contact[];
    }

    export interface LocationMessage {
      type: 'location';
      location: Location;
    }

    export interface TemplateMessage {
      type: 'template';
      template: Template;
    }

    export interface ReadMessage {
      status: 'read'; // Indicates that the message has been read.
      message_id: string; // The ID of the incoming message that has been read.
    }

    export interface InteractiveMessage {
      type: 'interactive';
      interactive: Interactive;
    }

    export type AnyMediaMessage =
      | ImageMessage
      | AudioMessage
      | VideoMessage
      | DocumentMessage;

    export type AnyMessage =
      | TextMessage
      | AnyMediaMessage
      | ReactionMessage
      | ContactsMessage
      | LocationMessage
      | TemplateMessage
      | ReadMessage
      | InteractiveMessage;

    export type Message = BaseMessage & AnyMessage;
  }

  export namespace Webhook {
    // WEBHOOK NOTIFICATIONS TYPES
    export interface Error {
      code: string;
      title: string;
    }

    // ConversationStatus type
    interface ConversationStatus {
      id: string;
      origin: {
        // Define origin object structure as needed
        [key: string]: any;
      };
      expiration_timestamp?: number; // UNIX timestamp, optional
    }

    // PaymentStatus type
    // interface PaymentStatus {
    //   id: string;
    //   from: string;
    //   type: string; // Always "payment" for payment status update webhooks
    //   status: 'captured' | 'failed' | 'pending'; // Payment status
    //   payment: {
    //     reference_id: string; // Unique reference ID
    //   };
    //   timestamp: string; // Timestamp for the webhook
    // }

    // OriginStatus type
    // interface OriginStatus {
    //   type: 'business_initiated' | 'user_initiated' | 'referral_conversion'; // Conversation entry point
    // }

    // PricingStatus type
    interface PricingStatus {
      pricing_model: 'CBP' | 'NBP'; // Pricing model
      billable: boolean; // Indicates if the message or conversation is billable
      category: 'business_initiated' | 'user_initiated' | 'referral_conversion'; // Pricing category
    }

    export type Status = {
      id: string; // The message ID.

      recipient_id: string; // The WhatsApp ID of the recipient.

      status: 'read' | 'delivered' | 'sent' | 'failed' | 'deleted';
      // The status of the message. Valid values are: read, delivered, sent, failed, or deleted.

      timestamp: string; // The timestamp of the status message.

      type: 'message';
      // The type of entity this status object is about. Currently, the only available option is "message".

      conversation?: ConversationStatus;

      pricing?: PricingStatus;

      errors?: {
        code: string; // Error code for the failure.
        message: string; // Description of the error.
        details?: string; // Additional details about the error, if available.
      }[];
    };

    export interface Metadata {
      // WHATSAPP BUSINESS PHONE NUMBER
      display_phone_number: string;
      // WHATSAPP BUSINESS PHONE NUMBER ID
      phone_number_id: string;
    }

    export interface Profile {
      name: string;
    }

    export interface Contact {
      profile: Profile;
      wa_id: string;
    }

    export interface Context {
      forwarded?: boolean; // Added to Webhooks if the message was forwarded. True if the message has been forwarded.
      frequently_forwarded?: boolean; // Added to Webhooks if the message has been frequently forwarded. True if forwarded more than five times.
      from?: string; // Added to Webhooks if the message is an inbound reply to a sent message. Contains the WhatsApp ID of the sender.
      id?: string; // Optional. The message ID for the sent message for an inbound reply.
      referred_product?: {
        catalog_id: string; // Unique identifier of the Meta catalog linked to the WhatsApp Business Account.
        product_retailer_id: string; // Unique identifier of the product in a catalog.
      }; // Required for Product Enquiry Messages. Specifies the product the user is requesting information about.
    }

    export interface Identity {
      acknowledged: boolean; // State of acknowledgment for the latest user_identity_changed system notification.
      created_timestamp: string; // The timestamp of when the WhatsApp Business API detected the user potentially changed.
      hash: string; // Identifier for the latest user_identity_changed system notification.
    }

    export interface Text {
      body: string;
    }

    export interface Reaction {
      message_id: string;
      emoji: string;
    }

    export interface Media {
      /**
       * The caption that describes the media.
       * Added to Webhooks if it has been previously specified.
       */
      caption?: string;

      /**
       * The media's filename on the sender's device.
       * Added to Webhooks for document messages.
       */
      filename?: string;

      /**
       * The ID of the media.
       */
      id: string;

      /**
       * The MIME type of the media.
       */
      mime_type: string;

      /**
       * The checksum of the media.
       */
      sha256: string;
    }

    export interface Referral {
      source_url: string; // URL leading to the ad or post clicked by the user
      source_type: 'ad' | 'post'; // Type of the ad's source
      source_id: string; // Meta ID for the ad or post
      headline: string; // Headline used in the ad or post
      body: string; // Description or body from the ad or post
      media_type: 'image' | 'video'; // Media type present in the ad or post
      image_url?: string; // URL to the raw image (if media_type is "image")
      video_url?: string; // URL to the video (if media_type is "video")
      thumbnail_url?: string; // URL to the thumbnail image of the video (if media_type is "video")
    }

    export interface Order {
      catalog_id: string;
      product_items: ProductItem[];
      text: string;
    }

    export interface ProductItem {
      product_retailer_id: string;
      quantity: string;
      item_price: string;
      currency: string;
    }

    export interface Button {
      payload: string;
      text: string;
    }

    type InteractiveType = 'button_reply' | 'list_reply';

    interface ButtonReply {
      /**
       * The unique identifier of the button.
       */
      id: string;

      /**
       * The title of the button.
       */
      title: string;
    }

    interface ListReply {
      /**
       * The unique identifier (ID) of the selected row.
       */
      id: string;

      /**
       * The title of the selected row.
       */
      title: string;

      /**
       * The description of the selected row.
       */
      description: string;
    }

    interface Interactive {
      /**
       * Contains the type of interactive object.
       * Supported options are:
       * - 'button_reply': for responses of Reply Buttons.
       * - 'list_reply': for responses to List Messages and other interactive objects.
       */
      type: InteractiveType;

      /**
       * Used on Webhooks related to Reply Buttons.
       * Contains a button reply object.
       */
      button_reply?: ButtonReply;

      /**
       * Used on Webhooks related to List Messages.
       * Contains a list reply object.
       */
      list_reply?: ListReply;
    }

    export enum MessageType {
      Text = 'text', // For text messages
      Image = 'image', // For image (media) messages
      Interactive = 'interactive', // For interactive messages
      Document = 'document', // For document (media) messages
      Audio = 'audio', // For audio and voice (media) messages
      Sticker = 'sticker', // For sticker messages
      Order = 'order', // For when a customer has placed an order
      Video = 'video', // For video (media) messages
      Button = 'button', // For responses to interactive message templates
      Contacts = 'contacts', // For contact messages
      Location = 'location', // For location messages
      Unknown = 'unknown', // For unknown messages
      System = 'system', // For user number change messages
      Reaction = 'reaction',
    }

    // Base interface that all messages inherit from
    export interface BaseMessage {
      from: string; // The customer's phone number
      id: string; // Unique identifier of the incoming message
      timestamp: string; // Timestamp when the message was sent
      type: MessageType; // Type of the message
      context?: Context; // Forwarded or inbound reply context
      identity?: Identity; // Security notifications identity object
      errors?: Error[]; // Errors array for unsupported messages
      referral?: Referral; // Referral object for Click to WhatsApp ads
    }

    // Interface for text messages
    export interface TextMessage extends BaseMessage {
      type: MessageType.Text;
      text: Text; // Text object for "text" type messages
    }

    // Interface for audio messages
    export interface AudioMessage extends BaseMessage {
      type: MessageType.Audio;
      audio: Media; // Media object for "audio" type messages
    }

    // Interface for image messages
    export interface ImageMessage extends BaseMessage {
      type: MessageType.Image;
      image: Media; // Media object for "image" type messages
    }

    // Interface for video messages
    export interface VideoMessage extends BaseMessage {
      type: MessageType.Video;
      video: Media; // Media object for "video" type messages
    }

    // Interface for document messages
    export interface DocumentMessage extends BaseMessage {
      type: MessageType.Document;
      document: Media; // Media object for "document" type messages
    }

    // Interface for sticker messages
    export interface StickerMessage extends BaseMessage {
      type: MessageType.Sticker;
      sticker: Media; // Media object for "sticker" type messages
    }

    // Interface for interactive messages
    export interface InteractiveMessage extends BaseMessage {
      type: MessageType.Interactive;
      interactive: Interactive; // Placeholder for interactive object structure
    }

    // Interface for order messages
    export interface OrderMessage extends BaseMessage {
      type: MessageType.Order;
      order: Order; // Order object when a customer places an order
    }

    // Interface for button messages
    export interface ButtonMessage extends BaseMessage {
      type: MessageType.Button;
      button: Button; // Button message object
    }

    // Interface for system messages
    export interface SystemMessage extends BaseMessage {
      type: MessageType.System;
      system: {
        body: string; // Describes the system message event. Supported use cases: Phone number update, Identity update.
        new_wa_id?: string; // Added to Webhooks for phone number updates. New WhatsApp ID of the customer.
        identity?: string; // Added to Webhooks for identity updates. New WhatsApp ID of the customer.
        type: 'user_changed_number' | 'user_identity_changed'; // Supported types: user_changed_number, user_identity_changed.
        user?: string; // Added to Webhooks for identity updates. The new WhatsApp user ID of the customer.
      }; // System message object
    }

    // Interface for contacts messages
    export interface ContactsMessage extends BaseMessage {
      type: MessageType.Contacts;
      contacts: Messages.Contact[]; // Array of contact objects
    }

    // Interface for location messages
    export interface LocationMessage extends BaseMessage {
      type: MessageType.Location;
      location: Messages.Location; // Location object
    }

    export interface ReactionMessage extends BaseMessage {
      type: MessageType.Reaction;
      reaction: Reaction;
    }

    // Interface for unknown messages
    export interface UnknownMessage extends BaseMessage {
      type: MessageType.Unknown;
    }

    export type MediaMessage =
      | AudioMessage
      | ImageMessage
      | VideoMessage
      | DocumentMessage
      | StickerMessage;

    // Example usage: A function to handle messages
    export type Message =
      | TextMessage
      | MediaMessage
      | InteractiveMessage
      | OrderMessage
      | ButtonMessage
      | SystemMessage
      | ContactsMessage
      | LocationMessage
      | UnknownMessage;

    export interface Value {
      messaging_product: 'whatsapp';
      metadata: Metadata;
      contacts?: Contact[];
      messages?: Message[];
      statuses?: Status[];
      errors?: Error[];
    }

    export interface Change {
      value: Value;
      field: 'messages';
    }

    export interface Entry {
      id: 'whatsapp_business_account';
      changes: Change[];
    }

    export interface Notification {
      object: string;
      entry: Entry[];
    }
  }
}
