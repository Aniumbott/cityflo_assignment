#!/bin/sh

# Substitute environment variable in nginx config
sed -i "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
