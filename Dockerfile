# syntax=docker/dockerfile:1

# Two stages: build the bundle with Node, serve it with nginx.
#
# The previous version of this file was an unmodified `docker init` Node template. It
# bind-mounted a yarn.lock that does not exist (this project uses npm), copied from
# /usr/src/app/build when the bundler emits dist/, never copied nginx.conf, and ended in a
# node:alpine stage whose CMD invoked an nginx that was not installed. It could not build,
# and could not have run if it had.

ARG NODE_VERSION=22.20.0
ARG NGINX_VERSION=1.29-alpine

################################################################################
# Build the production bundle.
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /usr/src/app

# `npm ci` installs exactly the committed lockfile and fails if package.json and
# package-lock.json disagree. Copy only the manifests first so this layer caches.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Vite writes to dist/. Only VITE_-prefixed variables reach the bundle, and their values are
# compiled into it, so the API base URL must be supplied at build time, not at runtime. Leave
# it empty to emit same-origin relative requests for a reverse proxy to handle.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

################################################################################
# Serve the static bundle. nginx:alpine already runs as a non-root worker.
FROM nginx:${NGINX_VERSION} AS final

# Rendered into /etc/nginx/conf.d/default.conf at container start. A default is essential:
# an unset BACKEND_URL renders `proxy_pass ;` and nginx refuses to start.
ENV BACKEND_URL=http://spring:80
# Substitute only BACKEND_URL, leaving nginx's own $host, $uri, $scheme intact.
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# The template listens on 80; docker-compose maps 8080:80.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
