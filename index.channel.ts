/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import crypto from 'crypto';

import { HttpService } from '@nestjs/axios';
import { Injectable, RawBodyRequest } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NextFunction, Request, Response } from 'express';

import { Attachment } from '@/attachment/schemas/attachment.schema';
import { AttachmentService } from '@/attachment/services/attachment.service';
import { ChannelService } from '@/channel/channel.service';
import EventWrapper from '@/channel/lib/EventWrapper';
import ChannelHandler from '@/channel/lib/Handler';
import { ChannelName } from '@/channel/types';
import { SubscriberCreateDto } from '@/chat/dto/subscriber.dto';
import { FileType, WithUrl } from '@/chat/schemas/types/attachment';
import {
  OutgoingMessageFormat,
  StdEventType,
  StdOutgoingAttachmentMessage,
  StdOutgoingEnvelope,
  StdOutgoingListMessage,
  StdOutgoingQuickRepliesMessage,
  StdOutgoingTextMessage,
} from '@/chat/schemas/types/message';
import { BlockOptions } from '@/chat/schemas/types/options';
import { LabelService } from '@/chat/services/label.service';
import { MessageService } from '@/chat/services/message.service';
import { SubscriberService } from '@/chat/services/subscriber.service';
import { MenuService } from '@/cms/services/menu.service';
import { I18nService } from '@/i18n/services/i18n.service';
import { LanguageService } from '@/i18n/services/language.service';
import { LoggerService } from '@/logger/logger.service';
import { Setting } from '@/setting/schemas/setting.schema';
import { SettingService } from '@/setting/services/setting.service';

import { GraphApi } from './lib/graph-api';
import { WHATSAPP_CHANNEL_NAME } from './settings';
import { Whatsapp } from './types';
import WhatsappEventWrapper from './wrapper';

