server {
    listen 80;
    listen [::]:80;
    server_name plan.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }


    location / {
        return 410;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Archived Solara: keep the existing tunnel upstream available locally.
server {
    listen 127.0.0.1:18086;
    server_name plan.cauai.fun;
    location / { return 410; }
}
