import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler, validEmail, checkEmail, SITE_ORIGIN} from './worker.mjs';
const sample = 'test@example.invalid';
function request(data = {email: sample, permitted: true}, extra = {}) {
  return new Request(SITE_ORIGIN + '/api/lookup', {method: 'POST', headers: {'oai-authenticated-user-id': 'test-user', Origin: SITE_ORIGIN, 'Content-Type': 'application/json', ...extra}, body: JSON.stringify(data)});
}
test('account signal matches the upstream GHunt method without returning cookies', async () => {
  let called;
  const handler = createHandler({fetcher: async (...args) => {called = args; return new Response(null, {status: 204, headers: {'set-cookie': 'example=fixture'}});}});
  const response = await handler(request());
  const result = await response.json();
  assert.equal(result.status, 'signal_found');
  assert.equal(response.headers.has('set-cookie'), false);
  assert.equal(new URL(called[0]).hostname, 'mail.google.com');
  assert.equal(called[1].redirect, 'manual');
});
test('missing signal and rejected upstream responses remain distinct', async () => {
  assert.equal((await checkEmail(sample, async () => new Response(null, {status: 204}))).status, 'no_signal');
  for (const status of [200, 302, 403, 429, 500]) assert.equal((await checkEmail(sample, async () => new Response(null, {status}))).status, 'unknown');
});
test('authentication, origin, and consent checks happen before upstream traffic', async () => {
  let calls = 0;
  const handler = createHandler({fetcher: async () => {calls++; return new Response(null, {status: 204});}});
  assert.equal((await handler(request(undefined, {'oai-authenticated-user-id': ''}))).status, 401);
  assert.equal((await handler(request(undefined, {Origin: 'https://untrusted.example'}))).status, 403);
  assert.equal((await handler(request({email: sample, permitted: false}))).status, 400);
  assert.equal(calls, 0);
});
test('oversized and invalid email requests do not reach upstream', async () => {
  let calls = 0;
  const handler = createHandler({fetcher: async () => {calls++;}});
  assert.equal((await handler(request({email: 'a'.repeat(2000), permitted: true}))).status, 400);
  for (const email of ['bad', '..a@example.com', 'a@-example.com', 'a@ex ample.com', 'a@example.com\n']) {
    assert.equal(validEmail(email), false);
    assert.equal((await handler(request({email, permitted: true}))).status, 400);
  }
  assert.equal(calls, 0);
});
test('per-isolate backoff and cooldown recovery', async () => {
  let now = 100000;
  const handler = createHandler({clock: () => now, fetcher: async () => new Response(null, {status: 204})});
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429);
  now += 10000;
  assert.equal((await handler(request())).status, 200);
});
test('errors and timeouts do not become negative account results', async () => {
  const handler = createHandler({fetcher: async () => {throw new Error('private diagnostic');}});
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('private diagnostic'), false);
});
test('authenticated pages, missing paths and API status', async () => {
  const handler = createHandler({assets: {'/': {body: '<h1>GHunt</h1>', type: 'text/html'}}});
  const get = path => new Request(SITE_ORIGIN + path, {headers: {'oai-authenticated-user-id': 'test-user'}});
  assert.equal((await handler(get('/'))).status, 200);
  assert.equal((await handler(get('/missing'))).status, 404);
  assert.equal((await (await handler(get('/api/status'))).json()).mode, 'google-registration');
});
