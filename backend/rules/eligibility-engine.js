const rules = require('./eligibility-rules.json').personalLoan;

const DOCUMENTS = [
  'PAN Card',
  'Identity Proof',
  'Last 3 Salary Slips',
  'Last 6 Months Bank Statement'
];

const REQUIRED_FIELDS = [
  'age',
  'income',
  'creditScore',
  'employmentYears',
  'existingEMI',
  'loanAmount',
  'tenureMonths'
];

const SCORE_WEIGHTS = {
  age: 15,
  income: 20,
  creditScore: 30,
  employment: 15,
  foir: 20
};

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculateEMI(principal, annualInterestRate, tenureMonths) {
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate === 0) return Math.floor(principal / tenureMonths);
  const growth = (1 + monthlyRate) ** tenureMonths;
  return Math.floor((principal * monthlyRate * growth) / (growth - 1));
}

function getMissingFields(applicant) {
  return REQUIRED_FIELDS.filter(field => applicant[field] === null || applicant[field] === undefined);
}

function baseResult() {
  return {
    eligible: false,
    status: 'NEEDS_MORE_INFORMATION',
    score: null,
    reasons: [],
    failures: [],
    suggestions: [],
    documents: [],
    missingFields: []
  };
}

function checkEligibility(applicant) {
  const result = baseResult();
  const missingFields = getMissingFields(applicant || {});
  if (missingFields.length) {
    result.missingFields = missingFields;
    return result;
  }

  const emi = calculateEMI(applicant.loanAmount, rules.annualInterestRate, applicant.tenureMonths);
  const foir = round(((applicant.existingEMI + emi) / applicant.income) * 100);
  const checks = [
    {
      key: 'age',
      passed: applicant.age >= rules.minAge && applicant.age <= rules.maxAge,
      reason: 'Age requirement satisfied',
      failure: `Age must be between ${rules.minAge} and ${rules.maxAge}`,
      suggestion: 'Apply within the eligible age range'
    },
    {
      key: 'income',
      passed: applicant.income >= rules.minIncome,
      reason: 'Income requirement satisfied',
      failure: `Income is below the minimum requirement of ${rules.minIncome}`,
      suggestion: 'Consider applying after meeting the minimum income requirement'
    },
    {
      key: 'creditScore',
      passed: applicant.creditScore >= rules.minCreditScore,
      reason: 'Credit score requirement satisfied',
      failure: `Credit score is below the minimum requirement of ${rules.minCreditScore}`,
      suggestion: 'Improve credit score before applying'
    },
    {
      key: 'employment',
      passed: applicant.employmentYears >= rules.minEmploymentYears,
      reason: 'Employment requirement satisfied',
      failure: `Employment experience is below the minimum requirement of ${rules.minEmploymentYears} year`,
      suggestion: 'Apply after meeting the minimum employment experience'
    },
    {
      key: 'foir',
      passed: foir <= rules.maxFOIR,
      reason: 'FOIR requirement satisfied',
      failure: `FOIR is above the maximum allowed limit of ${rules.maxFOIR}%`,
      suggestion: 'Reduce existing obligations or apply for a lower loan amount'
    }
  ];

  result.score = checks.reduce((score, check) => score + (check.passed ? SCORE_WEIGHTS[check.key] : 0), 0);
  result.reasons = checks.filter(check => check.passed).map(check => check.reason);
  result.failures = checks.filter(check => !check.passed).map(check => check.failure);
  result.suggestions = checks.filter(check => !check.passed).map(check => check.suggestion);
  result.eligible = result.failures.length === 0;
  result.status = result.eligible ? 'LIKELY_ELIGIBLE' : 'NOT_CURRENTLY_ELIGIBLE';
  result.documents = DOCUMENTS;
  result.emi = emi;
  result.foir = foir;
  return result;
}

module.exports = {
  checkEligibility,
  calculateEMI,
  rules
};
