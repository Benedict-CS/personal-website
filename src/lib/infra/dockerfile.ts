export function generateTenantDockerfile(siteSlug: string, imageTag: string): string {
  return [
    "FROM node:20-alpine AS base",
    "WORKDIR /app",
    "COPY package.json package-lock.json ./",
    "RUN npm ci --omit=dev",
    "COPY . .",
    "ENV NODE_ENV=production",
    `ENV TENANT_SITE_SLUG=${siteSlug}`,
    `ENV IMAGE_TAG=${imageTag}`,
    'EXPOSE 3000',
    'CMD ["npm", "run", "start"]',
  ].join("\n");
}

