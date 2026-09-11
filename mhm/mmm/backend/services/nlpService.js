const DEFAULT_APPLICANT = {
  age: null,
  income: null,
  creditScore: null,
  employmentYears: null,
  existingEMI: null,
  loanAmount: null,
  tenureMonths: null,
  loanType: 'personal'
};

function toNumber(value) {
  return Number(String(value).replace(/,/g, '').replace(/\s/g, ''));
}

function amountFromMatch(value, unit = '') {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return null;
  if (/lakh|lac/i.test(unit)) return Math.round(amount * 100000);
  if (/k/i.test(unit)) return Math.round(amount * 1000);
  return Math.round(amount);
}

function firstMatch(message, patterns, converter = toNumber) {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return converter(...match.slice(1));
  }
  return null;
}

function lastMatch(message, pattern, converter = toNumber) {
  const matches = [...message.matchAll(pattern)];
  if (!matches.length) return null;
  return converter(matches[matches.length - 1][1]);
}

function extractWithFallback(message) {
  const applicant = { ...DEFAULT_APPLICANT };
  applicant.age = firstMatch(message, [
    /(?:age|aged)\s*(?:is|of|:)?\s*(\d{1,3})\s*(?:years?\s*old)?\b/i,
    /\bi\s*am\s*(\d{1,3})\s*(?:years?\s*old)?\b/i
  ]);
  applicant.income = firstMatch(message, [
    /(?:earn|income|salary|monthly income)\D{0,20}(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(k|lakh|lac)?/i
  ], amountFromMatch);
  applicant.creditScore = firstMatch(message, [
    /(?:credit\s*score|cibil)\D{0,12}(\d{3})\b/i
  ]);
  applicant.employmentYears = firstMatch(message, [
    /(?:worked|work|employ(?:ed|ment)|experience|service)\D{0,20}(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i
  ]);
  const hasNoEmi = /no\s+(?:existing\s+)?emi/i.test(message);
  applicant.existingEMI = hasNoEmi ? 0 : firstMatch(message, [
    // Stops at a comma/"and"/"need"/"want" boundary so it never bleeds into
    // an unrelated clause like "...no existing EMI, need Rs 5 lakh...".
    /(?:existing|current|already pay|monthly)\s*(?:loan\s*)?emi\s*(?:is|of|:)?\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(k)?/i
  ], amountFromMatch);
  applicant.loanAmount = firstMatch(message, [
    /(?:need|want|loan amount|borrow|request(?:ing)?|apply(?:ing)? for|prefer|take|get a loan of)\D{0,20}(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(lakh|lac|k)?/i
  ], amountFromMatch);
  applicant.tenureMonths = lastMatch(message, /(?:for|tenure)\D{0,10}(\d+(?:\.\d+)?)\s*years?/gi,
    years => Math.round(Number(years) * 12));
  return applicant;
}

function validateApplicant(value) {
  const applicant = { ...DEFAULT_APPLICANT };
  if (!value || typeof value !== 'object') return applicant;
  for (const field of Object.keys(DEFAULT_APPLICANT)) {
    if (field === 'loanType') {
      applicant.loanType = value.loanType === 'personal' ? 'personal' : 'personal';
    } else if (value[field] === null || value[field] === undefined || value[field] === '') {
      applicant[field] = null;
    } else if (Number.isFinite(Number(value[field]))) {
      applicant[field] = Number(value[field]);
    }
  }
  return applicant;
}

async function extractApplicant(message) {
  const fallback = extractWithFallback(message);
  if (!process.env.OPENAI_API_KEY || typeof fetch !== 'function') return fallback;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Extract applicant facts only. Return JSON with age, income, creditScore, employmentYears, existingEMI, loanAmount, tenureMonths, loanType. Use null for missing values. Never return eligibility decisions. Convert amounts to INR and durations to months.' },
          { role: 'user', content: message }
        ]
      })
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? validateApplicant(JSON.parse(content)) : fallback;
  } catch {
    return fallback;
  }
}

module.exports = { extractApplicant, extractWithFallback, validateApplicant };