@Injectable()
export default class WhatsappHandler extends ChannelHandler<
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
    this.logger.debug('WhatsApp Channel Handler : initialization ...');
    const settings = await this.getSettings();
    this.api = new GraphApi(
      this.httpService,
      settings ? settings.access_token : '',
    );
  }

  async subscribe(req: Request, res: Response) {
    this.logger.debug('WhatsApp Channel Handler : Subscribing ...');
    const data: any = req.query;
    const settings = await this.getSettings();
    const verifyToken = settings.verify_token;
    if (!verifyToken) {
      return res.status(500).json({
        err: 'WhatsApp Channel Handler : You need to specify a verifyToken in your config.',
      });
    }
    if (!data || !data['hub.mode'] || !data['hub.verify_token']) {
      return res.status(500).json({
        err: 'WhatsApp Channel Handler : Did not recieve any verification token.',
      });
    }
    if (
      data['hub.mode'] === 'subscribe' &&
      data['hub.verify_token'] === verifyToken
    ) {
      this.logger.log(
        'WhatsApp Channel Handler : Subscription token has been verified successfully!',
      );
      return res.status(200).send(data['hub.challenge']);
    } else {
      this.logger.error(
        'WhatsApp Channel Handler : Failed validation. Make sure the validation tokens match.',
      );
      return res.status(500).json({
        err: 'WhatsApp Channel Handler : Failed validation. Make sure the validation tokens match.',
      });
    }
  }

  _validateMessage(req: Request, res: Response, next: () => void) {
    const data: any = req.body;

    if (data.object !== 'whatsapp_business_account') {
      this.logger.warn(
        'Whatsapp Channel Handler : Missing `whatsapp_business_account` attribute!',
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
        "Messenger Channel Handler : Couldn't match the request signature.",
        signatureHash,
        expectedHash,
      );
      return res
        .status(500)
        .json({ err: "Couldn't match the request signature." });
    }
    this.logger.debug(
      'Messenger Channel Handler : Request signature has been validated.',
    );
    return next();
  }

  async handle(req: Request, res: Response) {
    const handler: WhatsappHandler = this;

    // Handle webhook subscribe notifications
    if (req.method === 'GET') {
      return await handler.subscribe(req, res);
    }
    return handler._verifySignature(req, res, () => {
      return handler._validateMessage(req, res, () => {
        const data = req.body;
        this.logger.debug(
          'Whatsapp Channel Handler : Webhook notification received.',
        );
        // Check notification
        if (!('entry' in data)) {
          this.logger.error(
            'Whatsapp Channel Handler : Webhook received no entry data.',
          );
          return res.status(500).json({
            err: 'Whatsapp Channel Handler : Webhook received no entry data.',
          });
        }

        data.entry.forEach((entry: any) => {
          // Iterate over each messaging event (in parallel)
          entry.changes.forEach((e: Whatsapp.Event) => {
            try {
              const event = new WhatsappEventWrapper(handler, e);
              const type: StdEventType = event.getEventType();
              if (type) {
                this.eventEmitter.emit(`hook:chatbot:${type}`, event);
              } else {
                this.logger.error(
                  'Whatsapp Channel Handler : Webhook received unknown event ',
                  event,
                );
              }
            } catch (err) {
              // if any of the events produced an error, err would equal that error
              this.logger.error(
                'Whatsapp Channel Handler : Something went wrong while handling events',
                err,
              );
            }
          });
        });
        return res.status(200).json({ success: true });
      });
    });
  }

  _formatMessage(
    envelope: StdOutgoingEnvelope,
    recipient_id: string,
    options: BlockOptions,
  ): Whatsapp.OutgoingMessageBase {
    switch (envelope.format) {
      // case OutgoingMessageFormat.buttons:
      //   return this._buttonsFormat(envelope.message,recipient_id, options);
      // case OutgoingMessageFormat.carousel:
      //   return this._carouselFormat(envelope.message,recipient_id, options);
      //TODO: fix typage;
      case OutgoingMessageFormat.list:
        return this._listFormat(envelope.message, recipient_id, options);
      case OutgoingMessageFormat.quickReplies:
        return this._quickRepliesFormat(
          envelope.message,
          recipient_id,
          options,
        );
      case OutgoingMessageFormat.text:
        return this._textFormat(envelope.message, recipient_id, options);
      case OutgoingMessageFormat.attachment:
        return this._attachmentFormat(envelope.message, recipient_id, options);
      default:
        throw new Error('Unknown message format');
    }
  }

  _buttonsFormat() {
    throw new Error('Method not implemented.2');
  }

  castAttachmentType(type: FileType): Whatsapp.AttachmentType {
    if (type === FileType.file) {
      return Whatsapp.AttachmentType.document;
    } else {
      return type as unknown as Whatsapp.AttachmentType;
    }
  }

  _attachmentFormat(
    message: StdOutgoingAttachmentMessage<WithUrl<Attachment>>,
    recipient_id: string,
    _options?: any,
  ): Whatsapp.AttachmentTemplate {
    const { ...restAttachment } = message.attachment;
    const type = this.castAttachmentType(message.attachment.type);
    const outgoingMessage: Whatsapp.AttachmentTemplate = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient_id,
      // @ts-expect-error to check
      type,
      ...restAttachment,
    };
    const link = message.attachment.payload.url.replace(
      'localhost:4000',
      '', //ngrok link
    );
    switch (type) {
      case Whatsapp.AttachmentType.image:
        outgoingMessage.image = {
          link,
          caption: message.attachment.payload.name || '',
        };
        break;
      case Whatsapp.AttachmentType.document:
        outgoingMessage.type = type;
        outgoingMessage.document = {
          link,
          caption: message.attachment.payload.name || '',
          filename: message.attachment.payload.name || '',
        };
        break;
      case Whatsapp.AttachmentType.video:
        outgoingMessage.video = {
          link,
          caption: message.attachment.payload.name || '',
        };
        break;
      case Whatsapp.AttachmentType.audio:
        outgoingMessage.audio = {
          id: message.attachment.payload.id,
        };
        break;
      default:
        throw new Error(`Unsupported attachment type: ${type}`);
    }

    return outgoingMessage;
  }

  _listFormat(
    message: StdOutgoingListMessage,
    recipient_id: string,
    _options?: any,
  ): Whatsapp.OutgoingMessageBase {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient_id,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: message.options.fields.title,
        },
        action: {
          sections: [
            {
              title: 'Title',
              rows: message.elements.map((row: any) => ({
                id: row.id,
                title: row.title,
                description: row.description, // Optional: Include if available
              })),
            },
          ],
          button: message.options.buttons[0].title,
        },
      },
    };
  }

  _carouselFormat() {
    throw new Error('Method not implemented.6');
  }

  _textFormat(
    message: StdOutgoingTextMessage,
    recipient_id: string,
    _options?: any,
  ): Whatsapp.OutgoingMessageBase {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient_id,
      type: 'text',
      text: {
        body: message.text,
      },
    };
  }

  _quickRepliesFormat(
    message: StdOutgoingQuickRepliesMessage,
    recipient_id: string,
    _options?: any,
  ): Whatsapp.OutgoingMessageBase {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient_id,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: message.text,
        },
        action: {
          buttons: message.quickReplies.map((quickReply: any) => ({
            type: 'reply',
            reply: {
              id: quickReply.payload,
              title: quickReply.title,
            },
          })),
        },
      },
    };
  }

  async sendMessage(
    event: EventWrapper<any, any>,
    envelope: StdOutgoingEnvelope,
    options: BlockOptions,
    _context?: any,
  ): Promise<{ mid: string }> {
    const handler: WhatsappHandler = this;
    const message = handler._formatMessage(
      envelope,
      event.getSenderForeignId(),
      options,
    );

    const res = await this.api.sendMessage(message);
    return { mid: res.messages[0].id };
  }

  async getUserData(event: WhatsappEventWrapper): Promise<SubscriberCreateDto> {
    const defautLanguage = await this.languageService.getDefaultLanguage();

    return {
      foreign_id: event.getSenderForeignId(),
      first_name: 'test',
      last_name: 'test',
      gender: 'test',
      channel: {
        name: this.getName() as ChannelName,
      },
      assignedAt: null,
      assignedTo: null,
      labels: [],
      locale: 'test',
      language: defautLanguage.code,
      timezone: null,
      country: '',
      lastvisit: new Date(),
      retainedFrom: new Date(),
    };
  }

  @OnEvent('hook:whatsapp_channel:access_token')
  async onAccessTokenUpdate(setting: Setting): Promise<void> {
    this.api = new GraphApi(this.httpService, setting.value);
  }

  //TODO onevent update setting (hook:setting:postUpdate)
}
