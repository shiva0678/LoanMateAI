import './style.css';
import { sendChatMessage } from './api.js';

const sessionId = `loanmate-${Date.now()}`;
const state = { messages: [], response: null, loading: false, error: '', explanationOpen: false };
const prompts = [
  'Check my personal loan eligibility',
  'I earn ₹50,000 and have a credit score of 750',
  'What documents do I need?'
];

const app = document.querySelector('#app');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatValue(value, key) {
  if (value === null || value === undefined) return 'Not provided';
  if (key === 'income' || key === 'existingEMI' || key === 'loanAmount') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (key === 'tenureMonths') return `${value} months`;
  if (key === 'employmentYears') return `${value} years`;
  return value;
}

function renderMessages() {
  return state.messages.map(message => `
    <div class="message ${message.role}">
      ${escapeHtml(message.text)}
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
    ['Age', 'age'], ['Monthly income', 'income'], ['Credit score', 'creditScore'],
    ['Employment', 'employmentYears'], ['Existing EMI', 'existingEMI'],
    ['Loan amount', 'loanAmount'], ['Tenure', 'tenureMonths']
  ];
  return `<section class="section"><h3>Applicant summary</h3><div class="applicant-grid">
    ${fields.map(([label, key]) => `<div><span>${label}</span><b>${escapeHtml(formatValue(applicant[key], key))}</b></div>`).join('')}
  </div></section>`;
}

function resultPanel(response) {
  if (!response) return `<div class="empty-state">Your eligibility result and personalized next steps will appear here.</div>`;
  const status = response.eligibility?.status || 'NEEDS_MORE_INFORMATION';
  const tone = status === 'LIKELY_ELIGIBLE' ? '' : status === 'NOT_CURRENTLY_ELIGIBLE' ? 'warning' : 'neutral';
  const title = status === 'LIKELY_ELIGIBLE' ? 'Likely eligible' : status === 'NOT_CURRENTLY_ELIGIBLE' ? 'Not currently eligible' : 'More information needed';
  const missing = response.missingFields || [];
  const explain = state.explanationOpen ? `<div class="section"><h3>Why this result?</h3><ul class="detail-list"><li><b>Passed:</b> ${list(response.reasons, 'No criteria passed yet')}</li><li><b>Needs attention:</b> ${list(response.failures, 'None')}</li></ul></div>` : '';
  return `<div class="result ${tone}"><div class="result-label">Preliminary assessment</div><h3>${title}</h3><div class="score">Score <b>${response.eligibility?.score ?? '—'}</b> / 100</div></div>
    ${missing.length ? `<section class="section"><h3>To continue, I need:</h3><ul class="detail-list">${list(missing)}</ul></section>` : ''}
    ${applicantSummary(response.applicant)}
    <section class="section"><button class="explain-button" data-action="explain">${state.explanationOpen ? 'Hide explanation' : 'Why? View explanation'}</button></section>
    ${explain}
    ${response.suggestions?.length ? `<section class="section"><h3>How to improve</h3><ul class="detail-list">${list(response.suggestions)}</ul></section>` : ''}
    ${response.documents?.length ? `<section class="section"><h3>Document checklist</h3><ul class="detail-list">${list(response.documents)}</ul></section>` : ''}
    <div class="what-if"><input id="whatIfInput" placeholder="What if I request ₹600000 instead?" /><button data-action="what-if">Try scenario</button></div>`;
}

function render() {
  app.innerHTML = `<div class="app-shell">
    <header class="topbar"><div class="brand"><div class="brand-mark">L</div><div><strong>LoanMate</strong><small>Preliminary loan guidance</small></div></div><div class="secure-note">Synthetic demo • No application submitted</div></header>
    <main class="workspace"><div class="intro"><div class="eyebrow">Personal loan assistant</div><h1>Make your next<br>money move clearer.</h1><p>Share a few details in your own words. LoanMate will explain the preliminary result and what to do next.</p></div>
      <section class="chat-panel"><div class="chat-head"><strong>LoanMate assistant</strong><span class="online"><i></i>Ready to help</span></div><div class="messages">${renderMessages()}${state.loading ? '<div class="typing">LoanMate is reviewing your details…</div>' : ''}</div>
        <div class="suggestions">${prompts.map(prompt => `<button class="chip" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}</div>
        ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}
        <form class="composer" id="chatForm"><input id="messageInput" autocomplete="off" placeholder="Tell me about your loan plans…" ${state.loading ? 'disabled' : ''} /><button class="send" aria-label="Send message" ${state.loading ? 'disabled' : ''}>↑</button></form>
      </section>
      <aside class="side-panel"><h2>Your assessment</h2>${resultPanel(state.response)}</aside>
    </main></div>`;
  bindEvents();
}

async function submitMessage(text) {
  const message = text.trim();
  if (!message || state.loading) return;
  state.messages.push({ role: 'user', text: message });
  state.loading = true; state.error = ''; render();
  try {
    const response = await sendChatMessage(message, sessionId);
    state.response = response;
    state.messages.push({ role: 'bot', text: response.reply || 'Here is your preliminary assessment.' });
  } catch {
    state.error = "Sorry, I couldn't process that request. Please try again.";
    state.messages.push({ role: 'bot', text: state.error });
  } finally {
    state.loading = false; render();
  }
}

function bindEvents() {
  document.querySelector('#chatForm')?.addEventListener('submit', event => { event.preventDefault(); submitMessage(document.querySelector('#messageInput').value); });
  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
  document.querySelector('[data-action="explain"]')?.addEventListener('click', () => { state.explanationOpen = !state.explanationOpen; render(); });
  document.querySelector('[data-action="what-if"]')?.addEventListener('click', () => { const input = document.querySelector('#whatIfInput'); submitMessage(input.value || 'What if I request ₹600000 instead?'); });
}

state.messages.push({ role: 'bot', text: "Hi! I'm LoanMate. I can help you understand your preliminary loan eligibility." });
render();
