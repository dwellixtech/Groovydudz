FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BUILD_SCRIPT=build
RUN npm run "$BUILD_SCRIPT"

FROM nginx:1.27-alpine AS runtime
ARG DIST_DIR=dist
COPY --from=build /app/${DIST_DIR} /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
