# LoanMate

LoanMate is an AI-powered conversational assistant for preliminary personal-loan eligibility guidance. Users describe their situation naturally, receive a deterministic eligibility assessment, and can ask follow-up questions about documents, EMI, FOIR, and improvement steps.

> This is a synthetic demo. Results are preliminary and are not final loan approval.

## Features

- Natural-language applicant data extraction
- Configurable deterministic eligibility rules
- Eligibility status, score, reasons, failures, and suggestions
- Personalized follow-up answers using applicant session context
- Document checklist and missing-information handling
- EMI and FOIR calculation
- What-if loan scenarios
- Safe fallback when OpenAI is unavailable
- Responsive banking-style chat interface

## Architecture

```text
User message
		|
		v
Frontend chat UI
		|
		v
POST /api/chat
		|
		v
OpenAI extracts applicant facts
		|
		v
Structured Applicant object
		|
		v
Deterministic eligibility rule engine
		|
		v
Eligibility result
		|
		v
OpenAI explains the trusted result
		|
		v
Frontend response UI
```

OpenAI does not decide eligibility. The rule engine in `backend/rules/` is the single source of truth for eligibility, score, failures, and suggestions.

## Technology Stack

- Frontend: HTML, CSS, Vanilla JavaScript, Vite
- Backend: Node.js, Express, CORS, dotenv
- AI: OpenAI API with structured JSON extraction
- Rule engine: Configurable JSON rules and deterministic JavaScript
- Data: Synthetic demo data only; no database or authentication

## Project Structure

```text
backend/
	server.js
	routes/chat.js
	services/
		nlpService.js
		aiReplyService.js
		eligibilityService.js
		responseFormatter.js
	rules/
		eligibility-engine.js
		eligibility.js
		eligibility-rules.json
frontend/
	index.html
	src/
		main.js
		api.js
		style.css
docs/
	loanmate-overview.md
```

## Eligibility Rules

The configurable synthetic rules are in `backend/rules/eligibility-rules.json`:

| Rule                 |   Demo requirement |
| -------------------- | -----------------: |
| Age                  |     21 to 60 years |
| Monthly income       | At least Rs 25,000 |
| Credit score         |       At least 700 |
| Employment           |    At least 1 year |
| FOIR                 |        At most 50% |
| Annual interest rate |                12% |

FOIR is calculated as:

```text
((existing EMI + estimated new EMI) / monthly income) * 100
```

## Conversation Capabilities

Applicant context is retained by `sessionId`, allowing LoanMate to answer follow-up questions such as:

- How can I improve my credit score?
- What documents do I need?
- What is my EMI?
- What is FOIR?
- What should I do next?
- What if I request a different loan amount?

The frontend displays the applicant summary, eligibility result, score, reasons, failures, suggestions, documents, missing fields, explanations, and What-If scenarios returned by the backend.
