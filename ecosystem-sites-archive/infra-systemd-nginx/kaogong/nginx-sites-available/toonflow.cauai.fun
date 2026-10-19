server {
    listen 80;
    listen [::]:80;
    server_name toonflow.cauai.fun;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type text/plain;
    }
    location / {
        return 302 https://hb.cauai.fun/;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name toonflow.cauai.fun;
    ssl_certificate /etc/letsencrypt/live/plane.cauai.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/plane.cauai.fun/privkey.pem;
    location / {
        return 302 https://hb.cauai.fun/;
    }
}
