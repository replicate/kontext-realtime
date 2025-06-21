# Realtime Kontext

Create and edit images using your voice.

This is a realtime demo of voice-powered function calling
using [Cloudflare Workers](https://developers.cloudflare.com), [Replicate](https://replicate.com), and the [OpenAI Realtime API](https://platform.openai.com/docs/api-reference/realtime).

It generates images using [Flux Schnell](https://replicate.com/black-forest-labs/flux-schnell) and edits them using [Flux Kontext Pro](https://replicate.com/black-forest-labs/flux-kontext-pro).

Created from this guide and template: https://replicate.com/docs/guides/openai-realtime

## Wishlist

- [ ] Generate a video that combines all the images
- [ ] Take the border off the audio visualizer
- [ ] Tuck the audio element away in the corner of the screen, or use a library to style it
- [ ] Change the default voice?
- [ ] Turn example into multiple examples…
- [ ] Drag and drop to upload a photo
- [ ] Create a Replicate model that converts images to video

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
