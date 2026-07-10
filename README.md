# Task Manager — Vue 3 SPA

A single-page task manager. Register, sign in, and manage your own tasks. The client for
[task-manager-backend](https://github.com/trencho/task-manager-backend), a Spring Boot JWT API.

## Stack

| | |
|---|---|
| Framework | Vue 3.5 (Options API, single-file components) |
| Routing | vue-router 5, with per-route auth guards |
| HTTP | axios, with a shared instance that attaches the JWT and refreshes it on `401` |
| Build | Vite 8 |
| Tests | Vitest 4 + `@vue/test-utils` 2 |
| Lint | ESLint 8 + `eslint-plugin-vue` |
| Package manager | **npm** (`package-lock.json` is committed) |
| Deploy | Docker → nginx |

There is **no Vuex or Pinia store.** State lives in the components; the auth tokens live in
`localStorage`, behind `src/utils/auth.js`.

## Setup

```bash
git clone https://github.com/trencho/task-manager-frontend.git
cd task-manager-frontend
npm ci          # installs exactly the committed lockfile
```

Use `npm ci`, not `npm install` — it fails when `package.json` and the lockfile disagree instead
of quietly resolving around the conflict.

## Configuration

The backend URL comes from `VITE_API_URL`. Only `VITE_`-prefixed variables reach the bundle, and
**whatever you put there is compiled into the published JavaScript** — never place a secret in it.

Leave it empty (the default) and the app issues **same-origin relative requests** to `/api/...`.
In development the Vite dev server proxies those to `VITE_DEV_PROXY_TARGET`, which defaults to
`http://localhost:80` — the backend's default port. In production, either set `VITE_API_URL` at
build time or put a reverse proxy in front of nginx.

```bash
npm run dev                                   # proxies /api to http://localhost:80
VITE_DEV_PROXY_TARGET=http://localhost:9000 npm run dev
VITE_API_URL=https://api.example.com npm run build
```

See [`.env.example`](.env.example).

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR on `:8080` |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest, 31 tests |
| `npm run coverage` | Vitest + v8 coverage |

CI runs `npm ci && npm run lint && npm test && npm run build` on every push and pull request.
See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Architecture

```text
src/
├── main.js                  app entry (loaded by /index.html at the repo root)
├── App.vue                  root, renders <router-view>
├── router/index.js          routes + navigation guards
├── views/
│   ├── LoginView.vue        route /login       (requiresGuest)
│   ├── RegisterView.vue     route /signup      (requiresGuest)
│   └── TaskManagerView.vue  route /tasks       (requiresAuth)
├── components/
│   ├── LoginForm.vue        posts /api/auth/login
│   ├── RegisterForm.vue     posts /api/auth/signup
│   ├── TaskList.vue         renders tasks, paginates, confirms deletes
│   ├── TaskForm.vue         create/edit a task
│   └── LogoutButton.vue
├── utils/
│   ├── auth.js              access_token / refresh_token in localStorage
│   └── axiosSetup.js        axios instance: Bearer header + 401 refresh-and-retry
└── tests/unit/              Jest specs
```

### Routing

`/` redirects to `/login`. Routes are guarded: `requiresAuth` bounces anonymous visitors to
`/login`, and `requiresGuest` bounces signed-in users to `/tasks`.

### Authentication flow

`LoginForm` posts to `/api/auth/login` and stores the returned `accessToken` and `refreshToken`.
Every subsequent request goes through the axios instance in `utils/axiosSetup.js`, which:

1. attaches `Authorization: Bearer <accessToken>`;
2. on a `401`, calls `/api/auth/refresh-token` once, stores the new access token, and replays the
   original request;
3. clears both tokens if that refresh itself fails.

A request is only retried once — a second `401` for the same request rejects.

### API used

| Call | Endpoint |
|---|---|
| Register | `POST /api/auth/signup` |
| Sign in | `POST /api/auth/login` |
| Refresh | `POST /api/auth/refresh-token` |
| List | `GET /api/tasks?page={n}&size=10` (paginated) |
| Create | `POST /api/tasks` |
| Update | `PUT /api/tasks/{id}` |
| Delete | `DELETE /api/tasks/{id}` |

## Docker

```bash
docker compose up --build
```

Builds the bundle and serves it through nginx (`nginx.conf`). See [`README.Docker.md`](README.Docker.md).

## Roadmap

Candidate features, derived from this README and the gaps between it and the code:

1. ~~**Set a task's status from the UI.**~~ Done. `TaskForm` has a status select bound to the
   backend's `TaskStatus`, and `TaskList` shows each task's status. "Mark tasks as complete" —
   claimed by an earlier version of this README, and impossible until now — works.
2. **Sort by due date and status.** `TaskList` renders the due date as raw text and cannot sort.
   The backend's `GET /api/tasks` already accepts `sort=dueDate,asc`.
3. **Filter and search.** Depends on the matching backend feature.
4. **Surface API errors properly.** Failures are reported with `alert()`. An inline error region
   would be both accessible and testable.
5. **Introduce a store (Pinia)** *if* shared state grows beyond auth tokens. Not needed today —
   and an earlier version of this README claimed one existed when it did not.
6. **Log out server-side.** `LogoutButton` clears `localStorage`; the refresh token remains valid
   until it expires. Needs a backend revocation endpoint.
7. ~~**Replace Vue CLI with Vite.**~~ Done. `npm audit` now reports **0** advisories, down from 9.

## Notes

- `npm audit` reports **0 vulnerabilities**. The 9 advisories that used to sit in the build chain
  left with Vue CLI.
