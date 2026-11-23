#!/bin/sh
# Runtime configuration: the same image serves every company.
set -eu
# The image's files are copied to /tmp and changed there, so the container can run with a read-only root filesystem.
HTML=/tmp/html
rm -rf "$HTML"
cp -R /usr/share/nginx/html "$HTML"
mkdir -p /tmp/conf.d
: "${API_URL:?API_URL is required}"
export STORAGE_ORIGIN="${STORAGE_ORIGIN:-}"
case "$API_URL" in
  *\'*|*\\*|*\<*) echo "API_URL contains invalid characters" >&2; exit 78 ;;
esac
printf "window.__LIMS_CONFIG__ = { apiUrl: '%s' };\n" "$API_URL" > "$HTML/config.js"
# The help site is built once, with neutral branding. Give it this deployment's address and name. An image built with
# its own DOCS_* values has none of these strings, so its branding stays. Safe to run again on a restart.
HELP_SED=""
if [ -n "${APP_URL:-}" ]; then
  APP_URL="${APP_URL%/}"
  printf '%s' "$APP_URL" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?$' || { echo "APP_URL must be an address such as https://app.example.com" >&2; exit 78; }
  HELP_SED="s#https://lims\.example\.com/help/#$APP_URL/help/#g;"
fi
if [ -n "${APP_NAME:-}" ]; then
  case "$APP_NAME" in
    *\"*|*\\*|*\<*) echo "APP_NAME contains invalid characters" >&2; exit 78 ;;
  esac
  # Escaped for HTML, then for sed. The character before the name is matched too, so "Acme LIMS" is not matched again.
  HELP_NAME=$(printf '%s' "$APP_NAME" | sed -e 's/&/\&amp;/g' -e 's/[&#]/\\&/g')
  HELP_SED="$HELP_SED s#| LIMS help</title>#| $HELP_NAME help</title>#; s#content=\"LIMS help\"#content=\"$HELP_NAME help\"#g; s#translate=\"no\">LIMS help<#translate=\"no\">$HELP_NAME help<#g;"
fi
if [ -n "$HELP_SED" ]; then
  find "$HTML/help" -type f \( -name '*.html' -o -name '*.xml' \) -exec sed -i "$HELP_SED" {} +
fi
# The installed app's name: the lab's name when the deployment sets APP_NAME, otherwise a neutral one.
APP_NAME="${APP_NAME:-Laboratory}"
case "$APP_NAME" in
  *\"*|*\\*|*\<*) echo "APP_NAME contains invalid characters" >&2; exit 78 ;;
esac
SHORT_NAME=$(printf '%s' "$APP_NAME" | cut -c1-12)
sed -e "s/\"name\": \"Laboratory\"/\"name\": \"$(printf '%s' "$APP_NAME" | sed 's/[&/]/\\&/g')\"/" \
    -e "s/\"short_name\": \"Laboratory\"/\"short_name\": \"$(printf '%s' "$SHORT_NAME" | sed 's/[&/]/\\&/g')\"/" \
    /usr/share/nginx/html/manifest.webmanifest > "$HTML/manifest.webmanifest"
envsubst '${API_URL} ${STORAGE_ORIGIN}' < /etc/nginx/templates/default.conf.template > /tmp/conf.d/default.conf
exec nginx -g 'daemon off;'
