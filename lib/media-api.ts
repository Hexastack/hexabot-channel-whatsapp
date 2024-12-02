/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { GraphApi } from './graph-api';

export class MediaAPI {
  constructor(private readonly graphRequest: GraphApi) {
    this.graphRequest = graphRequest;
  }

  //TODO: fix return typage
  public async getMediaUrl(mediaId: string): Promise<string> {
    if (!mediaId) {
      throw new Error('Media ID is required');
    }
    const path = `/${mediaId}`;

    // Send the GET request to retrieve media URL
    const mediaData = await this.graphRequest.sendRequest({
      path,
      method: 'GET',
    });
    if (mediaData && mediaData.url) {
      return mediaData.url;
    }
    throw new Error('Failed to retrieve media URL');
  }
}
