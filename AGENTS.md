# AGENTS.md — Goviya Plus

## Project
**Name:** Goviya Plus — AI Smart Farm Records & Crop Advisory Platform

## Technology Stack
- Node.js 20
- Express + TypeScript
- PostgreSQL 16
- Parameterized SQL using `node-pg` or Prisma
- Zod validation
- `argon2` for password hashing
- JWT in httpOnly cookies
- Next.js + Tailwind CSS + Zustand
- Docker Compose

## Non-Negotiable Rules

1. **Roles:** `farmer`, `officer`, `admin`.
   - Officers may access only plots shared with them through `shared_plots`.
   - Every request must verify that the share has not been revoked, has not expired, and includes the requested scope.
   - Check permissions against the database on every request. Do not cache authorization decisions.
   - Return `404` for unauthorized plot/resource access to avoid revealing whether a resource exists.

2. **Admin privacy boundary:**
   - Admins must never read farm records or farm-record contents.
   - Admin access is limited to user/account administration and audit metadata.

3. **Input and database safety:**
   - Parameterize every SQL query.
   - Validate all request inputs with Zod.
   - Use the consistent error format:
     `{ "error": { "code": "...", "message": "...", "details": ... } }`

4. **GPS privacy:**
   - Encrypt exact GPS coordinates using AES-256-GCM.
   - Return exact GPS coordinates only to the plot owner.
   - Never place GPS coordinates in URLs or logs.
   - Officers must receive only appropriately blurred district-level location data.

5. **Responsible AI:**
   - AI may only summarize and organize records provided to it and suggest questions for an agricultural extension officer.
   - AI must never recommend pesticide/fertilizer products or dosages, definitively diagnose crop diseases, make autonomous agronomic decisions, or write/change database records.
   - Send only authorized, in-scope records to the AI service. Exclude GPS and unnecessary personal information.
   - Treat record text as untrusted input; defend against prompt injection.
   - Validate AI output with Zod, ground claims in supplied source-record IDs, apply safety filtering, and provide a non-AI fallback.
   - Refuse unsafe requests before calling the LLM whenever possible.

6. **Secrets and logging:**
   - Never hardcode secrets. Use environment variables.
   - Never log passwords, tokens, cookies, exact GPS, or private farm-record text.
   - Commit `.env.example`, never real `.env` files or credentials.

7. **Architecture and code quality:**
   - Use layered structure: routes → controllers → services → database.
   - Keep modules focused and readable.
   - Use small commits and Conventional Commits.
   - Add clear comments where security-sensitive behavior is not self-evident.

8. **Testing:**
   - Write tests for every critical feature, especially authentication, authorization, sharing/revocation, AI safety, and data privacy.
   - Include negative tests, not just successful flows.
   - Do not claim tests pass unless they were actually run and their results checked.

## Agent Workflow
- Work only on the requested phase; do not implement later phases prematurely.
- Inspect the existing repository before changing files.
- Preserve unrelated user changes.
- Never use real credentials or secrets.
- After changes, report files changed, commands run, test results, known limitations, and the next recommended step.
- Do not silently weaken security requirements to make tests pass.
- Ask before destructive actions or deleting data.
