import './style.css';
import { sendChatMessage, checkBackendHealth } from './api.js';

const STORAGE_KEY = 'loanmate-session-v1';
const THEME_KEY = 'loanmate-theme';
const HEALTH_POLL_MS = 20000;

const prompts = [
  'Check my personal loan eligibility',
  'I earn ₹50,000 and have a credit score of 750',
  'What documents do I need?'
];

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const persisted = loadPersistedState();

const state = {
  sessionId: persisted?.sessionId || `loanmate-${Date.now()}`,
  messages: persisted?.messages || [],
  response: persisted?.response || null,
  loading: false,
  error: '',
  explanationOpen: false,
  lastFailedMessage: '',
  backendOnline: null,
  theme: localStorage.getItem(THEME_KEY) || 'light'
};

document.documentElement.setAttribute('data-theme', state.theme);

const app = document.querySelector('#app');

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionId: state.sessionId,
      messages: state.messages,
      response: state.response
    }));
  } catch {
    // Storage may be unavailable (private browsing, quota) — safe to ignore.
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function formatValue(value, key) {
  if (value === null || value === undefined) return 'Not provided';
  if (key === 'income' || key === 'existingEMI' || key === 'loanAmount') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (key === 'tenureMonths') return `${value} months`;
  if (key === 'employmentYears') return `${value} years`;
  return value;
}

function getStatusMeta(status) {
  const normalized = status || 'NEEDS_MORE_INFORMATION';

  if (normalized === 'LIKELY_ELIGIBLE') {
    return {
      badge: 'Eligible',
      title: 'Likely eligible',
      tone: 'success',
      description: 'Your current profile aligns well with a preliminary approval profile.'
    };
  }

  if (normalized === 'NOT_CURRENTLY_ELIGIBLE') {
    return {
      badge: 'Review',
      title: 'Needs attention',
      tone: 'warning',
      description: 'A few factors may need improvement before the application is stronger.'
    };
  }

  return {
    badge: 'In progress',
    title: 'More information needed',
    tone: 'neutral',
    description: 'We need a few details to refine the assessment and suggest next steps.'
  };
}

function renderMessages() {
  if (!state.messages.length) {
    return `
      <div class="message bot">
        <div class="message-body">Hi! I'm LoanMate. I can help you understand your preliminary loan eligibility.</div>
        <span class="time">LoanMate</span>
      </div>
    `;
  }
  return state.messages.map(message => `
    <div class="message ${message.role}">
      <div class="message-body">${escapeHtml(message.text)}</div>
      <span class="time">${message.role === 'user' ? 'You' : 'LoanMate'}</span>
    </div>
  `).join('');
}

function list(items, empty = 'None') {
  if (!items?.length) return `<li>${empty}</li>`;
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function applicantSummary(applicant) {
  if (!applicant) return '';
  const fields = [
    ['Age', 'age'],
    ['Monthly income', 'income'],
    ['Credit score', 'creditScore'],
    ['Employment', 'employmentYears'],
    ['Existing EMI', 'existingEMI'],
    ['Loan amount', 'loanAmount'],
    ['Tenure', 'tenureMonths']
  ];

  return `<section class="summary-block">
    <div class="section-header">
      <h3>Applicant snapshot</h3>
    </div>
    <div class="applicant-grid">
      ${fields.map(([label, key]) => `
        <div class="stat-card compact">
          <span>${label}</span>
          <strong>${escapeHtml(formatValue(applicant[key], key))}</strong>
        </div>
      `).join('')}
    </div>
  </section>`;
}

function emiFoirSummary(response) {
  if (response?.emi === null || response?.emi === undefined) return '';
  const foirTone = response.foir > 50 ? 'warning' : 'success';
  return `<section class="summary-block">
    <div class="section-header">
      <h3>Loan math</h3>
    </div>
    <div class="applicant-grid">
      <div class="stat-card compact">
        <span>Estimated EMI</span>
        <strong>₹${Number(response.emi).toLocaleString('en-IN')}/mo</strong>
      </div>
      <div class="stat-card compact ${foirTone}">
        <span>FOIR</span>
        <strong>${response.foir}%</strong>
      </div>
    </div>
  </section>`;
}

function resultPanel(response) {
  if (!response) {
    return `
      <div class="empty-state">
        <strong>Assessment ready</strong>
        <p>Your eligibility result and personalized next steps will appear here after you ask a question.</p>
      </div>
    `;
  }

  const status = response.eligibility?.status || 'NEEDS_MORE_INFORMATION';
  const meta = getStatusMeta(status);
  const score = response.eligibility?.score ?? '—';
  const missing = response.missingFields || [];
  const explanation = state.explanationOpen ? `
    <section class="summary-block">
      <div class="section-header">
        <h3>Why this result?</h3>
      </div>
      <ul class="detail-list">
        <li><span class="list-label">Passed</span><div>${list(response.reasons || [], 'No criteria passed yet')}</div></li>
        <li><span class="list-label">Needs attention</span><div>${list(response.failures || [], 'None')}</div></li>
      </ul>
    </section>
  ` : '';

  return `
    <div class="result-card ${meta.tone}">
      <div class="result-topline">
        <span class="result-badge">${meta.badge}</span>
        <span class="result-score">Score ${score}/100</span>
      </div>
      <h3>${meta.title}</h3>
      <p>${meta.description}</p>
    </div>

    ${missing.length ? `
      <section class="summary-block">
        <div class="section-header">
          <h3>Missing details</h3>
        </div>
        <ul class="detail-list">${list(missing)}</ul>
      </section>
    ` : ''}

    ${applicantSummary(response.applicant)}

    ${emiFoirSummary(response)}

    <div class="inline-actions">
      <button class="ghost-button compact" data-action="explain">
        ${state.explanationOpen ? 'Hide explanation' : 'View explanation'}
      </button>
    </div>

    ${explanation}

    ${response.suggestions?.length ? `
      <section class="summary-block">
        <div class="section-header">
          <h3>Recommended next steps</h3>
        </div>
        <ul class="detail-list">${list(response.suggestions)}</ul>
      </section>
    ` : ''}

    ${response.documents?.length ? `
      <section class="summary-block">
        <div class="section-header">
          <h3>Document checklist</h3>
        </div>
        <ul class="detail-list">${list(response.documents)}</ul>
      </section>
    ` : ''}

    <div class="scenario-box">
      <label for="whatIfInput">Try a new scenario</label>
      <div class="scenario-input-row">
        <input id="whatIfInput" type="text" value="What if I request ₹600000 instead?" aria-label="Scenario input" />
        <button type="button" class="primary-button small" data-action="what-if">Try</button>
      </div>
    </div>
  `;
}

function statusPill() {
  if (state.backendOnline === null) return `<span class="status-pill neutral">Checking backend…</span>`;
  if (state.backendOnline) return `<span class="status-pill">Secure review · Online</span>`;
  return `<span class="status-pill offline">Backend offline</span>`;
}

function render() {
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">L</div>
          <div class="brand-copy">
            <strong>LoanMate</strong>
            <small>Preliminary loan guidance</small>
          </div>
        </div>

        <nav class="header-nav" aria-label="Main navigation">
          <button class="nav-item active" type="button">Overview</button>
          <button class="nav-item" type="button">Eligibility</button>
          <button class="nav-item" type="button">Documents</button>
        </nav>

        <div class="header-actions">
          ${statusPill()}
          <button class="ghost-button" type="button" data-action="toggle-theme" aria-label="Toggle theme">
            ${state.theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <button class="ghost-button" type="button" data-action="clear-chat">Clear chat</button>
        </div>
      </header>

      <main class="workspace">
        <section class="intro-panel" aria-label="LoanMate overview">
          <div class="eyebrow">Personal loan assistant</div>
          <h1>Clearer decisions for your next move.</h1>
          <p>
            Share a few details in your own words and LoanMate will estimate whether your profile is aligned,
            explain the result, and show the next steps to strengthen your application.
          </p>

          <div class="hero-cards" aria-label="Product highlights">
            <article class="feature-card">
              <span class="feature-icon">✓</span>
              <div>
                <strong>Eligibility guidance</strong>
                <small>Personalized assessment</small>
              </div>
            </article>
            <article class="feature-card">
              <span class="feature-icon">◎</span>
              <div>
                <strong>Credit-friendly insights</strong>
                <small>Actionable next steps</small>
              </div>
            </article>
            <article class="feature-card">
              <span class="feature-icon">↗</span>
              <div>
                <strong>Document readiness</strong>
                <small>What to prepare</small>
              </div>
            </article>
          </div>
        </section>

        <section class="main-layout">
          <section class="chat-panel" aria-label="LoanMate chat assistant">
            <div class="chat-head">
              <div>
                <strong>LoanMate assistant</strong>
                <span class="online"><i class="${state.backendOnline === false ? 'offline' : ''}"></i>${state.backendOnline === false ? 'Backend unreachable' : 'Ready to help'}</span>
              </div>
              <span class="micro-badge">Live guidance</span>
            </div>

            <div class="messages" aria-live="polite">
              ${renderMessages()}${state.loading ? '<div class="typing">LoanMate is reviewing your details…</div>' : ''}
            </div>

            <div class="suggestions" aria-label="Suggested prompts">
              ${prompts.map(prompt => `<button class="chip" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}
            </div>

            ${state.error ? `
              <div class="error" role="alert">
                <span>${escapeHtml(state.error)}</span>
                ${state.lastFailedMessage ? '<button type="button" class="ghost-button compact retry-button" data-action="retry">Retry</button>' : ''}
              </div>
            ` : ''}

            <form class="composer" id="chatForm">
              <label class="sr-only" for="messageInput">Type your message</label>
              <input id="messageInput" autocomplete="off" placeholder="Tell me about your loan plans…" ${state.loading ? 'disabled' : ''} />
              <button class="primary-button send-button" type="submit" aria-label="Send message" ${state.loading ? 'disabled' : ''}>→</button>
            </form>
          </section>

          <aside class="side-panel" aria-label="Eligibility assessment panel">
            <div class="panel-header">
              <h2>Your assessment</h2>
              <span class="signal-dot ${state.backendOnline === false ? 'offline' : ''}"></span>
            </div>
            ${resultPanel(state.response)}
          </aside>
        </section>
      </main>
    </div>
  `;

  bindEvents();
  requestAnimationFrame(() => {
    const input = document.querySelector('#messageInput');
    if (input) input.focus();
  });
}

async function submitMessage(text) {
  const message = text.trim();
  if (!message || state.loading) return;

  state.messages.push({ role: 'user', text: message });
  state.loading = true;
  state.error = '';
  state.lastFailedMessage = '';
  render();

  try {
    const response = await sendChatMessage(message, state.sessionId);
    state.response = response;
    state.backendOnline = true;
    state.messages.push({ role: 'bot', text: response.reply || 'Here is your preliminary assessment.' });
  } catch (error) {
    state.error = error?.message || "Sorry, I couldn't process that request. Please try again.";
    state.lastFailedMessage = message;
    state.messages.push({ role: 'bot', text: state.error });
  } finally {
    state.loading = false;
    persistState();
    render();
  }
}

function retryLastMessage() {
  const message = state.lastFailedMessage;
  if (!message) return;
  // Drop the trailing failed user/bot pair before retrying so it isn't duplicated.
  state.messages = state.messages.slice(0, -2);
  state.error = '';
  submitMessage(message);
}

function clearChat() {
  state.messages = [];
  state.response = null;
  state.error = '';
  state.lastFailedMessage = '';
  state.explanationOpen = false;
  state.sessionId = `loanmate-${Date.now()}`;
  persistState();
  render();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem(THEME_KEY, state.theme);
  render();
}

function bindEvents() {
  const form = document.querySelector('#chatForm');
  const textInput = document.querySelector('#messageInput');

  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (textInput) {
      submitMessage(textInput.value);
      textInput.value = '';
    }
  });

  document.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => submitMessage(button.dataset.prompt));
  });

  document.querySelector('[data-action="explain"]')?.addEventListener('click', () => {
    state.explanationOpen = !state.explanationOpen;
    render();
  });

  document.querySelector('[data-action="what-if"]')?.addEventListener('click', () => {
    const input = document.querySelector('#whatIfInput');
    const nextRequest = input?.value || 'What if I request ₹600000 instead?';
    submitMessage(nextRequest);
  });

  document.querySelector('[data-action="retry"]')?.addEventListener('click', retryLastMessage);
  document.querySelector('[data-action="clear-chat"]')?.addEventListener('click', clearChat);
  document.querySelector('[data-action="toggle-theme"]')?.addEventListener('click', toggleTheme);
}

async function pollHealth() {
  const online = await checkBackendHealth();
  if (online !== state.backendOnline) {
    state.backendOnline = online;
    render();
  }
}

render();
pollHealth();
setInterval(pollHealth, HEALTH_POLL_MS);
