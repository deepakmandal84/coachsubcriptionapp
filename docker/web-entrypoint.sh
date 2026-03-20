#!/bin/sh
set -eu

# Used by nginx reverse proxy. Keep it as a full base URL (scheme + host + optional port).
# Example: http://api:8080
API_BASE_URL="${API_BASE_URL:-http://api:8080}"

sed "s|__API_BASE_URL__|$API_BASE_URL|g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"

