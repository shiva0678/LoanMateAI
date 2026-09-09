# LoanMate Member 4 Test Cases

## Purpose

These test cases verify the backend API and eligibility engine using synthetic applicant data.

---

## Test Case 1 — Valid Applicant

### Request

```json
{
  "message": "I am 27 years old, earn ₹55000 monthly, have a credit score of 760, have worked for 3 years, already pay ₹5000 EMI and need ₹8 lakh for 5 years.",
  "sessionId": "test-001"
}