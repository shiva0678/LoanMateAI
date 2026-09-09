# LoanMate Member 4 Test Cases

## Purpose

These test cases provide synthetic applicant requests for testing the backend API, AI extraction, normalization, and eligibility engine.

---

## Test Case 1 — Valid Applicant

### Request

```json
{
  "message": "I am 27 years old, earn ₹55000 monthly, have a credit score of 760, have worked for 3 years, already pay ₹5000 EMI and need ₹8 lakh for 5 years.",
  "sessionId": "test-001"
}

{
  "message": "I am 19 years old, earn ₹50000 monthly, have a credit score of 750, have worked for 2 years, pay ₹3000 EMI and need ₹5 lakh for 5 years.",
  "sessionId": "test-002"
}

{
  "message": "I am 30 years old, earn ₹20000 monthly, have a credit score of 750, have worked for 3 years, pay ₹2000 EMI and need ₹4 lakh for 5 years.",
  "sessionId": "test-003"
}

{
  "message": "I am 30 years old, earn ₹50000 monthly, have a credit score of 650, have worked for 3 years, pay ₹3000 EMI and need ₹5 lakh for 5 years.",
  "sessionId": "test-004"
}

{
  "message": "I am 30 years old, earn ₹50000 monthly, have a credit score of 750, have worked for 6 months, pay ₹3000 EMI and need ₹5 lakh for 5 years.",
  "sessionId": "test-005"
}

{
  "message": "I am 27 years old and earn ₹55000 monthly. I want a personal loan of ₹8 lakh.",
  "sessionId": "test-006"
}

{
  "message": "I'm 28, making 60k a month. My CIBIL is 750 and I've been employed for 3 years. I already have a 5k EMI. I need 8 lakh for 5 years.",
  "sessionId": "test-007"
}

{
  "message": "I am 27 years old, earn ₹55000 monthly, have a credit score of 760, have worked for 3 years, pay ₹5000 EMI and need ₹6 lakh for 5 years.",
  "sessionId": "test-008"
}