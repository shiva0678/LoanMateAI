# LoanMate Eligibility Rules

## Purpose

This document describes the deterministic eligibility rules used by LoanMate for preliminary personal-loan assessment.

The eligibility decision is produced by the deterministic rule engine. The LLM is only responsible for extracting applicant information from natural language.

> **These are synthetic/demo rules and not actual bank lending policies.**

---

## Personal Loan Rules

| Rule | Requirement |
|---|---:|
| Minimum age | 21 years |
| Maximum age | 60 years |
| Minimum monthly income | ₹25,000 |
| Minimum credit score | 700 |
| Minimum employment | 1 year |
| Maximum FOIR | 50% |
| Annual interest rate | 12% |

---

## 1. Age Rule

The applicant must be between 21 and 60 years old.

```text
21 <= age <= 60