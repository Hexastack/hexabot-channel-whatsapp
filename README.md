# Hexabot WhatsApp Channel Extension

`hexabot-channel-whatsapp` adds official Meta WhatsApp Cloud API support to Hexabot v3. It is a first-class v3 channel extension discovered by `@hexabot-ai/api` and registered with the channel name `whatsapp`.

[Hexabot](https://hexabot.ai/) is an open-source chatbot and agent builder for multi-channel, multilingual conversational automation. Learn more in the [Hexabot repository](https://github.com/Hexastack/Hexabot).

## Features

- Secure Meta webhook verification with `hub.challenge` support.
- Request signature verification with `x-hub-signature-256` and SHA-1 fallback.
- Inbound text, contacts, interactive replies, button replies, list replies, locations, media, delivery/read statuses, and failed-status events.
- Outbound text, reply buttons, CTA URL buttons, media by public URL, lists, and carousel-as-list messages.
- Media metadata lookup and authenticated media download through the WhatsApp Cloud API.
- Typing indicator support through WhatsApp read receipts with `typing_indicator`.
- Optional filtering by WhatsApp Business Account ID and phone number ID.
- v3 thread rollover support through `thread_inactivity_hours`.

## Installation

Install the package in the same workspace or deployment that runs `@hexabot-ai/api`:

```sh
npm add hexabot-channel-whatsapp
```

Restart the Hexabot API after installation. The channel appears with the name `whatsapp`.

For local development inside this package:

```sh
npm install
npm test
npm run typecheck
npm run build
```

## Prerequisites

Before configuring the channel, make sure you have:

- a Facebook account with access to [Meta for Developers](https://developers.facebook.com/);
- a Meta developer app with the WhatsApp product enabled;
- a WhatsApp Business Account connected to the app;
- a WhatsApp Business phone number, or the Meta test phone number during development;
- a Cloud API access token with the required WhatsApp messaging permissions;
- your Meta app secret from **App Settings > Basic**;
- a public HTTPS URL for the Hexabot API. For local testing, expose the API with a tunnel such as ngrok;
- a Hexabot project running v3 with this extension installed;
- Hexabot credentials created for the app secret, access token, and webhook verify token.

This extension targets the official Meta WhatsApp Cloud API. It does not use WhatsApp Web, Baileys, WAHA, Evolution API, or another provider.

## Meta App Setup

### 1. Create or Select a Meta App

1. Open [Meta for Developers](https://developers.facebook.com/) and sign in.
2. Complete developer registration if Meta asks for it.
3. From **My Apps**, create a new app or open an existing app.
4. For a new app, choose an app type that supports WhatsApp, usually **Business**.
5. Open **App Settings > Basic** and copy the **App Secret**. Store it as a Hexabot credential.

### 2. Add the WhatsApp Product

1. In the Meta app dashboard, add the **WhatsApp** product.
2. Connect or create a Meta Business Account when prompted.
3. Open **WhatsApp > API Setup**.
4. Note the **WhatsApp Business Account ID** and **Phone Number ID**. These are optional in Hexabot, but strongly recommended when one app owns multiple assets.

### 3. Add or Select a Phone Number

For development, Meta provides a test phone number. For production, connect and verify a real WhatsApp Business phone number.

1. In **WhatsApp > API Setup**, open the phone number controls.
2. Add a recipient number for test messages if you are using the test phone.
3. Send a test message from Meta to confirm that the number is working.
4. Keep the **Phone Number ID** available for the Hexabot source settings.

### 4. Create an Access Token

For development, the temporary token in **WhatsApp > API Setup** is enough to test the channel. For production, create a permanent token through a Meta system user or another approved Meta access-token flow.

The token must be able to send WhatsApp messages and retrieve media for the configured phone number. Store the token as a Hexabot credential and reference that credential in the source `access_token` setting.

### 5. Create a Verify Token

Choose a secure random string. Store it as a Hexabot credential and use the same value in Meta when configuring the webhook.

The verify token is not sent as a request signature. It is only used during Meta's GET webhook challenge.

## Hexabot Source Configuration

Create one Hexabot source for each WhatsApp Business phone number you want to connect.

Required settings:

- `app_secret`: credential containing the Meta app secret used to verify webhook signatures.
- `access_token`: credential containing the WhatsApp Cloud API access token.
- `verify_token`: credential containing the webhook verification token configured in Meta.

Optional settings:

- `business_account_id`: WhatsApp Business Account ID. When set, webhook entries for other WABAs are ignored.
- `phone_number_id`: WhatsApp Business phone number ID. When set, webhook events for other phone numbers are ignored and outbound messages can fall back to this value.
- `graph_api_version`: Meta Graph API version used for Cloud API requests. Defaults to `v25.0`.
- `thread_inactivity_hours`: controls Hexabot v3 thread rollover. Defaults to `24`.

Save the source before verifying the webhook in Meta.

## Webhook Configuration

Use the WhatsApp source webhook endpoint in Meta:

```txt
https://<your-domain>/api/webhook/<sourceRef>
```

If your production deployment proxies `/api` differently, use the public URL that reaches the Hexabot API webhook route.

In the Meta app dashboard:

1. Open **WhatsApp > Configuration**.
2. Set the **Callback URL** to the source webhook endpoint.
3. Set the **Verify Token** to the value stored in the source `verify_token` credential.
4. Click **Verify and Save**.
5. Subscribe to the `messages` webhook field.

After saving, send a WhatsApp message to the connected phone number and confirm that a subscriber and message appear in Hexabot.

## Supported Messages

Inbound support:

- text messages become Hexabot text events;
- contact cards are serialized into a text event;
- WhatsApp button replies, interactive button replies, and list replies become postback events;
- locations become location events;
- image, audio, video, document, and sticker messages become attachment events;
- delivered statuses become delivery events;
- read statuses become read events;
- failed statuses become error events;
- sent, deleted, unsupported, and unknown channel-only events are ignored.

Outbound support:

- text messages are sent as WhatsApp text messages;
- quick replies and postback buttons are sent as WhatsApp interactive reply buttons;
- WhatsApp reply buttons are capped at 3 buttons;
- one URL button is sent as an interactive CTA URL message;
- mixed URL and postback buttons, or multiple URL buttons in one message, are rejected because WhatsApp Cloud API does not support that shape;
- lists and carousels are sent as WhatsApp interactive lists with up to 10 rows;
- oversized list/carousel messages reserve the final row for a `VIEW_MORE` pagination postback;
- attachment messages are sent as image, audio, video, or document messages by public URL.

Attachment quick replies are intentionally rejected in this first v3 release because WhatsApp does not support combining media messages with reply buttons in the same way Messenger does.

## Typing Indicators

When a Hexabot outgoing envelope uses `options.typing`, the channel sends a WhatsApp read receipt for the inbound message with:

```json
{
  "status": "read",
  "typing_indicator": {
    "type": "text"
  }
}
```

The handler waits for the requested delay, capped at 25 seconds, then sends the response.

## Media Handling

Inbound media events carry WhatsApp media IDs. When Hexabot downloads the attachment, the channel:

1. retrieves media metadata from the Graph API;
2. downloads the media URL with Bearer authentication;
3. maps the response stream and headers into Hexabot's attachment file shape.

Outbound media must use a public URL reachable by Meta. Private Hexabot file URLs or localhost URLs will not work unless your deployment exposes them publicly over HTTPS.

## Limitations

- Approved WhatsApp template messages are not implemented in this first v3 release. Standard Hexabot outgoing messages cover inbound-triggered session conversations.
- Multiple URL buttons in one message are not supported by WhatsApp Cloud API. Create channel-specific flows that send separate CTA URL messages if you need several links.
- WhatsApp persistent menus, greeting text, and Get Started behavior are Messenger concepts and are not part of this channel.
- The channel relies on raw request bodies for webhook signature verification. Ensure the Hexabot API keeps `req.rawBody` available for webhook routes.

## Development

Common commands:

```sh
npm test
npm run typecheck
npm run build
npm run build:publish
npm pack --dry-run
```

`build:publish` removes generated output, builds `dist`, and verifies that the package export files exist.

## Publishing

The package keeps the v2 release workflow commands:

```sh
npm run release:patch
npm run release:minor
```

Both commands create an npm version commit and tag, then push `main` with tags. The GitHub Actions release workflow builds and publishes the package to npm when the package version is not already published.

Required repository secret:

- `NPM_TOKEN`: npm automation token with publish access for `hexabot-channel-whatsapp`.

## Contributing

Contributions are welcome. Please read [How to contribute to Hexabot](https://github.com/Hexastack/Hexabot/blob/main/CONTRIBUTING.md) before submitting changes.

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://github.com/Hexastack/Hexabot/blob/main/CODE_OF_CONDUCT.md)

Join the Hexabot community on [Discord](https://discord.gg/rNb9t2MFkG).

## License

This software is licensed under the Fair Core License, FCL-1.0-ALv2. Full terms are available in [LICENSE.md](./LICENSE.md).
