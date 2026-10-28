# Geschiedenis Achterhoek – web application image (build with `podman build -t geschiedenis-achterhoek .`)
FROM docker.io/library/node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    MEDIA_DIR=/data/media

WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY app/ ./

RUN mkdir -p /data/media && chown -R node:node /data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]
