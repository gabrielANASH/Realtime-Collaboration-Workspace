# Realtime Collaboration Workspace

A production-grade monorepo for a real-time collaborative document editing platform — inspired by Notion and Slack. Built with TypeScript, Next.js 15, Express, Prisma, and Socket.IO.

---

## Key Features

- **Real-Time Collaborative Editing** — Multiple users edit the same document simultaneously with Operational Transform (OT) for conflict-free convergence
- **Threaded Comments & Mentions** — Discuss documents inline with reply threads and @-mention notifications
- **Workspace Management** — Create workspaces, invite members, assign roles (owner, admin, member, viewer)
- **JWT Authentication** — Secure access/refresh token rotation with automatic silent refresh
- **Password Reset Flow** — Forgot password and token-based reset with expiry
- **Activity Logs** — Full audit trail of workspace actions with actor, entity, and metadata
- **Notifications** — In-app notifications for workspace invites, mentions, and document updates
- **Live Cursor Presence** — See other users' cursors and editing status in real time
- **Role-Based Access Control** — Granular permissions per workspace role
- **Production-Grade API Security** — Helmet headers, CORS, rate limiting, request validation (Zod), structured logging

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Collaborator  │  │  Document    │  │  Workspace        │  │
│  │ Editor (OT)   │  │  Comments    │  │  Shell            │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴──────────┐  │
│  │              Zustand Stores + React Query               │  │
│  └──────────────────────────┬──────────────────────────────┘  │
│                             │                                 │
│  ┌──────────────────────────┴──────────────────────────────┐  │
│  │              Socket.IO Client + REST Client              │  │
│  └──────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTP / WebSocket
┌─────────────────────────────┼────────────────────────────────┐
│                     API (Express + Socket.IO)                 │
│  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ Auth      │ │Workspaces│ │ Documents  │ │ Real-Time   │  │
│  │ Module    │ │Module    │ │ Module     │ │ Gateway     │  │
│  ├───────────┤ ├──────────┤ ├────────────┤ ├─────────────┤  │
│  │ JWT       │ │Membership│ │Collaborator│ │ Room Mgmt   │  │
│  │ Tokens    │ │ RBAC     │ │ OT Engine  │ │ Broadcast   │  │
│  └───────────┘ └──────────┘ └────────────┘ └─────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │             Middleware: Helmet · CORS · Rate Limit     │  │
│  │             Validation · Request Logger · Error Handler│  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                     │
│              ┌──────────┴──────────┐                          │
│              │   Prisma ORM        │                          │
│              │   PostgreSQL        │                          │
│              └─────────────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

### How Real-Time Collaboration Works

1. User A types in a document → client generates a `DocumentEdit` operation (insert/delete/replace with position)
2. Operation is applied optimistically to the local Zustand store for instant feedback
3. Operation is broadcast to other connected users via Socket.IO (`document:edit` event)
4. Server relays the operation to all other clients in the workspace room (`document:edit-remote`)
5. Receiving clients transform the operation against their own pending operations using OT to ensure convergence
6. Every 5 seconds of inactivity, pending edits are persisted to PostgreSQL via the `/collaborate` endpoint
7. Server validates version (optimistic locking with `updateMany + where: { version }`) and stores the updated content
8. On version conflict (409), the client shows a conflict resolution dialog — users can accept their version, the server version, or merge

---

## Monorepo Structure

```
realtime-collaboration-workspace/
├── apps/
│   ├── api/                    # Express + Prisma backend
│   │   ├── prisma/             # Database schema + migrations
│   │   └── src/
│   │       ├── config/         # Env validation, logger
│   │       ├── lib/            # Prisma client, shared utilities
│   │       ├── middleware/      # Auth, validation, rate limiting, request logger, error handler
│   │       └── modules/        # Feature modules (auth, workspaces, documents, etc.)
│   └── web/                    # Next.js 15 App Router frontend
│       ├── app/                # Pages (error, loading, not-found boundaries)
│       └── src/
│           ├── features/       # Feature components + hooks
│           ├── hooks/          # Shared hooks (collaborative document, realtime)
│           ├── lib/            # Operational transform, socket client, API client
│           └── stores/         # Zustand stores (auth, document editor)
├── packages/
│   └── shared/                 # Shared Zod schemas, types, and contracts
├── docs/                       # Architecture documentation
├── turbo.json                  # Turborepo pipeline configuration
└── pnpm-workspace.yaml         # pnpm workspace definition
```

---

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript 5.5 |
| **Backend**  | Express 4, TypeScript, Prisma ORM |
| **Database** | PostgreSQL (Neon serverless) |
| **Real-Time**| Socket.IO 4 (WebSocket + polling) |
| **Auth**     | JWT (access + refresh tokens), bcrypt |
| **State**    | Zustand 5, React Query 5 |
| **Validation**| Zod (shared between frontend and backend) |
| **Build**    | Turborepo, pnpm workspaces |
| **Security** | Helmet, CORS, express-rate-limit |
| **Linting**  | ESLint 10 (flat config), typescript-eslint, eslint-plugin-react |

---

## Authentication System

