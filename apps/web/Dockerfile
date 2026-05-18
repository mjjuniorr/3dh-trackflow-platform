FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY services/backend/package*.json services/backend/
COPY apps/web/package*.json apps/web/
RUN npm install --workspace @3dh-trackflow/web --include-workspace-root
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
