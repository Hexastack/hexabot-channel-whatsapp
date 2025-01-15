/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';

import { WhatsApp } from '../types';

import { MediaAPI } from './media-api';

export interface GraphRequestOptions {
  apiVersion?: string;
  path?: string;
  qs?: { [key: string]: any };
  method?: string;
  payload?: WhatsApp.Messages.Message;
}

export class GraphApi {
  private graphApiVersion: string = 'v20.0';

  public mediaAPI: MediaAPI;

  constructor(
    private readonly httpService: HttpService,
    private readonly accessToken: string,
  ) {
    this.mediaAPI = new MediaAPI(this);
  }

  public getApiVersion(): string {
    return this.graphApiVersion;
  }

  public async sendRequest<T>(options: GraphRequestOptions): Promise<T> {
    const apiVersion = options.apiVersion || this.getApiVersion();
    const qs = options.qs || {};
    let url = 'https://graph.facebook.com';

    if (!options.path) {
      throw new Error('Valid "path" property required');
    }

    if (apiVersion) {
      url += `/${apiVersion}`;
    }

    url += `${options.path}`;

    let method: string;
    if (options.method) {
      method = options.method.toUpperCase();
    } else if (options.payload) {
      method = 'POST';
    } else {
      method = 'GET';
    }

    if (!this.accessToken) {
      throw new Error('WhatsApp access token is not set!');
    }

    const axiosConfig: AxiosRequestConfig = {
      url,
      method,
      params: qs,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      responseType: 'json',
    };

    if (options.payload) {
      if (typeof options.payload !== 'object') {
        throw new Error('Invalid request payload');
      }
      axiosConfig.data = options.payload;
    }

    const { data } = await this.httpService.axiosRef.request(axiosConfig);

    return data;
  }

  /**
   * Sends a WhatsApp message using the WhatsApp Business API.
   *
   * @param message - The message object to be sent, containing content, type, and recipient details.
   * @param wsBusinessPhoneNumberId - The unique identifier of the WhatsApp Business phone number.
   *
   * @returns A promise that resolves with the API response upon successful message delivery.
   */
  public async sendMessage(
    message: WhatsApp.Messages.Message,
    wsBusinessPhoneNumberId: string,
  ) {
    return await this.sendRequest<WhatsApp.MessageApiResponse>({
      path: `/${wsBusinessPhoneNumberId}/messages`,
      payload: message,
    });
  }
}
