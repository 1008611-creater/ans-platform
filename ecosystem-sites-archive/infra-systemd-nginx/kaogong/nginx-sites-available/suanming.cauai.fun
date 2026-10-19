server {
 server_name suanming.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }

 root /var/www/suanming-releases/workbench-0.6.5-e0dc080ec1830537-4d9da33516e6;
 add_header X-Content-Type-Options "nosniff" always; add_header Referrer-Policy "no-referrer" always; add_header X-Frame-Options "DENY" always;
 index index.html;
location = /api/auth/login {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host suanming.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /api/auth/callback {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host suanming.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /api/auth/session {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host suanming.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /api/auth/logout {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host suanming.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /_ans_site_auth {
 internal;
 access_log off;
 proxy_pass http://127.0.0.1:8151/api/auth/check;
 proxy_set_header Host suanming.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body off;
 proxy_set_header Content-Length "";
 proxy_read_timeout 15s;
}
location @ans_site_login { add_header Cache-Control "no-store" always; return 303 /api/auth/login; }

 location = /api/career {
  auth_request /_ans_site_auth;
  access_log off;
  client_max_body_size 32k;
  client_body_timeout 15s;
  proxy_pass http://127.0.0.1:8140;
  proxy_http_version 1.1;
  proxy_set_header Host suanming.cauai.fun;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For "";
  proxy_set_header X-Forwarded-Host "";
  proxy_set_header X-Forwarded-Proto "";
  proxy_set_header Authorization "";
  proxy_set_header Connection "";
  proxy_request_buffering on;
  proxy_buffering off;
  proxy_next_upstream off;
  proxy_connect_timeout 2s;
  proxy_send_timeout 15s;
  proxy_read_timeout 70s;
 }
 location = /api/career/config {
  auth_request /_ans_site_auth;
  access_log off;
  client_max_body_size 32k;
  client_body_timeout 15s;
  proxy_pass http://127.0.0.1:8140;
  proxy_http_version 1.1;
  proxy_set_header Host suanming.cauai.fun;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For "";
  proxy_set_header X-Forwarded-Host "";
  proxy_set_header X-Forwarded-Proto "";
  proxy_set_header Authorization "";
  proxy_set_header Connection "";
  proxy_request_buffering on;
  proxy_buffering off;
  proxy_next_upstream off;
  proxy_connect_timeout 2s;
  proxy_send_timeout 15s;
  proxy_read_timeout 70s;
 }
 location / { auth_request /_ans_site_auth; error_page 401 = @ans_site_login; try_files $uri $uri/ =404; }
 # 入口与算法产物必须每次校验：部署新版本后浏览器不能继续吃 1 小时的旧缓存。
 location ~* \.html$ { auth_request /_ans_site_auth; error_page 401 = @ans_site_login; add_header Cache-Control "no-cache, must-revalidate"; add_header X-Content-Type-Options "nosniff" always; add_header Referrer-Policy "no-referrer" always; add_header X-Frame-Options "DENY" always; try_files $uri =404; }
 location ~* \.(js|css|svg|json)$ { auth_request /_ans_site_auth; error_page 401 = @ans_site_login; add_header Cache-Control "no-cache, must-revalidate"; add_header X-Content-Type-Options "nosniff" always; add_header Referrer-Policy "no-referrer" always; add_header X-Frame-Options "DENY" always; try_files $uri =404; }
 location ~* \.(png|jpg|jpeg|gif|webp|ico|woff2?)$ { auth_request /_ans_site_auth; error_page 401 = @ans_site_login; expires 7d; add_header Cache-Control "public"; add_header X-Content-Type-Options "nosniff" always; add_header Referrer-Policy "no-referrer" always; add_header X-Frame-Options "DENY" always; try_files $uri =404; }

    listen [::]:443 ssl; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/suanming.cauai.fun/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/suanming.cauai.fun/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}server {
    if ($host = suanming.cauai.fun) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


 listen 80;
 listen [::]:80;
 server_name suanming.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }

    return 404; # managed by Certbot


}