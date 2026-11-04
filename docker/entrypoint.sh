#!/bin/sh
# Runtime configuration: the same image serves every company.
set -eu
: "${API_URL:?API_URL is required}"
export STORAGE_ORIGIN="${STORAGE_ORIGIN:-}"
case "$API_URL" in
  *\'*|*\\*|*\<*) echo "API_URL contains invalid characters" >&2; exit 78 ;;
esac
printf "window.__LIMS_CONFIG__ = { apiUrl: '%s' };\n" "$API_URL" > /usr/share/nginx/html/config.js
envsubst '${API_URL} ${STORAGE_ORIGIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
