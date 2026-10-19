# Archived legacy jianli site. Current resume remains active.
server {
    server_name jianli.cauai.fun;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }
    access_log /var/log/nginx/jianli.access.log;
    error_log /var/log/nginx/jianli.error.log;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    location / { return 301 https://resume.cauai.fun$request_uri; }
    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/jianli.cauai.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jianli.cauai.fun/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    listen 80;
    listen [::]:80;
    server_name jianli.cauai.fun;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }
    location / { return 301 https://$host$request_uri; }
}
