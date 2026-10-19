server {
    server_name zsm.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }


    # qjb-six-v1 isolated preview; existing production stays on port 4195.
    location = /studio-next { return 308 /studio-next/studio; }
    location = /studio-next/api/shoot/auth/callback {
        access_log off;
        proxy_pass http://127.0.0.1:4196;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location = /api/access/state {
        proxy_pass http://127.0.0.1:4196/studio-next/api/shoot/bootstrap;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location = /api/shoots {
        client_max_body_size 9m;
        proxy_pass http://127.0.0.1:4196/studio-next/api/shoot/jobs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location ^~ /api/shoot/ {
        client_max_body_size 9m;
        proxy_pass http://127.0.0.1:4196/studio-next/api/shoot/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location ^~ /studio-next/ {
        client_max_body_size 9m;
        proxy_pass http://127.0.0.1:4196;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        add_header X-Robots-Tag "noindex, nofollow" always;
    }

    # Current vibephoto entry; preserve legacy service for rollback.
    location = / { return 302 /studio-next/studio$is_args$args; }
    location = /studio { return 302 /studio-next/studio$is_args$args; }
    location = /studio/ { return 302 /studio-next/studio$is_args$args; }

    location / {
        proxy_pass http://127.0.0.1:4195;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen [::]:443 ssl; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/zsm.cauai.fun/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/zsm.cauai.fun/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}server {
    if ($host = zsm.cauai.fun) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    listen [::]:80;
    server_name zsm.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }

    return 404; # managed by Certbot


}