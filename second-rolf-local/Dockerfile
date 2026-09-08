# Set NODE_IMAGE to a reviewed node image pinned by sha256 digest.
ARG NODE_IMAGE
FROM ${NODE_IMAGE}
WORKDIR /app
COPY --chown=1000:1000 core.mjs server.mjs ./
USER 1000:1000
CMD ["node", "server.mjs"]
