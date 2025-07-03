// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('OpenAI Realtime API Worker', () => {
	it('serves the HTML page for root path (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		const text = await response.text();
		expect(text).toContain('<!DOCTYPE html>');
		expect(text).toContain('OpenAI Realtime API with Cloudflare and Replicate');
		expect(response.status).toBe(200);
	});

	it('serves the HTML page for root path (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		const text = await response.text();
		expect(text).toContain('<!DOCTYPE html>');
		expect(text).toContain('OpenAI Realtime API with Cloudflare and Replicate');
		expect(response.status).toBe(200);
	});

	it('returns 401 for rtc-connect without auth header', async () => {
		const request = new IncomingRequest('http://example.com/rtc-connect', {
			method: 'POST',
			body: 'test body'
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
		const json = await response.json();
		expect(json.error).toBe('Missing OpenAI API key in Authorization header');
	});

	it('returns 401 for generate-image without auth header', async () => {
		const request = new IncomingRequest('http://example.com/generate-image', {
			method: 'POST',
			body: 'test prompt'
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
		const json = await response.json();
		expect(json.error).toBe('Missing Replicate API token in Authorization header');
	});
});
