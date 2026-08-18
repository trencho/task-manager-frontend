# Docker

`docker compose up --build` builds the production bundle and serves it through
nginx at http://localhost:8080.

`BACKEND_URL` points nginx's `/api` proxy at the backend (default
`http://spring:80`, set in the Dockerfile); override it when the backend runs
elsewhere. Leaving it unset is not an option: the entrypoint substitutes it into
the nginx config, and an empty value renders `proxy_pass ;`, which nginx refuses
to start on.

The image is built locally by compose; nothing publishes it to a registry.

### References

* [Docker's Node.js guide](https://docs.docker.com/language/nodejs/)
