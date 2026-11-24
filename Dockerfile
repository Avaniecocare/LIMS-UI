# Both Node stages produce only static files, so they run on the build machine's own platform (fast, and no
# emulation when building for another architecture). Only the final nginx image is the target platform.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# The help site, built into /help. DOCS_* build arguments brand it; the API reference comes from openapi/openapi.json.
FROM --platform=$BUILDPLATFORM node:24-alpine AS docs
ARG DOCS_PRODUCT_NAME=LIMS
ARG DOCS_PRIMARY_COLOR=#1f4e79
ARG DOCS_SITE_URL=https://lims.example.com
ARG DOCS_INDEXABLE=false
ARG DOCS_VENDOR_NAME=Taravik
ARG DOCS_VENDOR_URL=https://taravik.com
ENV DOCS_PRODUCT_NAME=$DOCS_PRODUCT_NAME DOCS_PRIMARY_COLOR=$DOCS_PRIMARY_COLOR DOCS_SITE_URL=$DOCS_SITE_URL DOCS_INDEXABLE=$DOCS_INDEXABLE DOCS_VENDOR_NAME=$DOCS_VENDOR_NAME DOCS_VENDOR_URL=$DOCS_VENDOR_URL DOCS_LAST_UPDATED=false
WORKDIR /app
COPY openapi ./openapi
COPY docs-site/package*.json ./docs-site/
RUN cd docs-site && npm ci
COPY docs-site ./docs-site
RUN cd docs-site && npm run build && npm run check:links

# nginx's own image: it is rebuilt when nginx is fixed, the unprivileged variant weeks later. What that one changes is here.
FROM nginx:1.30-alpine
RUN apk upgrade --no-cache && apk add --no-cache gettext && mkdir -p /etc/nginx/templates && rm -f /etc/nginx/conf.d/default.conf \
  && sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' -e 's#/etc/nginx/conf.d/\*.conf#/tmp/conf.d/*.conf#' \
    -e 's#^http {#http {\n    client_body_temp_path /tmp/client_temp;\n    proxy_temp_path /tmp/proxy_temp;\n    fastcgi_temp_path /tmp/fastcgi_temp;\n    uwsgi_temp_path /tmp/uwsgi_temp;\n    scgi_temp_path /tmp/scgi_temp;#' /etc/nginx/nginx.conf \
  && grep -q /tmp/conf.d /etc/nginx/nginx.conf && grep -q 'pid /tmp/nginx.pid' /etc/nginx/nginx.conf && grep -q /tmp/client_temp /etc/nginx/nginx.conf && ! grep -q '^user ' /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=docs /app/docs-site/dist /usr/share/nginx/html/help
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY docker/entrypoint.sh /entrypoint.sh
# Who makes it; what it is and which commit come from the build.
LABEL org.opencontainers.image.vendor="Taravik" org.opencontainers.image.url="https://taravik.com"
# nginx, by number: Kubernetes checks runAsNonRoot against a number.
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/entrypoint.sh"]
