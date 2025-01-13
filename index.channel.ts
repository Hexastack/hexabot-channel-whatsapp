/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import crypto from 'crypto';
import { Stream } from 'stream';

import { HttpService } from '@nestjs/axios';
import { Injectable, RawBodyRequest } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { Attachment } from '@/attachment/schemas/attachment.schema';
import { AttachmentService } from '@/attachment/services/attachment.service';
import { ChannelService } from '@/channel/channel.service';
import ChannelHandler from '@/channel/lib/Handler';
import { SubscriberCreateDto } from '@/chat/dto/subscriber.dto';
import { FileType } from '@/chat/schemas/types/attachment';
import { ButtonType, PostBackButton } from '@/chat/schemas/types/button';
import {
  OutgoingMessageFormat,
  StdEventType,
  StdOutgoingAttachmentMessage,
  StdOutgoingButtonsMessage,
  StdOutgoingEnvelope,
  StdOutgoingListMessage,
  StdOutgoingQuickRepliesMessage,
  StdOutgoingTextMessage,
} from '@/chat/schemas/types/message';
import { BlockOptions } from '@/chat/schemas/types/options';
import { LabelService } from '@/chat/services/label.service';
import { MessageService } from '@/chat/services/message.service';
import { SubscriberService } from '@/chat/services/subscriber.service';
import { Content } from '@/cms/schemas/content.schema';
import { MenuService } from '@/cms/services/menu.service';
import { I18nService } from '@/i18n/services/i18n.service';
import { LanguageService } from '@/i18n/services/language.service';
import { LoggerService } from '@/logger/logger.service';
import { Setting } from '@/setting/schemas/setting.schema';
import { SettingService } from '@/setting/services/setting.service';

import { GraphApi } from './lib/graph-api';
import { WHATSAPP_CHANNEL_NAME } from './settings';
import { WhatsApp } from './types';
import WhatsAppEventWrapper from './wrapper';

@Injectable()
export default class WhatsAppHandler extends ChannelHandler<
  typeof WHATSAPP_CHANNEL_NAME
