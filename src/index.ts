import { Hono } from 'hono';
import Replicate from 'replicate';

const app = new Hono<{ Bindings: Env }>();

const DEFAULT_INSTRUCTIONS = `You are helpful and have some tools installed.`;

// Serve the HTML page for the root path
app.get('/', (c) => {
	return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>OpenAI Realtime API with Cloudflare and Replicate</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
	<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
	<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
	<script src="/app.js" type="text/babel"></script>
	<style>
		/* Set default text color */
		:root {
			--text-color: #111827; /* text-gray-900 */
			--background-color: #f9fafb; /* gray-50 */
		}
		body {
			color: var(--text-color);
			background-color: var(--background-color);
		}
		blockquote {
			border-color: color-mix(in srgb, var(--text-color) 10%, transparent);
		}
		.visualizer-canvas {
			border-color: color-mix(in srgb, var(--text-color) 20%, transparent);
		}
	</style>
</head>
<body class="min-h-screen font-sans text-lg">
	<div id="root"></div>
</body>
</html>`);
});

app.post('/rtc-connect', async (c) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing OpenAI API key in Authorization header' }, 401);
	}
	const openaiKey = authHeader.replace('Bearer ', '').trim();
	const body = await c.req.text();
	const url = new URL('https://api.openai.com/v1/realtime');
	url.searchParams.set('model', 'gpt-4o-realtime-preview-2024-12-17');
	url.searchParams.set('instructions', DEFAULT_INSTRUCTIONS);
	url.searchParams.set('voice', 'ash');

	const response = await fetch(url.toString(), {
		method: 'POST',
		body,
		headers: {
			Authorization: `Bearer ${openaiKey}`,
			'Content-Type': 'application/sdp',
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${response.status} - ${error}`);
	}
	const sdp = await response.text();
	return c.body(sdp, {
		headers: {
			'Content-Type': 'application/sdp',
		},
	});
});


app.post('/generate-image', async (c) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing Replicate API token in Authorization header' }, 401);
	}
	const replicateToken = authHeader.replace('Bearer ', '').trim();
	const replicate = new Replicate({ auth: replicateToken });
	const model = 'black-forest-labs/flux-schnell';
	const prompt = await c.req.text();
	const output = await replicate.run(model, {
	  input: {
		prompt,
		image_format: 'webp',
	  }
	});
	  
	// Some models return an array of output files, others just a single file.
	const outputImageUrl = Array.isArray(output) ? output[0] : output
   
	return c.body(outputImageUrl, {
		headers: {
			'Content-Type': 'image/webp',
		},
	});
});

app.post('/edit-image', async (c) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing Replicate API token in Authorization header' }, 401);
	}
	const replicateToken = authHeader.replace('Bearer ', '').trim();
	const replicate = new Replicate({ auth: replicateToken });
	const { prompt, imageUrl, model } = await c.req.json();

	if (!prompt || !imageUrl || !model) {
		return c.json({ error: 'prompt, imageUrl, and model are required' }, 400);
	}

	const input = {
		prompt,
		input_image: imageUrl,
		aspect_ratio: 'match_input_image',
		safety_tolerance: 2,
	}

	const output = (await replicate.run(model, { input })) as unknown as string;

	// Some models return an array of output files, others just a single file.
	const outputImageUrl = Array.isArray(output) ? output[0] : output

	return c.body(outputImageUrl, {
		headers: {
			'Content-Type': 'image/webp',
		},
	});
});

app.post('/enhance-image', async (c) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing Replicate API token in Authorization header' }, 401);
	}
	const replicateToken = authHeader.replace('Bearer ', '').trim();
	const replicate = new Replicate({ auth: replicateToken });
	const model = 'topazlabs/image-upscale';
	const { imageUrl } = await c.req.json();

	if (!imageUrl) {
		return c.json({ error: 'imageUrl is required' }, 400);
	}

	const input = {
		image: imageUrl
	};

	const output = (await replicate.run(model, { input })) as unknown;

	// Some models return an array of output files, others just a single file.
	const outputImageUrl = Array.isArray(output) ? output[0] : output

	return c.body(outputImageUrl, {
		headers: {
			'Content-Type': 'text/webp',
		},
	});
});

export default app;
