# Frontend Agent Notes

Follow the root `AGENTS.md` rules. Historical frontend notes also live in
`claude.md`; prefer the root instructions if they conflict.

## Production Docker

- `Dockerfile` builds a standalone Next.js production server with Node 22.
- Docker uses `npm run build:docker`, which runs webpack-backed `next build`.
  Keep this separate from the local `npm run build` script while the app still
  relies on webpack aliasing in `next.config.ts`.
- `build:docker` sets `ORRERY_DOCKER_BUILD=1`, which skips the Next ESLint and
  TypeScript build gates for the current frontend backlog. Keep this Docker-only
  and do not treat it as proof that the frontend is type-clean.
- Public backend URLs are configured with `NEXT_PUBLIC_GRAPHQL_URL`,
  `NEXT_PUBLIC_GRAPHQL_WS_URL`, and `NEXT_PUBLIC_API_BASE_URL`.
- File uploads must use `${NEXT_PUBLIC_API_BASE_URL}/upload`, not a hardcoded
  localhost URL.

Detailed Docker behavior is documented in `../documentation/DOCKER.md`.
