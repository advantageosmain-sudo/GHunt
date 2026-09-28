const form = document.querySelector('#lookup-form');
const emailInput = document.querySelector('#email');
const consent = document.querySelector('#consent');
const submit = document.querySelector('#submit');
const status = document.querySelector('#status');
const connection = document.querySelector('#connection');
const result = document.querySelector('#result');
const title = document.querySelector('#result-title');
const description = document.querySelector('#result-description');
const details = document.querySelector('#details');
const clear = document.querySelector('#clear');
let ready = false;
let busy = false;

async function connect() {
  try {
    const response = await fetch('/api/status', {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok || data.mode !== 'google-registration') throw new Error('Service unavailable');
    ready = true;
    connection.textContent = 'Email check connected';
    status.textContent = 'Ready to check.';
    submit.disabled = false;
  } catch {
    connection.textContent = 'Connection unavailable';
    status.textContent = 'Reload the page to reconnect. You must be signed in to this private site.';
  }
}

async function lookup(address, permitted) {
  if (!ready) throw new Error('The lookup service is not connected.');
  if (busy) throw new Error('A check is already running.');
  if (!permitted) throw new Error('Confirm that you own the address or have permission to check it.');
  emailInput.value = address;
  consent.checked = permitted;
  if (!emailInput.checkValidity()) throw new Error('Enter a valid email address.');
  busy = true;
  submit.disabled = true;
  clear.hidden = true;
  details.hidden = true;
  result.setAttribute('aria-busy', 'true');
  title.textContent = 'Checking…';
  description.textContent = 'Waiting for Google’s registration signal.';
  status.textContent = 'Checking the address…';
  try {
    const response = await fetch('/api/lookup', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: address.trim(), permitted: true}),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The check could not finish. Please try again.');
    const labels = {
      signal_found: ['Google returned an account signal', 'This suggests the address is registered with Google. It does not verify the person behind it.'],
      no_signal: ['No account signal returned', 'Google did not return the signal GHunt checks for. This does not prove an account is absent.']
    };
    if (!labels[data.status]) throw new Error('Google’s response was inconclusive. Try again later.');
    [title.textContent, description.textContent] = labels[data.status];
    document.querySelector('#result-email').textContent = address.trim();
    document.querySelector('#result-time').textContent = new Date(data.checkedAt).toLocaleString();
    details.hidden = false;
    status.textContent = 'Check finished. Your result is not saved.';
    return {status: data.status, checkedAt: data.checkedAt};
  } catch (error) {
    title.textContent = 'Check could not finish';
    const message = error.name === 'TimeoutError' ? 'The request timed out. Try again in a moment.' : error.message;
    description.textContent = message;
    status.textContent = message;
    throw error;
  } finally {
    busy = false;
    result.setAttribute('aria-busy', 'false');
    submit.disabled = !ready;
    clear.hidden = false;
    title.focus();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  lookup(emailInput.value.trim(), consent.checked).catch(() => {});
});
clear.addEventListener('click', () => {
  details.hidden = true;
  clear.hidden = true;
  document.querySelector('#result-email').textContent = '';
  document.querySelector('#result-time').textContent = '';
  title.textContent = 'Ready when you are';
  description.textContent = 'Enter an address to run a single check. Your result will appear here.';
  form.reset();
  status.textContent = 'Result cleared.';
  emailInput.focus();
});
const modelContext = document.modelContext;
if (modelContext?.registerTool) {
  const lifecycle = new AbortController();
  Promise.resolve(modelContext.registerTool({
    name: 'check_google_email_signal', title: 'Check Google email signal',
    description: 'Send one email address to Google and display its registration signal. Requires the user to own the address or have permission.',
    inputSchema: {type: 'object', properties: {email: {type: 'string', format: 'email', maxLength: 254}, permitted: {type: 'boolean', const: true}}, required: ['email', 'permitted'], additionalProperties: false},
    annotations: {readOnlyHint: false, untrustedContentHint: true},
    execute(input) {
      if (!input || typeof input.email !== 'string' || input.permitted !== true) throw new Error('Email and permission are required.');
      return lookup(input.email, input.permitted);
    }
  }, {signal: lifecycle.signal})).catch(() => {});
  window.addEventListener('pagehide', () => lifecycle.abort(), {once: true});
}
connect();
