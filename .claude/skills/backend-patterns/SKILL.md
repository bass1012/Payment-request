---
name: backend-patterns
description: Backend patterns for this Node.js Express and Prisma payment-request portal, including authorization, workflow transactions, validation, uploads, PDFs and operational errors.
---

# Backend Patterns

Follow existing Express, Prisma and service-layer conventions. Keep routes thin and business decisions in their owning controller or service.

- Validate request bodies, params and formData at submission boundaries; preserve drafts without silently dropping data.
- Reload the active user and role server-side. Enforce object access and current-step validator identity on sensitive routes.
- Keep workflow version checks, validation creation and status transitions in one Prisma transaction. Run email and PDF effects afterward.
- Use Decimal for money, exact attachment relations, authenticated file routes and canonical safe-path checks.
- Select required fields, paginate filtered queries, avoid N+1 access and return explicit statuses.
- Add a focused backend test for each authorization, concurrency, validation or integrity branch.
