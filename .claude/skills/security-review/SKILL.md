---
name: security-review
description: Security checklist for authentication, RBAC, workflow validation, payment data, Prisma queries, uploads and protected PDFs in this portal.
---

# Security Review

When changing a sensitive path, verify:

- secrets stay out of source, logs, docs, fixtures and reports;
- token/session versioning rejects disabled users and changed credentials or roles;
- every request, file, PDF, export and validation checks object-level authorization server-side;
- validator identity and delegation scope are exact and revalidated in the transaction;
- input, formData, MIME type, extension, size, filenames and paths use allowlists and canonicalization;
- Prisma queries are parameterized, money uses Decimal and concurrent decisions are idempotent;
- errors do not disclose tokens, passwords, personal data or filesystem details;
- rate limits, CORS, security headers and authenticated downloads remain enabled;
- tests cover permitted and denied paths, including concurrent requests.

For a Strix report, reproduce the proof of concept, fix the root cause and re-run the scoped scan. Never resolve authorization only in React.
