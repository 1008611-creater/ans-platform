server {
    server_name sd2.cauai.fun;

    client_max_body_size 110m;

    location ^~ /reborn/ {
        alias /opt/reborn/;
        autoindex on;
        sendfile on;
        etag on;
        add_header Access-Control-Allow-Origin *;
    }

    # 2026-10-06 加：ACME http-01 校验目录。
    # 必须在 return 301 之前命中，否则请求会被跳到 https 再被上游应用吃掉 → 404 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }

    location /_niannian_video/ {
        internal;
        alias /var/lib/docker/volumes/niannian-ai-video-workbench_niannian-data/_data/video-outputs/;
        sendfile on;
        etag on;
        types { video/mp4 mp4; video/webm webm; video/quicktime mov; }
        default_type application/octet-stream;
    }
    location / {
        proxy_pass http://127.0.0.1:18084;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Niannian-Accel 1;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/sd2.cauai.fun/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/sd2.cauai.fun/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
        listen 80;
    listen [::]:80;
    server_name sd2.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录。
    # 必须在 return 301 之前命中，否则请求会被跳到 https 再被上游应用吃掉 → 404 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }


}
