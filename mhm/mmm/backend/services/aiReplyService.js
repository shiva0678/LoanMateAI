function fallbackReply(message, applicant, result) {
  const question = message.toLowerCase();
  const missingFields = result.missingFields || [];
  if (missingFields.length) return `To continue, please provide: ${missingFields.join(', ')}.`;
  if (/(?:what|which|need|show|submit|require).*\b(?:document|paperwork|proof|paper)s?\b|\b(?:document|paperwork|proof|paper)s?.*(?:need|required)/.test(question)) {
    return `For a personal loan, keep these documents ready: ${(result.documents || []).join(', ')}.`;
  }
  if (/how.*(?:improve|raise)|improve.*(?:credit|cibil|score)|(?:credit|cibil|score).*improve|what can i do.*(?:credit|score)/.test(question)) {
    return 'To improve your credit score, pay every loan and credit-card instalment on time, keep credit-card utilisation low, avoid applying for multiple new loans in a short period, review your credit report for errors, and maintain older credit accounts responsibly.';
  }
  if (/(?:what|which|calculate|estimate|how much).*\b(?:emi|monthly payment|instalment)s?\b|\b(?:emi|monthly payment|instalment)s?.*(?:amount|calculate|estimate)/.test(question) && result.emi !== undefined) {
    return `Your estimated monthly EMI is ₹${Number(result.emi).toLocaleString('en-IN')}. This is a preliminary estimate based on the requested loan amount and tenure.`;
  }
  if (/(?:what|which|explain|calculate|estimate).*\bfoir\b|\bfoir\b.*(?:mean|calculate|estimate|high)/.test(question) && result.foir !== undefined) {
    return `Your estimated FOIR is ${result.foir}%. It compares your existing EMI and estimated new EMI with your monthly income.`;
  }
  if (/(?:what.*next|next.*step|what should i do|what can i do|how can i improve|improve)/.test(question)) {
    return result.suggestions?.length
      ? `Your next steps are: ${result.suggestions.join('; ')}.`
      : 'Your next step is to keep your documents ready and review the preliminary assessment before applying.';
  }
  if (result.status === 'LIKELY_ELIGIBLE') return 'Based on the information provided, you are likely eligible. I can also explain the score, documents, or next steps.';
  if (result.status === 'NOT_CURRENTLY_ELIGIBLE') {
    const failures = result.failures?.length ? ` The reason is: ${result.failures.join('; ')}.` : '';
    const creditAdvice = result.failures?.some(failure => failure.toLowerCase().includes('credit score'))
      ? ' To improve your credit score, pay every loan and credit-card instalment on time, keep credit-card utilisation low, avoid applying for multiple new loans in a short period, and review your credit report for errors.'
      : '';
    const suggestions = result.suggestions?.length ? ` Next step: ${result.suggestions.join('; ')}.` : '';
    return `Based on the information provided, you are not currently eligible.${failures}${creditAdvice}${suggestions}`;
  }
  return 'I need more information to assess your preliminary loan eligibility.';
}

async function generateAssistantReply(message, applicant, result) {
  if (!process.env.OPENAI_API_KEY || typeof fetch !== 'function') return fallbackReply(message, applicant, result);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: 'You are LoanMate, a concise and friendly banking loan assistant. Answer the customer\'s general loan questions and explain their personalized result using only the supplied applicant data and deterministic eligibility result. The rule engine is the sole authority for eligibility: never change, recalculate, or contradict eligible, status, score, reasons, failures, suggestions, missingFields, or documents. Do not invent financial values, approval promises, rates, policies, or documents. If information is missing, clearly ask only for the listed missing fields. State that this is preliminary demo guidance, not final approval. Keep the answer under 100 words.'
          },
          {
            role: 'user',
            content: JSON.stringify({ question: message, applicant, deterministicResult: result })
          }
        ]
      })
    });
    if (!response.ok) return fallbackReply(message, applicant, result);
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || fallbackReply(message, applicant, result);
  } catch {
    return fallbackReply(message, applicant, result);
  }
}

module.exports = { generateAssistantReply };
