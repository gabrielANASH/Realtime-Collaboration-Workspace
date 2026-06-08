# Architecture Overview

## Goals

The system is organized as a production SaaS monorepo with clear feature boundaries, strict TypeScript, and shared contracts that prevent drift between frontend and backend.

## Monorepo Structure

- `apps/web`: customer-facing application built with Next.js 15 App Router
- `apps/api`: Express API with Prisma, JWT auth, and Socket.io
- `packages/shared`: shared Zod schemas, DTOs, and domain types

## Frontend Architecture

The frontend uses feature-based organization instead of a flat components folder.

- `src/app`: route composition and layout shells
- `src/features/*`: domain-specific UI, API hooks, and state
- `src/components/*`: reusable presentational components
- `src/lib/*`: shared client utilities such as React Query setup
- `src/stores/*`: Zustand stores for client state

## Backend Architecture

The backend is split by business capability.

- `src/modules/auth`: login, refresh tokens, session handling
- `src/modules/workspaces`: workspace lifecycle and membership entry points
- `src/modules/documents`: markdown documents and collaboration state
- `src/modules/notifications`: delivery and unread tracking
- `src/modules/activity-logs`: audit trail and change history
- `src/modules/realtime`: Socket.io gateway and event orchestration

Each module owns its router, service layer, validators, and data access boundaries.

## Module Boundaries

- Controllers and routers translate HTTP or socket events into application calls
- Services contain business rules and orchestration
- Repositories or Prisma access stay isolated behind services
- Shared schemas define request and response contracts
- UI consumes typed hooks rather than reaching into backend internals

## Naming Conventions

- Folders use lowercase and kebab-case when needed
- React components use PascalCase files and exports
- Hooks start with `use`
- Services end with `Service`
- Routers end with `Router`
- Prisma models use singular domain names
- Zod schemas end with `Schema`

## Environment Variables

- Frontend public variables use the `NEXT_PUBLIC_` prefix
- Backend secrets stay server-only
- JWT access and refresh tokens use separate secrets
- Database and realtime URLs are isolated by service

## Future Ready Decisions

- Redis is reserved for pub/sub, caching, and rate limiting
- Docker will package the frontend, API, and database services consistently
- Shared contracts make a future mobile or admin client straightforward
