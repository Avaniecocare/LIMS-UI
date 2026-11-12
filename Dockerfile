FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
USER root
RUN apk add --no-cache gettext && mkdir -p /etc/nginx/templates && rm -f /etc/nginx/conf.d/default.conf \
  && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY docker/entrypoint.sh /entrypoint.sh
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/entrypoint.sh"]
