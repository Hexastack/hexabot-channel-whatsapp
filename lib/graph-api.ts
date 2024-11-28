/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

/* eslint-disable prettier/prettier */
/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Whatsapp } from '../types';

import { MediaAPI } from './media-api';
import { ProfileAPI } from './profile-api'; // Import the ProfileAPI class

export interface GraphRequestOptions {
  apiVersion?: string;
  path?: string;
  qs?: { [key: string]: any };
  method?: string;
  payload?: Whatsapp.RequestBody;
}

export class GraphApi {
  private graphApiVersion: string = 'v20.0';

  public profileAPI: ProfileAPI;

  public mediaAPI: MediaAPI;

  constructor(
    private readonly httpService: HttpService,
    private readonly pageToken: string,
  ) {
    this.profileAPI = new ProfileAPI(this);
    this.mediaAPI = new MediaAPI(this);
  }

  public getApiVersion(): string {
    return this.graphApiVersion;
  }

  public async sendRequest(options: GraphRequestOptions): Promise<any> {
    const apiVersion = options.apiVersion || this.getApiVersion();
    const qs = options.qs || {};
    let uri = 'https://graph.facebook.com';

    if (!options.path) {
      throw new Error('Valid "path" property required');
    }

    if (!qs.access_token) {
      const pageToken = this.pageToken;
      if (!pageToken) {
        throw new Error('Page token is not set');
      }
      qs.access_token = pageToken;
    }

    if (apiVersion) {
      uri += `/${apiVersion}`;
    }

    uri += `${options.path}`;

    let method: string;
    if (options.method) {
      method = options.method.toUpperCase();
    } else if (options.payload) {
      method = 'POST';
    } else {
      method = 'GET';
    }

    const axiosConfig: AxiosRequestConfig = {
      url: uri,
      method: method as any,
      params: qs,
      responseType: 'json',
    };

    if (options.payload) {
      if (typeof options.payload !== 'object') {
        throw new Error('Invalid request payload');
      }
      axiosConfig.data = options.payload;
    }

    return await lastValueFrom(
      this.httpService.request(axiosConfig).pipe(
        map((response) => response.data),
        catchError((error) => {
          if (error.response && error.response.data) {
            return throwError(() => error.response.data);
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  //TODO : typage du message
  public async sendMessage(message: any, phoneNumberId: string) {
    return await this.sendRequest({
      path: `/${phoneNumberId}/messages`,
      payload: message,
      //formData,
    });
  }

}
