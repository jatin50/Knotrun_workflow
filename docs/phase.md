# Project Phases

This document defines the order in which we'll build the platform. Each phase
builds on the previous one — we don't move to the next phase until the
current one runs end-to-end.

---

## Phase 0 — Foundation --done

Goal: a clean, runnable skeleton before any feature work.

- `.gitignore` + repo hygiene (done)
- Environment config (`.env.example` for backend and frontend)
- Docker Compose for local dev: PostgreSQL, Redis
- Prisma initialized, connected to local Postgres
- Basic Express server (`/health` endpoint) running with TypeScript + nodemon
- Basic Vite + React app shell running, Tailwind wired up

**Done when:** `docker compose up`, backend `/health` returns 200, frontend loads a blank page.

---

## Phase 1 — Database Schema --done

Goal: all core tables exist and migrate cleanly.

- Translate `models.md` into `schema.prisma`: User, Workspace, Workflow,
  WorkflowVersion, Node, Connection, Credential, Execution, ExecutionData,
  Trigger, Variable, APIKey, AuditLog
- Run first migration
- Seed script with a demo user + workspace

**Done when:** `prisma migrate dev` succeeds and Prisma Studio shows real tables.

---

## Phase 2 — Authentication --done

Goal: users can register, log in, and hit protected routes.

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- Password hashing (bcryptjs), JWT issue + verify, refresh token flow
- Auth middleware for protected routes
- Frontend: login/register pages, auth state in Zustand, protected route wrapper

**Done when:** you can register, log in from the UI, and reach a protected page with a valid token.

---

## Phase 3 — Workspaces & Workflows (CRUD only, no execution yet) --done

Goal: users can create and manage workflow "shells" — no running yet.

- `GET/POST /workspaces`, `GET/PATCH/DELETE /workspaces/:id`
- `GET/POST /workflows`, `GET/PATCH/DELETE /workflows/:id`
- Frontend: dashboard listing workspaces + workflows, create/rename/delete UI

**Done when:** you can create a workspace, create an empty workflow inside it, see it listed, rename and delete it.

---

## Phase 4 — Workflow Editor Canvas --done

Goal: the visual drag-and-drop builder, saving to the DB — still no execution.

- Wire up `@xyflow/react` (React Flow) canvas
- Node shapes for a small starter set: Manual Trigger, HTTP Request, IF, Set Variable
- Drag nodes onto canvas, connect them, position + config persisted to `Workflow`/`Node`/`Connection` tables
- Save/load a workflow's graph JSON

**Done when:** you can build a 3-node workflow visually, refresh the page, and see it reload exactly as saved.

---

## Phase 5 — Node Engine (synchronous execution) --done

Goal: a workflow can actually run, one node at a time, in-process — no queue yet.

- Define `WorkflowNode` / `NodeExecutionResult` interfaces (per `nodes.md`)
- Build the node engine: load graph → topological order → execute each node → pass output to next
- Implement the starter node set's execution logic (Manual Trigger, HTTP Request, IF, Set Variable)
- `POST /executions/test` — run a workflow synchronously and return the result
- Handle-aware branching for IF node (true/false paths executed/skipped accurately)

**Done when:** clicking "Test workflow" in the UI actually calls the real nodes and shows real output.

---

## Phase 6 — Async Execution via Queue --done

Goal: move execution off the request thread, matching the real architecture.

- BullMQ + Redis: enqueue an execution job instead of running inline
- Separate worker process consumes the queue, runs the node engine
- `Execution` + `ExecutionData` rows written per run; status tracked (running/success/failed)
- `POST /executions/start`, `GET /executions`, `GET /executions/:id`, `GET /executions/:id/logs`
- Frontend: execution history list + a single execution's detail/log view, editor direct run button

**Done when:** starting a workflow returns immediately, and you can watch its status update from "running" to "success"/"failed" via polling or a refresh.

---

## Phase 7 — Triggers (Webhook + Schedule) --done

Goal: workflows can start themselves, not just be manually triggered.

- `POST /webhooks/:id` — public endpoint that enqueues the target workflow
- Scheduler (cron) using a lightweight scheduler tied into BullMQ's repeatable jobs
- Trigger config UI on the relevant node types (Webhook URL generation & copy, Cron expression configuration)

**Done when:** a workflow with a Webhook trigger fires from an external `curl`, and one with a Schedule trigger fires on its own.

---

## Phase 8 — Credentials Manager --done

Goal: nodes can use secrets (API keys, DB creds) without storing them in plaintext.

- `Credential` model wired to encrypt/decrypt (AES-256-GCM, 32-byte key from env)
- `GET/POST/PATCH/DELETE /credentials` (workspace-level secret storage)
- Credential management UI in Workspace dashboard
- Credential picker in node config UI for HTTP Request nodes
- HTTP Request node reads from selected credential and injects into Bearer header at execution time

**Done when:** you can save an API key as a credential and have a node use it, without the raw key ever hitting the frontend after save.

---

## Phase 9 — Expand the Node Library

Goal: go from 4 starter nodes to a real, demo-able library.

- Add nodes across categories from `nodes.md`: Loop, Switch, Wait, JSON, one AI node (OpenAI or Anthropic), one Communication node (e.g. Slack or email), one DB node (Postgres)
- Each new node follows the same `WorkflowNode` contract from Phase 5

**Done when:** you can build and run a workflow that mixes triggers, logic, an AI call, and an external side-effect.

---

## Phase 10 — Polish for Demo/Resume

Goal: the project looks and behaves like a real product, not a prototype.

- Error handling + user-facing error states (frontend and API)
- Logging (Winston) and basic request/execution observability
- Loading states, empty states, basic responsive layout pass
- README rewrite: what it is, screenshots/GIF, how to run locally, architecture diagram link
- (Optional, time permitting) Docker Compose "one command" full-stack startup
- (Optional, time permitting) Deploy a live demo

**Done when:** a stranger can clone the repo, follow the README, and get a working demo in under 10 minutes — and you have a GIF/screenshot for your resume/portfolio link.

---

## Explicitly Deferred (not in scope until everything above works)

- Workflow versioning/rollback UI
- Workflow sharing / multi-tenant permissions
- Marketplace for community nodes
- Kubernetes deployment
- Real-time collaboration
- Admin panel

These are in `architecture.md`'s "Future Enhancements" — good to mention as
"what I'd build next" in an interview, not required for the working demo.
