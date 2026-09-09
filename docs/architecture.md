# LoanMate Architecture

## System Flow

```text
User
 ↓
Frontend
 ↓
POST /api/chat
 ↓
GenAI / NLP Extraction
 ↓
Applicant JSON
 ↓
Deterministic Rule Engine
 ↓
Eligibility Result
 ↓
Explanation
 ↓
Frontend