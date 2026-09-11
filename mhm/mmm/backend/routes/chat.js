const express = require('express');
const { extractApplicant } = require('../services/nlpService');
const { generateAssistantReply } = require('../services/aiReplyService');
const { checkEligibility } = require('../services/eligibilityService');
const { formatResponse, getMissingFields } = require('../services/responseFormatter');

const router = express.Router();
const applicantSessions = new Map();

function mergeApplicant(previous, current) {
  return Object.fromEntries(Object.keys(current).map(field => [
    field,
    current[field] === null || current[field] === undefined ? previous?.[field] ?? null : current[field]
  ]));
}

router.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

  try {
    const sessionId = typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
      ? req.body.sessionId.trim()
      : 'default';
    const extractedApplicant = await extractApplicant(message);
    const applicant = mergeApplicant(applicantSessions.get(sessionId), extractedApplicant);
    applicantSessions.set(sessionId, applicant);
    const missingFields = getMissingFields(applicant);
    if (missingFields.length) {
      const result = {
        eligibility: { eligible: null, status: 'NEEDS_MORE_INFORMATION', score: null },
        missingFields
      };
      result.reply = await generateAssistantReply(message, applicant, result);
      return res.json(formatResponse(applicant, result));
    }
    const result = await checkEligibility(applicant);
    result.reply = await generateAssistantReply(message, applicant, result);
    return res.json(formatResponse(applicant, result));
  } catch (error) {
    console.error('Chat processing failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to process the request' });
  }
});

module.exports = router;
