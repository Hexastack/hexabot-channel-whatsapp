/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { WhatsApp } from '../types';

import { GraphApi } from './graph-api';

export class MediaAPI {
  constructor(private readonly graphApi: GraphApi) {}

  //TODO: fix return typage
  public async getMediaUrl(
    mediaId: string,
    phoneNumberId: string,
  ): Promise<WhatsApp.MediaMetadata> {
    if (!mediaId) {
      throw new Error('Media ID is required');
    }
    const path = `/${mediaId}?phone_number_id=${phoneNumberId}`;

    try {
      // Send the GET request to retrieve media URL
      return await this.graphApi.sendRequest<WhatsApp.MediaMetadata>({
        path,
        method: 'GET',
      });

      // if (mediaData && mediaData.url) {
      //   // Extract and adjust the URL format (unescape it)
      //   const formattedUrl = decodeURIComponent(mediaData.url); // Unescapes the URL
      //   return formattedUrl;
      // } else {
      //   throw new Error('URL not found in the response');
      // }
    } catch (error) {
      throw new Error('Failed to retrieve media URL');
    }
  }
}
