#!/bin/sh
# Runtime configuration: the same image serves every company.
set -eu
: "${API_URL:?API_URL is required}"
export STORAGE_ORIGIN="${STORAGE_ORIGIN:-}"
case "$API_URL" in
  *\'*|*\\*|*\<*) echo "API_URL contains invalid characters" >&2; exit 78 ;;
esac
printf "window.__LIMS_CONFIG__ = { apiUrl: '%s' };\n" "$API_URL" > /usr/share/nginx/html/config.js
# The installed app's name: the lab's name when the deployment sets APP_NAME, otherwise a neutral one.
APP_NAME="${APP_NAME:-Laboratory}"
case "$APP_NAME" in
  *\"*|*\\*|*\<*) echo "APP_NAME contains invalid characters" >&2; exit 78 ;;
esac
SHORT_NAME=$(printf '%s' "$APP_NAME" | cut -c1-12)
sed -e "s/\"name\": \"Laboratory\"/\"name\": \"$(printf '%s' "$APP_NAME" | sed 's/[&/]/\\&/g')\"/" \
    -e "s/\"short_name\": \"Laboratory\"/\"short_name\": \"$(printf '%s' "$SHORT_NAME" | sed 's/[&/]/\\&/g')\"/" \
    /usr/share/nginx/html/manifest.webmanifest > /tmp/manifest.webmanifest && cat /tmp/manifest.webmanifest > /usr/share/nginx/html/manifest.webmanifest
envsubst '${API_URL} ${STORAGE_ORIGIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
