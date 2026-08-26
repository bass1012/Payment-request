---
name: frontend-patterns
description: Frontend patterns for this React and Vite payment-request portal, including forms, role-aware navigation, uploads, workflow status and responsive accessibility.
---

# Frontend Patterns

Follow existing React, TypeScript, Axios and React Hook Form conventions.

- Derive request types, roles and statuses from central constants and shared contracts.
- Keep server authorization authoritative; UI guards only improve usability.
- Map local form errors to named controls, preserve existing attachments and separate preparation from upload progress.
- Treat submitted content as immutable and use the revision flow for correction requests.
- Render workflow steps from backend data and handle loading, empty, conflict and retry states.
- Use accessible labels, keyboard-safe modals, visible focus, stable dimensions and mobile layouts without horizontal overflow.
