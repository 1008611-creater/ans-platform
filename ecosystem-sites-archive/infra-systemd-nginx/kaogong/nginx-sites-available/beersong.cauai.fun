server {
 listen 80;
 listen [::]:80;
 server_name beersong.cauai.fun;
 include /etc/nginx/snippets/beersong-realip.conf;
 access_log /var/log/nginx/beersong-access.log beersong_auth_safe;
 location ^~ /.well-known/acme-challenge/ { root /var/www/beersong-acme; }
 location / { return 301 https://beersong.cauai.fun$request_uri; }
}
server {
 listen 443 ssl http2;
 listen [::]:443 ssl http2;
 server_name beersong.cauai.fun;
 include /etc/nginx/snippets/beersong-realip.conf;
 access_log /var/log/nginx/beersong-access.log beersong_auth_safe;
 ssl_certificate /etc/letsencrypt/live/beersong.cauai.fun/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/beersong.cauai.fun/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 client_max_body_size 5m;
 add_header Strict-Transport-Security "max-age=31536000" always;
 add_header X-Content-Type-Options nosniff always;
 gzip on;
 gzip_types text/css application/javascript application/json image/svg+xml;
 location / {
  proxy_pass http://127.0.0.1:3108;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Proto https;
  proxy_read_timeout 120s;
 }
}
