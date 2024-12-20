/*
 * Copyright © 2024 Hexastack. All rights reserved.
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:
 * 1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
 * 2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).
 */

import { Whatsapp } from '../types';

import { GraphApi } from './graph-api';

export class ProfileAPI {
  constructor(private readonly graphRequest: GraphApi) {
    this.graphRequest = graphRequest;
  }

  public async getUserProfile(
    phoneNumberID: string,
  ): Promise<Whatsapp.WhatsappBusinessAccountData> {
    // https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/
    // https://developers.facebook.com/docs/whatsapp/cloud-api/reference/business-profiles/
    if (!phoneNumberID) {
      throw new Error('Phone number ID is required');
    }

    const path = `/${phoneNumberID}`;
    const profileData = await this.graphRequest.sendRequest({
      path,
      method: 'GET',
    });

    if (profileData) {
      return profileData;
    } else {
      throw new Error('Failed to retrieve user profile data');
    }
  }
}
