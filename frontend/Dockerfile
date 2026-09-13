# Stage 1: build — compile the React+Vite app into static dist/ (node/npm only here)
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: runtime — nginx serves the static dist on :3000 (no node/npm)
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /app/dist

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]