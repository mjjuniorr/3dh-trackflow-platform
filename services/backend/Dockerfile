FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY services/backend/package*.json services/backend/
COPY apps/web/package*.json apps/web/
RUN npm install --workspace @3dh-trackflow/backend --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY services/backend ./services/backend
WORKDIR /app/services/backend
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app/services/backend
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/services/backend/dist ./dist
COPY --from=build /app/services/backend/prisma ./prisma
COPY --from=build /app/services/backend/package.json ./package.json
COPY --from=build /app/services/backend/scripts ./scripts
RUN sed -i 's/\r$//' scripts/start.sh
EXPOSE 4000
HEALTHCHECK --interval=20s --timeout=3s --start-period=120s --retries=3 CMD ["node", "scripts/healthcheck.cjs"]
CMD ["sh", "scripts/start.sh"]
