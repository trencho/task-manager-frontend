# Task Manager — Vue 3 SPA

A single-page task manager. Register, sign in, and manage your own tasks. The client for
[task-manager-backend](https://github.com/trencho/task-manager-backend), a Spring Boot JWT API.

## Stack

| | |
|---|---|
| Framework | Vue 3.5 (Options API, single-file components) |
| Routing | vue-router 5, with per-route auth guards |
| HTTP | axios, with a shared instance that attaches the JWT and refreshes it on `401` |
| Build | Vue CLI 5 over webpack 5 |
| Tests | Jest 29 + `@vue/test-utils` 2 |
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

The backend URL comes from `VUE_APP_API_URL` in `.env`. Only `VUE_APP_`-prefixed variables reach
the bundle, and **whatever you put there is compiled into the published JavaScript** — never place
a secret in it.

The committed default is `http://spring`, the Docker Compose service hostname. That does not
resolve from a browser running outside the compose network. To run the SPA locally against a
backend on your machine, point it at the real address. The backend listens on port `80` unless
you override its `SERVER_PORT`:

```bash
VUE_APP_API_URL=http://localhost:80 npm run dev
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production bundle into `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Jest, 25 tests |

CI runs `npm ci && npm run lint && npm test && npm run build` on every push and pull request.
See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Architecture

```text
src/
├── main.js                  app entry
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
7. **Replace Vue CLI with Vite.** Vue CLI is unmaintained; its frozen dependency chain is the sole
   source of the project's remaining `npm audit` advisories, none of which ship in the bundle.

## Notes

- `npm audit` reports advisories in build tooling only. `npm audit --omit=dev` reports **0** —
  nothing vulnerable reaches the browser.
- Do **not** run `npm audit fix --force`. Its proposed "fix" downgrades `@vue/cli-*` from 5.0.9 to
  3.12.1, which breaks the build.
