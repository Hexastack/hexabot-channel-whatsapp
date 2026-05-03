/*
 * Hexabot - Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Readable } from "stream";

import { AttachmentFile } from "@hexabot-ai/api";
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";

import { WhatsAppResolvedChannelSettings } from "../settings.schema";
import { WhatsApp } from "../types";

const GRAPH_API_BASE_URL = "https://graph.facebook.com";

@Injectable()
export class WhatsAppGraphApiService {
  constructor(private readonly httpService: HttpService) {}

  private buildUrl(
    settings: Pick<WhatsAppResolvedChannelSettings, "graph_api_version">,
    path: string,
  ): string {
    const version = settings.graph_api_version.replace(/^\/+|\/+$/g, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return `${GRAPH_API_BASE_URL}/${version}${normalizedPath}`;
  }

  private async request<T>(
    settings: WhatsAppResolvedChannelSettings,
    config: AxiosRequestConfig,
  ): Promise<T> {
    if (!settings.access_token) {
      throw new Error("WhatsApp access token is required");
    }

    const response = await firstValueFrom(
      this.httpService.request<T>({
        ...config,
        headers: {
          Authorization: `Bearer ${settings.access_token}`,
          ...(config.headers ?? {}),
        },
      }),
    );

    return response.data;
  }

  async sendMessage(
    settings: WhatsAppResolvedChannelSettings,
    phoneNumberId: string,
    payload: WhatsApp.SendMessagePayload,
  ): Promise<WhatsApp.SendMessageResponse> {
    return await this.request<WhatsApp.SendMessageResponse>(settings, {
      method: "POST",
      url: this.buildUrl(settings, `/${phoneNumberId}/messages`),
      data: payload,
    });
  }

  async sendTypingIndicator(
    settings: WhatsAppResolvedChannelSettings,
    phoneNumberId: string,
    messageId: string,
  ): Promise<WhatsApp.ReadReceiptResponse> {
    return await this.request<WhatsApp.ReadReceiptResponse>(settings, {
      method: "POST",
      url: this.buildUrl(settings, `/${phoneNumberId}/messages`),
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: {
          type: "text",
        },
      } satisfies WhatsApp.TypingIndicatorPayload,
    });
  }

  async getMediaMetadata(
    settings: WhatsAppResolvedChannelSettings,
    mediaId: string,
    phoneNumberId?: string,
  ): Promise<WhatsApp.MediaMetadata> {
    if (!mediaId) {
      throw new Error("WhatsApp media id is required");
    }

    return await this.request<WhatsApp.MediaMetadata>(settings, {
      method: "GET",
      url: this.buildUrl(settings, `/${mediaId}`),
      params: phoneNumberId
        ? {
            phone_number_id: phoneNumberId,
          }
        : undefined,
    });
  }

  async downloadMediaUrl(
    settings: WhatsAppResolvedChannelSettings,
    url: string,
    name?: string,
  ): Promise<AttachmentFile> {
    if (!settings.access_token) {
      throw new Error("WhatsApp access token is required");
    }

    const response = await firstValueFrom(
      this.httpService.get<Readable>(url, {
        responseType: "stream",
        headers: {
          Authorization: `Bearer ${settings.access_token}`,
        },
      }),
    );

    return this.toAttachmentFile(response, name);
  }

  async downloadMedia(
    settings: WhatsAppResolvedChannelSettings,
    media: WhatsApp.WebhookMedia,
    phoneNumberId?: string,
    name?: string,
  ): Promise<AttachmentFile> {
    const metadata = await this.getMediaMetadata(
      settings,
      media.id,
      phoneNumberId,
    );
    const attachment = await this.downloadMediaUrl(
      settings,
      metadata.url,
      name,
    );

    return {
      ...attachment,
      size: this.resolveMediaSize(metadata, attachment.size),
      type: metadata.mime_type ?? media.mime_type ?? attachment.type,
    };
  }

  private resolveMediaSize(
    metadata: WhatsApp.MediaMetadata,
    fallbackSize: number,
  ): number {
    const size = Number(metadata.file_size ?? fallbackSize);

    return Number.isFinite(size) ? size : fallbackSize;
  }

  private toAttachmentFile(
    response: AxiosResponse<Readable>,
    name?: string,
  ): AttachmentFile {
    const contentType = String(
      response.headers["content-type"] ?? "application/octet-stream",
    ).split(";")[0];
    const contentLength = Number(response.headers["content-length"] ?? 0);

    return {
      file: response.data,
      name,
      size: Number.isFinite(contentLength) ? contentLength : 0,
      type: contentType,
    };
  }
}

export default WhatsAppGraphApiService;
