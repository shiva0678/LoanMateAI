const path = require('path');
const fs = require('fs');

const ENGINE_PATHS = [
  '../rules/eligibility-engine',
  '../rules/eligibilityEngine',
  '../rules/index'
];

function getCheckEligibility() {
  for (const relativePath of ENGINE_PATHS) {
    const modulePath = path.join(__dirname, relativePath);
    if (!fs.existsSync(`${modulePath}.js`) && !fs.existsSync(modulePath)) continue;
    try {
      const engine = require(modulePath);
      if (typeof engine === 'function') return engine;
      if (typeof engine.checkEligibility === 'function') return engine.checkEligibility;
    } catch (error) {
      throw error;
    }
  }
  return null;
}

async function checkEligibility(applicant) {
  const check = getCheckEligibility();
  if (!check) throw new Error('Eligibility engine is not available');
  return check(applicant);
}

module.exports = { checkEligibility, getCheckEligibility };
