const DOCUMENTS = [
  'PAN Card',
  'Identity Proof',
  'Last 3 Salary Slips',
  'Last 6 Months Bank Statement'
];

function formatReply(eligibility, missingFields) {
  if (missingFields.length) return `Please provide: ${missingFields.join(', ')}.`;
  if (eligibility.status === 'LIKELY_ELIGIBLE' || eligibility.eligible === true) return 'Based on the information provided, you are likely eligible.';
  if (eligibility.status === 'NOT_CURRENTLY_ELIGIBLE' || eligibility.eligible === false) return 'Based on the information provided, you are not currently eligible.';
  return 'I need more information to assess your loan eligibility.';
}

function formatResponse(applicant, result) {
  const eligibility = result?.eligibility || result || {};
  const missingFields = result?.missingFields || Object.entries(applicant)
    .filter(([field, value]) => field !== 'loanType' && value === null)
    .map(([field]) => field);
  return {
    success: true,
    reply: result?.reply || formatReply(eligibility, missingFields),
    applicant,
    eligibility: {
      eligible: eligibility.eligible ?? null,
      status: eligibility.status || (missingFields.length ? 'NEEDS_MORE_INFORMATION' : 'NEEDS_MORE_INFORMATION'),
      score: eligibility.score ?? null
    },
    reasons: result?.reasons || eligibility.reasons || [],
    failures: result?.failures || eligibility.failures || [],
    suggestions: result?.suggestions || eligibility.suggestions || [],
    documents: result?.documents || eligibility.documents || DOCUMENTS,
    missingFields
  };
}

function getMissingFields(applicant) {
  return Object.entries(applicant)
    .filter(([field, value]) => field !== 'loanType' && value === null)
    .map(([field]) => field);
}

module.exports = { formatResponse, getMissingFields };
