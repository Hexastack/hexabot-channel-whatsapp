import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request, Response } from 'express';

import { AttachmentService } from '@/attachment/services/attachment.service';
import { ChannelService } from '@/channel/channel.service';
import EventWrapper from '@/channel/lib/EventWrapper';
import ChannelHandler from '@/channel/lib/Handler';
import { SubscriberCreateDto } from '@/chat/dto/subscriber.dto';
import {
  OutgoingMessageFormat,
  StdEventType,
  StdOutgoingEnvelope,
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
import { SettingService } from '@/setting/services/setting.service';

import { GraphApi } from './lib/graph-api';
import { WHATSAPP_CHANNEL_NAME } from './settings';
import { Whatsapp } from './types';
import WhatsappEventWrapper from './wrapper';
import { ChannelName } from '@/channel/types';

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
      settings && typeof settings.access_token === 'string'
        ? settings.access_token
        : '',
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

  async handle(req: Request, res: Response) {
    const handler: WhatsappHandler = this;

    // Handle webhook subscribe notifications
    if (req.method === 'GET') {
      return await handler.subscribe(req, res);
    }

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
    this.logger.debug('DATA ENTRY:', data.entry);
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
  }

  _buttonsFormat() {
    throw new Error('Method not implemented.2');
  }

  _attachmentFormat() {
    throw new Error('Method not implemented.3');
  }

  _formatElements(): any[] {
    throw new Error('Method not implemented.4');
  }

  _listFormat() {
    throw new Error('Method not implemented.5');
  }

  _carouselFormat() {
    throw new Error('Method not implemented.6');
  }

  _textFormat(
    message: StdOutgoingTextMessage,
    recipient_id: string,
    _options?: any,
  ) {
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
  ) {
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

  _formatMessage(
    envelope: StdOutgoingEnvelope,
    recipient_id: string,
    options: BlockOptions,
  ): Whatsapp.OutgoingMessageBase {
    switch (envelope.format) {
      // case OutgoingMessageFormat.attachment:
      //   return this._attachmentFormat(envelope.message,recipient_id, options);
      // case OutgoingMessageFormat.buttons:
      //   return this._buttonsFormat(envelope.message,recipient_id, options);
      // case OutgoingMessageFormat.carousel:
      //   return this._carouselFormat(envelope.message,recipient_id, options);
      // case OutgoingMessageFormat.list:
      //   return this._listFormat(envelope.message,recipient_id, options);
      case OutgoingMessageFormat.quickReplies:
        return this._quickRepliesFormat(
          envelope.message,
          recipient_id,
          options,
        ) as any as Whatsapp.OutgoingMessageBase;
      //TODO: fix typage;
      case OutgoingMessageFormat.text:
        return this._textFormat(
          envelope.message,
          recipient_id,
          options,
        ) as any as Whatsapp.OutgoingMessageBase;
      //TODO: fix typage;

      default:
        throw new Error('Unknown message format');
    }
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
        name: this.getName() as ChannelName
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

  //TODO onevent update setting (hook:setting:postUpdate)
}
