const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const CHAT_URL = `${API_BASE_URL}/api/chat`;
const HEALTH_URL = `${API_BASE_URL}/health`;
const REQUEST_TIMEOUT_MS = 20000;
const HEALTH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendChatMessage(message, sessionId) {
  let response;
  try {
    response = await fetchWithTimeout(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The request took too long to respond. Please check your connection and try again.');
    }
    throw new Error('Unable to reach the LoanMate backend. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Unable to process the request (status ${response.status}).`);
  }

  return data;
}

export async function checkBackendHealth() {
  try {
    const response = await fetchWithTimeout(HEALTH_URL, { method: 'GET' }, HEALTH_TIMEOUT_MS);
    if (!response.ok) return false;
    const data = await response.json().catch(() => ({}));
    return data.success !== false;
  } catch {
    return false;
  }
}
