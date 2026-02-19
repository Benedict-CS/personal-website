# Stage 1: Dependencies
FROM node:20-slim AS deps


# Run migrations on startup, then start the app (so you never have to run migrate manually after deploy)
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && exec node server.js"]