> {
  protected api: GraphApi;

  constructor(
    settingService: SettingService,
    channelService: ChannelService,
    logger: LoggerService,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly i18n: I18nService,
    protected readonly languageService: LanguageService,
    protected readonly subscriberService: SubscriberService,
    protected readonly attachmentService: AttachmentService,
    protected readonly messageService: MessageService,
    protected readonly menuService: MenuService,
    protected readonly labelService: LabelService,
    protected readonly httpService: HttpService,
    protected readonly settingsService: SettingService,
  ) {
    super(WHATSAPP_CHANNEL_NAME, settingService, channelService, logger);
  }

  getPath(): string {
    return __dirname;
  }

  /**
   * Logs a debug message indicating the initialization of the WhatsApp Channel Handler.
   */
  async init(): Promise<void> {
    this.logger.debug('WhatsApp Channel Handler: initialization ...');
    const settings = await this.getSettings();
    this.api = new GraphApi(
      this.httpService,
      settings ? settings.access_token : '',
    );
  }

  /**
   * @function subscribe
   * @description Handles the subscription request for the WhatsApp channel.
   * Validates the verification token and responds with appropriate HTTP status codes.
   *
   * @param {Request} req - The incoming HTTP request object.
   * @param {Response} res - The outgoing HTTP response object.
   *
   * @returns {Promise<void>} Resolves with an HTTP response indicating the subscription status.
   *
   * @throws Will return a 500 status code with an error message if:
   * - `verifyToken` is not configured.
   * - The request does not include the required query parameters.
   * - The validation tokens do not match.
   */
  async subscribe(req: Request, res: Response) {
    this.logger.debug('WhatsApp Channel Handler: Subscribing ...');
    const data: any = req.query;
    const settings = await this.getSettings();
    const verifyToken = settings.verify_token;
    if (!verifyToken) {
      return res.status(500).json({
        err: 'WhatsApp Channel Handler: You need to specify a verifyToken in your config.',
      });
    }
    if (!data || !data['hub.mode'] || !data['hub.verify_token']) {
      return res.status(500).json({
        err: 'WhatsApp Channel Handler: Did not recieve any verification token.',
      });
    }
    if (
      data['hub.mode'] === 'subscribe' &&
      data['hub.verify_token'] === verifyToken
    ) {
      this.logger.log(
        'WhatsApp Channel Handler: Subscription token has been verified successfully!',
      );
      return res.status(200).send(data['hub.challenge']);
    } else {
      this.logger.error(
        'WhatsApp Channel Handler: Failed validation. Make sure the validation tokens match.',
      );
      return res.status(500).json({
        err: 'WhatsApp Channel Handler: Failed validation. Make sure the validation tokens match.',
      });
    }
  }

  _validateMessage(req: Request, res: Response, next: () => void) {
    const data: WhatsApp.Webhook.Notification = req.body;

    if (data.object !== 'whatsapp_business_account') {
      this.logger.warn(
        'WhatsApp Channel Handler: Missing `whatsapp_business_account` attribute!',
        data,
      );
      return res
        .status(400)
        .json({ err: 'The whatsapp_business_account parameter is missing!' });
    }
    return next();
  }

  async middleware(
    req: RawBodyRequest<Request>,
    _res: Response,
    next: NextFunction,
  ) {
    const signature: string = req.headers['x-hub-signature'] as string;

    if (!signature) {
      return next();
    }

    const settings = await this.getSettings();
    const expectedHash = crypto
      .createHmac('sha1', settings.app_secret)
      .update(req.rawBody)
      .digest('hex');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    req.whatsapp = { expectedHash };
    next();
  }

  _verifySignature(req: Request, res: Response, next: () => void) {
    const signature: string = req.headers['x-hub-signature'] as string;
    const elements: string[] = signature.split('=');
    const signatureHash = elements[1];

    const expectedHash =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      req.whatsapp
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          req.whatsapp.expectedHash
        : '';

    if (signatureHash !== expectedHash) {
      this.logger.warn(
        "WhatsApp Channel Handler: Couldn't match the request signature.",
        signatureHash,
        expectedHash,
      );
      return res
        .status(500)
        .json({ err: "Couldn't match the request signature." });
    }
    this.logger.debug(
      'WhatsApp Channel Handler: Request signature has been validated.',
    );
    return next();
  }

  /**
   * Main handler for processing incoming webhook requests from the WhatsApp channel.
   *
   * @param req - The incoming HTTP request object.
   * @param res - The outgoing HTTP response object.
   *
   * @returns Resolves with an HTTP response indicating the processing status.
   *
   * @throws Will return a 500 status code with an error message if:
   * - Signature verification fails.
   * - Webhook data does not include an `entry` object.
   * - An error occurs while handling events.
   */
  async handle(req: Request, res: Response) {
    const handler: WhatsAppHandler = this;

    // Handle webhook subscribe notifications
    if (req.method === 'GET') {
      return await handler.subscribe(req, res);
    }
    return handler._verifySignature(req, res, () => {
      return handler._validateMessage(req, res, () => {
        const data = req.body as WhatsApp.Webhook.Notification;
        this.logger.debug(
          'WhatsApp Channel Handler: Webhook notification received.',
        );
        // Check notification
        if (!('entry' in data)) {
          this.logger.error(
            'WhatsApp Channel Handler: Webhook received no entry data.',
          );
          return res.status(500).json({
            err: 'WhatsApp Channel Handler: Webhook received no entry data.',
          });
        }

        data.entry.forEach((entry) => {
          entry.changes.forEach((change) => {
            const messageEvents = (change.value.messages || []).map(
              (message) => {
                const contact = change.value.contacts.find(
                  ({ wa_id }) => wa_id === message.from,
                );
                return new WhatsAppEventWrapper(handler, message, {
                  metadata: change.value.metadata,
                  contact,
                });
              },
            );
            const statusEvents = (change.value.statuses || []).map((status) => {
              return new WhatsAppEventWrapper(handler, status, {
                metadata: change.value.metadata,
              });
            });
            // Handle messages & statues
            [...messageEvents, ...statusEvents].forEach((event) => {
              try {
                const type: StdEventType = event.getEventType();

                if (type) {
                  this.eventEmitter.emit(`hook:chatbot:${type}`, event);
                } else {
                  this.logger.debug(
                    'WhatsApp Channel Handler: Webhook received unknown event',
                    event,
                  );
                }
              } catch (err) {
                this.logger.error(
                  'WhatsApp Channel Handler: Something went wrong while handling events',
                  err,
                );
              }
            });
          });
        });
        return res.status(200).json({ success: true });
      });
    });
  }

  /**
   * Truncate text to a specified length, appending "..." if needed.
   *
   * @param text - The text to truncate.
   * @param maxLength - The maximum length of the truncated text.
   * @returns - The truncated text.
   */
  private truncateText(text: string, maxLength: number) {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + '...';
  }

  /**
   * Formats an outgoing message based on its specified format type.
   *
   * @param envelope - The envelope containing the message and its format.
   * @param options - Optional configurations for message customization.
   *
   * @returns The formatted message.
   */
  async _formatMessage(
    envelope: StdOutgoingEnvelope,
    options: BlockOptions,
  ): Promise<WhatsApp.Messages.AnyMessage> {
    switch (envelope.format) {
      case OutgoingMessageFormat.buttons:
        return this._buttonsFormat(envelope.message, options);
      case OutgoingMessageFormat.carousel:
        return this._carouselFormat(envelope.message, options);
      case OutgoingMessageFormat.list:
        return this._listFormat(envelope.message, options);
      case OutgoingMessageFormat.quickReplies:
        return this._quickRepliesFormat(envelope.message, options);
      case OutgoingMessageFormat.text:
        return this._textFormat(envelope.message, options);
      case OutgoingMessageFormat.attachment:
        return await this._attachmentFormat(envelope.message, options);
      default:
        throw new Error('Unknown message format');
    }
  }

  /**
   * Formats an attachment message for the WhatsApp API.
   *
   * @param message - The outgoing attachment message details.
   * @param _options - Optional configuration for message customization.
   *
   * @returns The formatted attachment message object.
   */
  async _attachmentFormat(
    message: StdOutgoingAttachmentMessage,
    _options?: BlockOptions,
  ): Promise<WhatsApp.Messages.AnyMediaMessage> {
    const link = await this.getPublicUrl(message.attachment.payload);
    const media: WhatsApp.Messages.Media = {
      link,
      // caption: attachment.name,
      // filename: attachment.name,
    };

    switch (message.attachment.type) {
      case FileType.image:
        return {
          type: WhatsApp.Messages.MediaType.Image,
          image: media,
        };
      case FileType.audio:
        return {
          type: WhatsApp.Messages.MediaType.Audio,
          audio: media,
        };
      case FileType.video:
        return {
          type: WhatsApp.Messages.MediaType.Video,
          video: media,
        };
      case FileType.file:
        return {
          type: WhatsApp.Messages.MediaType.Document,
          document: media,
        };
      default:
        throw new Error('Unknown file type!');
    }
  }

  /**
   * Formats a list-based interactive message for the WhatsApp API.
   *
   * @param message - The outgoing list message details.
   * @param options - Optional configuration for message customization.
   *
   * @returns The formatted interactive list message object.
   */
  _listFormat(
    message: StdOutgoingListMessage,
    options: BlockOptions,
  ): WhatsApp.Messages.InteractiveMessage {
    const fields = options.content.fields;
    const rows: WhatsApp.Messages.Row[] = message.elements.map((item) => {
      const postback = Content.getPayload(item);
      return {
        id: postback,
        title: item[fields.title],
        description: item[fields.subtitle]
          ? this.truncateText(item[fields.subtitle], 72)
          : undefined, // Optional: Include if available
      };
    });
    const btnText = message.options.buttons[0].title;
    return {
      type: 'interactive',
      interactive: {
        type: WhatsApp.Messages.InteractiveType.List,
        body: {
          text: this.i18n.t('Click on "{btnText}" to display the list:', {
            args: { btnText },
          }),
        },
        action: {
          sections: [
            {
              title: 'Section',
              rows,
            },
          ],
          button: btnText,
        },
      },
    };
  }

  /**
   * Carousel format is not supported in WhatsApp, so we will be using
   * List format instead.
   *
   * @param message - The outgoing list message details.
   * @param options - Optional configuration for message customization.
   *
   * @returns The formatted interactive list message object.
   */
  _carouselFormat(message: StdOutgoingListMessage, options: BlockOptions) {
    return this._listFormat(message, options);
  }

  /**
   * Formats a text message for the WhatsApp API.
   *
   * @param message - The outgoing text message details.
   * @param _options - Optional configuration for message customization.
   *
   * @returns The formatted message object.
   */
  _textFormat(
    message: StdOutgoingTextMessage,
    _options?: BlockOptions,
  ): WhatsApp.Messages.TextMessage {
    return {
      type: 'text',
      text: {
        body: message.text,
      },
    };
  }

  /**
   * Formats a quick-replies interactive message for the WhatsApp API.
   *
   * @param message - The outgoing quick-replies message details.
   * @param _options - Optional configuration for message customization.
   *
   * @returns The formatted interactive message object with quick replies.
   */
  _quickRepliesFormat(
    message: StdOutgoingQuickRepliesMessage,
    _options?: BlockOptions,
  ): WhatsApp.Messages.InteractiveMessage {
    const buttons: WhatsApp.Messages.ReplyButton[] = message.quickReplies.map(
      ({ payload, title }) => ({
        type: 'reply',
        reply: {
          id: payload,
          title,
        },
      }),
    );
    return {
      type: 'interactive',
      interactive: {
        type: WhatsApp.Messages.InteractiveType.Button,
        body: {
          text: message.text,
        },
        action: {
          buttons,
        },
      },
    };
  }

  /**
   * Formats a button-based interactive message for the WhatsApp API.
   *
   * @param message - The outgoing buttons message details.
   * @param _options - Optional configuration for message customization.
   *
   * @returns The formatted interactive message object.
   */
  _buttonsFormat(
    message: StdOutgoingButtonsMessage,
    _options?: BlockOptions,
  ): WhatsApp.Messages.InteractiveMessage {
    const buttons: WhatsApp.Messages.ReplyButton[] = message.buttons
      .filter(({ type }) => type == ButtonType.postback)
      .map((btn: PostBackButton) => ({
        type: 'reply',
        reply: {
          id: btn.payload,
          title: btn.title,
        },
      }));
    return {
      //note: URL button is not supported in whatsapp interactive message
      type: 'interactive',
      interactive: {
        type: WhatsApp.Messages.InteractiveType.Button,
        body: {
          text: message.text,
        },
        action: {
          buttons,
        },
      },
    };
  }

  /**
   * Sends a message via the WhatsApp API to the recipient specified in the event.
   * Formats the message based on the provided envelope and options, and returns the message ID of the sent message.
   *
   * @param event - The event wrapper containing details about the message sender and context.
   * @param envelope - The envelope containing the outgoing message details.
   * @param options - Options for message customization (e.g., templates, formatting).
   * @param _context - Optional additional context for the message (default: `undefined`).
   *
   * @returns Resolves with an object containing the message ID (`mid`) of the sent message.
   */
  async sendMessage(
    event: WhatsAppEventWrapper,
    envelope: StdOutgoingEnvelope,
    options: BlockOptions,
    _context?: any,
  ): Promise<{ mid: string }> {
    const message = await this._formatMessage(envelope, options);

    const channelData = event.getChannelData();
    try {
      const res = await this.api.sendMessage(
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: event.getSenderForeignId(),
          ...message,
        },
        channelData.metadata.phone_number_id,
      );
      return { mid: res.messages[0].id };
    } catch (err) {
      this.logger.error(err.response?.data);
      throw err;
    }
  }

  /**
   * Retrieves user data based on a WhatsApp event.
   *
   * @param event - The WhatsApp event wrapper containing the event details.
   *
   * @returns A promise that resolves with the constructed `SubscriberCreateDto` object.
   */
  async getUserData(event: WhatsAppEventWrapper): Promise<SubscriberCreateDto> {
    const defautLanguage = await this.languageService.getDefaultLanguage();
    const channelData = event.getChannelData();
    const userName = channelData.contact?.profile?.name;
    const [firstName, ...rest] = userName.split(' ');
    const lastName = rest.join(' ');

    // @TODO: Check if there is a way to retrieve the avatar

    return {
      foreign_id: event.getSenderForeignId(),
      first_name: firstName,
      last_name: lastName,
      gender: 'unknown',
      channel: channelData,
      assignedAt: null,
      assignedTo: null,
      labels: [],
      locale: 'en',
      language: defautLanguage.code,
      timezone: null,
      country: '',
      lastvisit: new Date(),
      retainedFrom: new Date(),
    };
  }

  /**
   * Fetches and stores a WhatsApp media as an attachment
   *
   * @param media WhatsApp Media object
   * @param phoneNumberId Phone number business ID
   *
   * @returns Resolves once the media is stored as an attachment.
   */
  public async fetchAndStoreMedia(
    media: WhatsApp.Webhook.Media,
    phoneNumberId: string,
  ): Promise<Attachment> {
    const mediaMetadata = await this.api.mediaAPI.getMediaUrl(
      media.id,
      phoneNumberId,
    );
    const response = await this.httpService.axiosRef.get<Stream>(
      mediaMetadata.url,
      {
        responseType: 'stream',
      },
    );
    // @TODO : perform sha256 check
    return await this.attachmentService.store(response.data, {
      name: media.filename || uuidv4(),
      size: parseInt(response.headers['content-length']),
      type: media.mime_type || response.headers['content-type'],
      channel: {
        [this.getName()]: media,
      },
    });
  }

  @OnEvent('hook:whatsapp_channel:access_token')
  async onAccessTokenUpdate(setting: Setting): Promise<void> {
    this.api = new GraphApi(this.httpService, setting.value);
  }
}
