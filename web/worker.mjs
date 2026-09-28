// AGPL-3.0: registration method adapted from ghunt/helpers/gmail.py.
export const SITE_ORIGIN = 'https://ghunt-project-guide.mshipe2022.chatgpt.site';
const securityHeaders = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'",
  'X-Robots-Tag': 'noindex, nofollow'
};
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {status, headers: {...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', ...headers}});
}
export function validEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || value.length < 3 || value !== value.trim()) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !/^[a-zA-Z0-9._%+\-]+$/.test(local)) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && /^[a-zA-Z]{2,63}$/.test(labels.at(-1)) && labels.every(label => label.length > 0 && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-') && /^[a-zA-Z0-9-]+$/.test(label));
}
async function readBody(request) {
  if (!request.body) throw new Error('Invalid request');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1024) { await reader.cancel(); throw new Error('Request too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
}
export async function checkEmail(email, fetcher = fetch) {
  const url = new URL('https://mail.google.com/mail/gxlu');
  url.searchParams.set('email', email);
  const response = await fetcher(url.toString(), {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000),
    headers: {'Accept': '*/*'}
  });
  if (response.status !== 204) {
    await response.body?.cancel();
    return {status: 'unknown', upstreamStatus: response.status};
  }
  return {status: response.headers.has('set-cookie') ? 'signal_found' : 'no_signal'};
}
export function createHandler({assets = {}, fetcher = fetch, clock = Date.now} = {}) {
  // Best-effort per-isolate backoff; private Site access is the access boundary.
  const recent = new Map();
  return async function handle(request) {
    const user = request.headers.get('oai-authenticated-user-id');
    if (!user) return json({error: 'Sign in to this private site to continue.'}, 401);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/status') return json({mode: 'google-registration', profileSearch: 'not_connected'});
    if (request.method === 'POST' && path === '/api/lookup') {
      if (request.headers.get('origin') !== SITE_ORIGIN) return json({error: 'This request must come from the private site.'}, 403);
      if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({error: 'Send JSON.'}, 415);
      let body;
      try { body = await readBody(request); } catch { return json({error: 'Invalid or oversized request.'}, 400); }
      if (!body || !validEmail(body.email)) return json({error: 'Enter a valid email address.'}, 400);
      if (body.permitted !== true) return json({error: 'Confirm you own the address or have permission to check it.'}, 400);
      const now = clock();
      for (const [key, time] of recent) if (now - time >= 10000) recent.delete(key);
      if (recent.has(user)) return json({error: 'Wait ten seconds before checking another address.'}, 429, {'Retry-After': '10'});
      recent.set(user, now);
      try {
        const checked = await checkEmail(body.email, fetcher);
        if (checked.status === 'unknown') return json({error: 'Google did not provide a usable response. Please try again later.'}, 502);
        return json({status: checked.status, checkedAt: new Date(clock()).toISOString()});
      } catch { return json({error: 'Google could not be reached in time. Please try again later.'}, 502); }
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (assets[path]) {
        const {body, type} = assets[path];
        return new Response(request.method === 'HEAD' ? null : body, {headers: {...securityHeaders, 'Content-Type': type}});
      }
      return json({error: 'Page not found.'}, 404);
    }
    return json({error: 'Method not allowed.'}, 405, {'Allow': 'GET, HEAD, POST'});
  };
}
