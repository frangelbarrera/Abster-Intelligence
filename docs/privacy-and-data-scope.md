**Maintainer:** Frangel Raúl Crespo Barrera
**Last verified:** 2026-10-02
**Scope:** sources, browser permissions, local storage, telemetry, exports, headers, and application data boundaries.

| Field | Current record |
|---|---|
| Status | Next.js application with E2E coverage; privacy and security claims require runtime evidence. |
| Evidence | `src/`, `tests/e2e/`, `package.json`, `next.config.ts`, `.github/workflows/ci.yml`. |
| Verification | Use the existing lint/typecheck/build and Playwright commands; inspect `next.config.ts` for headers/CSP. |
| Owner | Repository owner; deployment operator owns provider configuration. |
| Limitations | This page does not claim secure defaults, GDPR compliance, or isolation without deployment evidence. |

List actual environment variables with fictional values only. Document storage, export, telemetry, and retention behavior when implementation changes.
