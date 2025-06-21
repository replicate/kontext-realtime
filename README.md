# Getting started with the OpenAI Realtime API

This is a real-time demo app that lets you run functions in your browser using your voice.

It's powered by [OpenAI's Realtime API](https://platform.openai.com/docs/guides/realtime) over WebRTC, runs on Cloudflare Workers, and uses Replicate models to generate images.

Check out the guide to running this app: [replicate.com/docs/guides/openai-realtime](https://replicate.com/docs/guides/openai-realtime)

![screenshot](https://github.com/user-attachments/assets/d7d04594-8bbb-4687-b801-3ba8e19c85de)

## Prerequisites

Here's what you'll need to build this project:

- An [OpenAI account](https://platform.openai.com/signup). No special plan is required to use the Realtime API Beta.
- A [Cloudflare account](https://www.cloudflare.com/plans/free/). You can sign up and [run workers for free](https://workers.cloudflare.com/).
- A [Replicate account](https://replicate.com/).
- [Node.js 20](https://nodejs.org/en/download/prebuilt-installer) or later.
- [Git](https://chatgpt.com/share/673d65dc-8e50-8003-8ce2-4bc7053d0e3a) for cloning the project from GitHub.

## Development

- Create a Replicate API token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- Create an OpenAI API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

Copy [.dev.vars.example](./.dev.vars.example) to `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your OpenAI API key and Replicate API token:

```bash
OPENAI_API_KEY=...
REPLICATE_API_TOKEN=...
```

Install dependencies

```bash
npm install
```

Run local server

```bash
npm run dev
```

## Deploy

Upload your secrets

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put REPLICATE_API_TOKEN
```

```bash
npm run deploy
```
