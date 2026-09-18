#!/bin/sh
set -e

# Inject the API_BASE_URL env var into a runtime config.js served to the browser
cat > /usr/share/nginx/html/assets/js/config.js <<EOF
window.API_BASE_URL = "${API_BASE_URL}";
EOF

# Railway provides PORT at runtime; substitute it into the nginx config
export PORT="${PORT:-8080}"
envsubst '${PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
