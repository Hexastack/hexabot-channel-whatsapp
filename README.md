# Hexabot WhatsApp Channel Extension

The **WhatsApp Channel Extension** for Hexabot enables seamless integration of your Hexabot chatbot with WhatsApp-related business assets, such as WhatsApp Business Accounts and message templates.

[Hexabot](https://hexabot.ai/) is an open-source chatbot/agent solution that allows users to create and manage AI-powered, multi-channel, and multilingual chatbots with ease. Learn more about Hexabot on the [official GitHub repository](https://github.com/Hexastack/Hexabot).

---

## Features

- **Media Messages**: Send files, images, and locations.
- **Interactive Messages**: Simplify responses with:
  - **Quick Replies**: Offer predefined response options for faster interactions.
  - **Attachments**: Enrich conversations with media (images, videos, files, etc.).
  - **List Messages**: Present users with selectable options for structured responses.

---

## Prerequisites

Before getting started, ensure you have the following:

- A **Facebook account**.
- A **Meta Developer Account**: [Register here](https://developers.facebook.com/docs/development/register).
- A **Business App**: [Create one here](https://developers.facebook.com/docs/development/create-an-app).
- Basic knowledge of **APIs** and **web development** (optional but helpful).
- A **server** to host your chatbot (local servers can use [ngrok](https://ngrok.com/) or similar API gateways for testing).
- **HTTPS** enabled on your server (required for webhooks).
- A cloned copy of [Hexabot](https://github.com/hexastack/hexabot) on your local machine.

---

## Setup Guide

### Step 1: Create a Meta Developer Account

1. **Access Meta for Developers**:
   - Visit [Meta for Developers](https://developers.facebook.com/).
2. **Log In**:
   - Click **"Get Started"** and log in using your Facebook credentials.
3. **Register as a Developer**:
   - Accept the **Meta Platform Policies**.
   - Complete any additional verification steps, such as phone verification.
4. **Access the Developer Dashboard**:
   - After registering, you’ll be redirected to the **Developer Dashboard**, where you can manage your apps.

---

### Step 2: Add the WhatsApp Product to Your App

1. **Add WhatsApp to Your App**:
   - If creating a new app, select **"Add products to your app"**.
   - For existing apps, navigate to your app on the **My Apps** screen.
2. **Attach a Meta Business Account (MBA)**:
   - You’ll be prompted to attach an MBA. If you don’t have one, follow the prompts to create it.

---

### Step 3: Add a Recipient Number

1. **Navigate to WhatsApp API Setup**:
   - In the App Dashboard, go to **WhatsApp > API Setup**.
2. **Add a Phone Number**:
   - Under **Send and Receive Messages**, click **Manage Phone Number List** and add a valid WhatsApp number.

---

### Step 4: Generate an Access Token

1. **Select Your App**:
   - In the App Dashboard, go to **WhatsApp > API Setup**.
2. **Generate Token**:
   - Click **"Generate Token"** to create a temporary token.
   - **Copy and store** the token securely. This token is required for your backend.

---

### Step 5: Set Up a Webhook

Webhooks enable real-time updates from WhatsApp to your chatbot.

1. **Provide a Webhook URL**:
   - In **WhatsApp > Configuration**, enter your server's webhook URL.
     - Example: `https://your-domain.com/webhook/whatsapp`.
2. **Set a Verification Token**:
   - Create a secure token to verify the webhook.
3. **Choose Subscription Fields**:
   - Select events to subscribe to, such as **messages**.
4. **Verify and Save**:
   - Meta will send a verification request to your callback URL. Ensure your server responds correctly to complete the setup.

---

## Configuration

To configure the WhatsApp Channel Extension, you’ll need the following:

### 1. Webhook Verification Token
- **Description**: A secure token used by WhatsApp to verify your webhook.
- **Setup**:
  - Generate a token and configure it in both Hexabot and WhatsApp settings.

### 2. WhatsApp Access Token
- **Description**: Grants your app access to the WhatsApp Business API.
- **Setup**:
  - In the Developer Dashboard, go to **WhatsApp > Configuration**.
  - Generate the token and add it to your Hexabot configuration.

### 3. Facebook App Secret
- **Description**: A secret key for securing communication between WhatsApp and your chatbot.
- **Setup**:
  - Navigate to **App Settings > Basic** in the Developer Dashboard to retrieve the **App Secret**.
  - Store this value securely.

---

## Usage

Once the extension is installed and configured, your Hexabot chatbot will be available on WhatsApp. Users can interact with your bot, leveraging features such as:

- Media messages
- Quick replies
- Interactive lists

---

## Contributing

We welcome contributions from the community! Whether you want to report a bug, suggest new features, or submit a pull request, your input is valuable to us.

Please refer to our contribution policy first : [How to contribute to Hexabot](https://github.com/Hexastack/Hexabot/blob/main/CONTRIBUTING.md)

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://github.com/Hexastack/Hexabot/blob/main/CODE_OF_CONDUCT.md)

Feel free to join us on [Discord](https://discord.gg/rNb9t2MFkG)

## License

This software is licensed under the GNU Affero General Public License v3.0 (AGPLv3) with the following additional terms:

1. The name "Hexabot" is a trademark of Hexastack. You may not use this name in derivative works without express written permission.
2. All derivative works must include clear attribution to the original creator and software, Hexastack and Hexabot, in a prominent location (e.g., in the software's "About" section, documentation, and README file).

---

*Happy Chatbot Building!*

