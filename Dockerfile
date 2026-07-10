# syntax=docker/dockerfile:1

# Two stages: build the bundle with Node, serve it with nginx.
#
# The previous version of this file was an unmodified `docker init` Node template. It
# bind-mounted a yarn.lock that does not exist (this project uses npm), copied from
# /usr/src/app/build when Vue CLI emits dist/, never copied nginx.conf, and ended in a
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

# Vue CLI writes to dist/. The API base URL is baked into the bundle at build time, so it
# must be supplied here rather than at runtime.
ARG VUE_APP_API_URL
ENV VUE_APP_API_URL=${VUE_APP_API_URL}
RUN npm run build

################################################################################
# Serve the static bundle. nginx:alpine already runs as a non-root worker.
FROM nginx:${NGINX_VERSION} AS final

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# nginx.conf listens on 80; docker-compose maps 8080:80.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
