# LoanMate

## Overview

LoanMate is an AI-powered conversational loan eligibility assistant for personal loans. It helps applicants understand eligibility criteria, receive personalized feedback, identify failed criteria, learn how to improve their profile, and know which documents are required.

LoanMate provides preliminary guidance only, not final bank approval.

## Complete Workflow

```text
User natural-language message
        |
        v
Frontend chatbot
        |
        v
POST /api/chat
        |
        v
OpenAI extracts applicant information
        |
        v
Structured Applicant object
        |
        v
Deterministic eligibility rule engine
        |
        v
Eligibility result, score, reasons, failures, suggestions
        |
        v
OpenAI generates a conversational explanation
        |
        v
Frontend displays the response
```

## AI and Rule Separation

OpenAI is responsible for:

- Understanding natural-language messages
- Extracting applicant information
- Answering general loan questions
- Explaining the trusted backend result

OpenAI does **not** decide eligibility.

The deterministic rule engine is the only source of truth for:

- Eligibility status
- Eligibility score
- Failed criteria
- Reasons
- Suggestions

This combines the flexibility of AI with the reliability and explainability of rules.

## Example Applicant

User message:

> I am 35 years old, earn Rs 80,000 monthly, have a credit score of 680, worked for 7 years, existing EMI is Rs 5,000, and need Rs 10 lakh for 5 years.

OpenAI extracts:

```json
{
  "age": 35,
  "income": 80000,
  "creditScore": 680,
  "employmentYears": 7,
  "existingEMI": 5000,
  "loanAmount": 1000000,
  "tenureMonths": 60,
  "loanType": "personal"
}
```

The rule engine returns a result such as:

```json
{
  "eligible": false,
  "status": "NOT_CURRENTLY_ELIGIBLE",
  "score": 70,
  "failures": ["Credit score is below the minimum requirement of 700"],
  "suggestions": ["Improve credit score before applying"]
}
```

LoanMate then explains the reason and provides practical improvement steps.

## Eligibility Rules

The configurable synthetic demo rules are stored in `backend/rules/eligibility-rules.json`:

| Rule           |          Requirement |
| -------------- | -------------------: |
| Age            |       21 to 60 years |
| Monthly income |    Minimum Rs 25,000 |
| Credit score   |          Minimum 700 |
| Employment     |       Minimum 1 year |
| FOIR           |          Maximum 50% |
| Interest rate  | 12% annual demo rate |

These are synthetic/demo criteria and are not real bank approval policies.

## EMI and FOIR

Estimated EMI uses:

```text
EMI = P * r * (1+r)^n / ((1+r)^n - 1)
```

Where:

- `P` is the loan amount
- `r` is the monthly interest rate
- `n` is the tenure in months

FOIR is calculated as:

```text
FOIR = ((existing EMI + estimated new EMI) / monthly income) * 100
```

An applicant fails the FOIR rule when it exceeds 50%.

## Technology Stack

### Frontend

- HTML
- CSS
- Vanilla JavaScript
- Vite
- Fetch API
- Responsive banking-style interface

Frontend files:

```text
frontend/index.html
frontend/src/main.js
frontend/src/api.js
frontend/src/style.css
```

### Backend

- Node.js
- Express.js
- CORS
- dotenv
- Native Fetch API

Backend files:

```text
backend/server.js
backend/routes/chat.js
backend/services/nlpService.js
backend/services/aiReplyService.js
backend/services/eligibilityService.js
backend/services/responseFormatter.js
```

### Rule Engine

```text
backend/rules/eligibility-engine.js
backend/rules/eligibility.js
backend/rules/eligibility-rules.json
```

### AI Configuration

The OpenAI key is stored only in `backend/.env`. It is never sent to the frontend.

If OpenAI is unavailable, LoanMate uses fallback extraction and explanations instead of crashing.

## API Contract

### Request

```http
POST http://localhost:3000/api/chat
```

```json
{
  "message": "I earn 55000 and have a credit score of 750",
  "sessionId": "demo-session"
}
```

### Response

```json
{
  "success": true,
  "reply": "Based on the information provided...",
  "applicant": {},
  "eligibility": {
    "eligible": false,
    "status": "NOT_CURRENTLY_ELIGIBLE",
    "score": 70
  },
  "reasons": [],
  "failures": [],
  "suggestions": [],
  "documents": [],
  "missingFields": []
}
```

### Status Values

- `LIKELY_ELIGIBLE`
- `NOT_CURRENTLY_ELIGIBLE`
- `NEEDS_MORE_INFORMATION`

If required information is missing, LoanMate does not guess financial values.

## Follow-up Conversations

Applicant information is retained by `sessionId`, allowing natural follow-up questions such as:

- How can I improve my credit score?
- What documents do I need?
- What is my EMI?
- What is FOIR?
- What should I do next?
- What if I request Rs 600000 instead?

The What-If feature sends a new normal chat request. It does not implement a second eligibility algorithm in the frontend.

## Frontend Features

- LoanMate branding
- User and assistant chat messages
- Prompt suggestions
- Loading state
- Error state
- Applicant summary
- Eligibility status and score
- Reasons and failed criteria
- Improvement suggestions
- Required documents
- Missing fields
- Explanation toggle
- What-If scenario input
- Responsive layout

## Error Handling

Invalid request:

```json
{
  "success": false,
  "error": "Message is required"
}
```

Unexpected backend failure:

```json
{
  "success": false,
  "error": "Unable to process the request"
}
```

## Running the Application

Start the backend:

```powershell
npm start --prefix backend
```

Start the frontend:

```powershell
Push-Location frontend
npm run dev
Pop-Location
```

Open the frontend:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:3000/health
```

## Judge Demonstration Flow

1. Open `http://localhost:5173`.
2. Enter a complete eligible applicant message.
3. Show the applicant summary, score, reasons, and documents.
4. Enter a rejected case with a credit score below 700.
5. Show the failed credit-score criterion and improvement guidance.
6. Ask: `How can I improve my credit score?`
7. Ask: `What documents do I need?`
8. Demonstrate the What-If feature with: `What if I request Rs 600000 instead?`
9. Demonstrate missing-information handling by sending an incomplete message.

## Judge Explanation

> LoanMate combines natural-language understanding with deterministic banking rules. OpenAI understands what the applicant says, but it never decides eligibility. The backend converts the message into a structured applicant object, evaluates it through configurable rules, calculates EMI and FOIR, and returns an explainable result. OpenAI then uses that trusted result to answer follow-up questions conversationally. This gives us both the flexibility of AI and the reliability of rule-based decision-making.

## Benefits

- Conversational and easy to use
- Explainable results
- Configurable rules
- Personalized suggestions
- Follow-up conversation support
- Missing-information handling
- No frontend business logic
- No exposed API keys
- No database or unnecessary infrastructure
- Synthetic/demo data only
- Safe fallback when AI is unavailable
