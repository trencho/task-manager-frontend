# Task Manager — Vue 3 SPA

A single-page task manager. Register, sign in, and manage your own tasks. The client for
[task-manager-backend](https://github.com/trencho/task-manager-backend), a Spring Boot JWT API.

## Stack

| | |
|---|---|
| Language | TypeScript 6 (strict) |
| Framework | Vue 3.5 (Composition API, `<script setup>` single-file components) |
| Routing | vue-router 5, with per-route auth guards |
| HTTP | axios, with a shared instance that attaches the JWT and refreshes it on `401` |
| Build | Vite 8 |
| Type-check | `vue-tsc` |
| Tests | Vitest 4 + `@vue/test-utils` 2 |
| Lint | ESLint 10 (flat config) + `eslint-plugin-vue` + `typescript-eslint` |
| Package manager | **Yarn 4 (Berry)**, Corepack-pinned (`yarn.lock` is committed) |
| Deploy | Docker → nginx |

TypeScript is pinned to **6.x**, not the newer 7.x: `typescript-eslint` supports only `<6.1.0`, so 6.0
is the newest version the whole toolchain (vue-tsc + typescript-eslint) agrees on. This mirrors the
existing policy of holding tool majors until the ecosystem catches up.

There is **no Vuex or Pinia store.** State lives in the components; the auth tokens live in
`localStorage`, behind `src/utils/auth.ts`.

## Setup

```bash
git clone https://github.com/trencho/task-manager-frontend.git
cd task-manager-frontend
corepack enable            # activates the Yarn version pinned in package.json
yarn install --immutable   # installs exactly the committed lockfile
```

Yarn is managed by [Corepack](https://nodejs.org/api/corepack.html) (bundled with Node), so the
exact Yarn version comes from `package.json`'s `packageManager` field — no global install needed.
Use `yarn install --immutable`, not a plain `yarn install` — it fails when `package.json` and
`yarn.lock` disagree instead of quietly rewriting the lockfile.

## Configuration

The backend URL comes from `VITE_API_URL`. Only `VITE_`-prefixed variables reach the bundle, and
**whatever you put there is compiled into the published JavaScript** — never place a secret in it.

Leave it empty (the default) and the app issues **same-origin relative requests** to `/api/...`.
In development the Vite dev server proxies those to `VITE_DEV_PROXY_TARGET`, which defaults to
`http://localhost:80` — the backend's default port. In the Docker image, nginx proxies them to
`BACKEND_URL`. Set `VITE_API_URL` only to point a bundle at a *different* origin, which then
needs CORS on the backend.

```bash
yarn dev                                      # proxies /api to http://localhost:80
VITE_DEV_PROXY_TARGET=http://localhost:9000 yarn dev
VITE_API_URL=https://api.example.com yarn build
```

| Variable | Where | Default | Notes |
|---|---|---|---|
| `VITE_API_URL` | build time | empty | Compiled into the bundle. Empty means same-origin. |
| `VITE_DEV_PROXY_TARGET` | `yarn dev` | `http://localhost:80` | Dev server only |
| `BACKEND_URL` | container run time | `http://spring:80` | Where nginx forwards `/api`. An unset value makes nginx refuse to start. |

See [`.env.example`](.env.example).

## Scripts

| Command | Does |
|---|---|
| `yarn dev` | Vite dev server with HMR on `:8080` |
| `yarn build` | Production bundle into `dist/` |
| `yarn preview` | Serve the built bundle locally |
| `yarn lint` | ESLint |
| `yarn type-check` | `vue-tsc` — type-checks `.ts` and `.vue` |
| `yarn test` | Vitest, 89 tests |
| `yarn coverage` | Vitest + v8 coverage |

CI runs `yarn install --immutable && yarn lint && yarn type-check && yarn test && yarn build` on every push and pull request.
See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Architecture

```text
src/
├── main.ts                  app entry (loaded by /index.html at the repo root)
├── App.vue                  root, renders <router-view>
├── env.d.ts                 ambient types (import.meta.env.VITE_API_URL)
├── types.ts                 shared domain types (Task, NewTask, PagedTasks, Filters, …)
├── router/index.ts          routes + navigation guards
├── views/
│   ├── LoginView.vue        route /login       (requiresGuest)
│   ├── RegisterView.vue     route /signup      (requiresGuest)
│   └── TaskManagerView.vue  route /tasks       (requiresAuth)
├── components/
│   ├── LoginForm.vue        posts /api/auth/login
│   ├── RegisterForm.vue     posts /api/auth/signup
│   ├── TaskList.vue         renders tasks, paginates, confirms deletes
│   ├── TaskForm.vue         create/edit a task (title, description, due date, status, priority)
│   ├── TaskFilters.vue      search, status/priority filters, due-before, and sort
│   ├── ErrorBanner.vue      inline, accessible API-error region (replaced alert())
│   └── LogoutButton.vue
├── constants/
│   ├── taskStatus.ts        PENDING / IN_PROGRESS / COMPLETED (+ TaskStatus type)
│   ├── taskPriority.ts      LOW / MEDIUM / HIGH (+ TaskPriority type)
│   └── taskFilters.ts       SORT_OPTIONS + emptyFilters()
├── utils/
│   ├── auth.ts              access_token / refresh_token in localStorage
│   ├── axiosSetup.ts        axios instance: Bearer header + 401 refresh-and-retry
│   └── errorMessage.ts      maps an axios failure to display text for ErrorBanner
└── tests/unit/              Vitest specs
```

### Routing

`/` redirects to `/login`. Routes are guarded: `requiresAuth` bounces anonymous visitors to
`/login`, and `requiresGuest` bounces signed-in users to `/tasks`.

### Authentication flow

`LoginForm` posts to `/api/auth/login` and stores the returned `accessToken` and `refreshToken`.
Every subsequent request goes through the axios instance in `utils/axiosSetup.ts`, which:

1. attaches `Authorization: Bearer <accessToken>`;
2. on a `401`, calls `/api/auth/refresh-token` once, stores the **new access token and the
   rotated refresh token**, and replays the original request;
3. clears both tokens if that refresh itself fails, and does not replay the request.

A request is only retried once — a second `401` for the same request rejects. The refresh call
goes through a separate axios client with no interceptors, so a `401` from `/refresh-token`
cannot recurse back into the refresh handler.

### API used

| Call | Endpoint |
|---|---|
| Register | `POST /api/auth/signup` |
| Sign in | `POST /api/auth/login` |
| Refresh | `POST /api/auth/refresh-token` (returns a rotated refresh token) |
| Sign out | `POST /api/auth/logout` (revokes the refresh token) |
| List | `GET /api/tasks` — paginated (`page`, `size`), with optional `q`, `status`, `priority`, `dueBefore`, and `sort` from the filter bar |
| Create | `POST /api/tasks` |
| Update | `PUT /api/tasks/{id}` |
| Delete | `DELETE /api/tasks/{id}` |

## Docker

```bash
docker compose up --build
```

Builds the bundle and serves it through nginx (`nginx.conf`). See [`README.Docker.md`](README.Docker.md).

## Roadmap

No open roadmap items — every feature this README describes is implemented.

A Pinia/Vuex store is deliberately **not** on the roadmap: state stays component-local until it needs
to be shared beyond the auth tokens (see "There is no Vuex or Pinia store" above). If that need
appears, introducing a store becomes the first real item here.

## Notes

- `yarn npm audit` reports **0 vulnerabilities**. The 9 advisories that used to sit in the build chain
  left with Vue CLI.
