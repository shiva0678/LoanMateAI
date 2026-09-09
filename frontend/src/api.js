const API_URL = 'http://localhost:3000/api/chat';

export async function sendChatMessage(message, sessionId) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Unable to process the request');
  }
  return data;
}