- **Register** — Create account with email + password (bcrypt hashed)
- **Login** — Returns `accessToken` (15m) + `refreshToken` (30d)
- **Silent Refresh** — Automatic token rotation via `/auth/refresh` when access token expires
- **Logout** — Revoke refresh token server-side
- **JWT Payload** — Contains `userId`, `email`, `name`; verified via `auth.middleware.ts`
- **Socket Auth** — JWT verified on Socket.IO connection via middleware

## Forgot Password / Reset Password

- **Forgot Password** — `POST /auth/forgot-password` accepts email, generates a time-limited reset token (hashed, stored in `PasswordResetToken` table)
- **Reset Password** — `POST /auth/reset-password` accepts token + new password, validates token expiry, updates password hash, revokes token
- Token expires after configured duration; one-time use only

## Real-Time Collaboration System

- **OT Engine** — Custom character-level Operational Transform in `operational-transform.ts` supporting insert/delete/replace operations with position-based transformation
- **Socket Events** — `document:edit`, `document:edit-remote`, `document:saved`, `document:conflict`, `cursor:update`, `user:cursor`
- **Optimistic Updates** — Local edits applied instantly to Zustand store, broadcast asynchronously
- **Conflict Resolution** — Optimistic locking using document version number; 409 response triggers a conflict dialog
- **Debounced Persistence** — Edits batched and persisted 5s after last keystroke
- **Beforeunload Save** — Uses `navigator.sendBeacon` for last-mile persistence
- **Cursor Awareness** — Throttled cursor position broadcast to all collaborators in the workspace room
- **Room Management** — Users join/leave workspace rooms on Socket.IO; presence tracked via heartbeat

## Activity Feed

- Every workspace action (document create, member join, role change, etc.) is logged to the `ActivityLog` table
- Logs include: actor ID, action type, entity type/ID, metadata (JSON), and timestamp
- Queried via `GET /workspaces/:wid/activity-logs` with pagination
- UI feed component in `features/activity-logs/activity-log-feed.tsx`

## Notifications

- Four notification types: `workspace_invite`, `mention`, `document_update`, `system`
- Stored in `Notification` table with `readAt` tracking
- Fetched via `GET /notifications` with unread count
- Mark as read via `PATCH /notifications/:id/read`
- Real-time push via Socket.IO (`notification:new` event)

## Workspace Management

- **CRUD** — Create, read, update, delete workspaces
- **Membership** — Invite users, list members, remove members
- **Roles** — `owner`, `admin`, `member`, `viewer` with authorization checks per role
- **Authentication middleware** verifies workspace membership for all document/comment operations

## User Settings

- **Update Profile** — Change name and email via `PATCH /users/me`
- **Change Password** — Verify current password, update to new password via `POST /auth/change-password`
- **Public Profile** — User data exposed via `GET /users/:userId`

---

## Database Overview

**PostgreSQL with Prisma ORM (8 models + 2 enums):**

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `User` | email, passwordHash, mentionKey | Authentication and identity |
| `Workspace` | name, ownerId, description | Collaboration spaces |
| `Membership` | userId, workspaceId, role | RBAC (owner/admin/member/viewer) |
| `Document` | title, content, version | Documents with OT versioning |
| `DocumentEdit` | operation (JSON), version | Edit history and audit |
| `Comment` | content, parentId, documentId | Threaded discussions |
| `Notification` | type, title, body, readAt | In-app notifications |
| `ActivityLog` | action, entityType, entityId, metadata | Audit trail |
| `PasswordResetToken` | tokenHash, expiresAt, usedAt | Secure password resets |
| `RefreshToken` | tokenHash, expiresAt, revokedAt | JWT refresh rotation |

---

## Local Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL database (local or [Neon](https://neon.tech) free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/gabrielANASH/Realtime-Collaboration-Workspace.git
cd Realtime-Collaboration-Workspace

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter api exec prisma generate
```

### Environment Setup

Copy the template environment files:

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env
```

Edit `apps/api/.env` with your database URL and JWT secrets.

### Database Setup

```bash
# Run migrations
pnpm --filter api exec prisma migrate dev

# (Optional) Seed sample data
pnpm --filter api exec prisma db seed
```

### Development

```bash
# Start both API and web in dev mode
pnpm dev

# Or start individually:
pnpm --filter api dev   # API on http://localhost:4000
pnpm --filter web dev   # Web on http://localhost:3000
```

### Quality

```bash
# TypeScript check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Description |
|---------|-------------|
| `NODE_ENV` | Environment (`development`, `production`) |
| `PORT` | Server port (default: `4000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct database URL (for migrations) |
| `JWT_ACCESS_SECRET` | Secret for access tokens (32-byte hex) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (32-byte hex) |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL (default: `30d`) |
| `SOCKET_CORS_ORIGIN` | Allowed frontend origin for WebSocket CORS |
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `API_RATE_LIMIT_WINDOW` | Rate limit window in ms |
| `API_RATE_LIMIT_MAX` | Max requests per window |

### Web (`apps/web/.env`)

| Variable | Description |
|---------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL (default: `http://localhost:4000`) |

---

## Future Improvements

- TipTap rich text editor integration with ProseMirror for WYSIWYG editing
- File upload and attachment support
- Markdown import/export
- Document templates
- Search across documents and workspaces
- Email notification delivery
- Webhook integrations
- Document version history diff view
- Mobile-responsive UI
- Dark mode toggle
- Keyboard shortcuts palette

---

## License

MIT
