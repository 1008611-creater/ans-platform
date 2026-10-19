# 河北行政执法 · 备考题本 —— 私有访问（中文登录页 + 长效登录状态）
#
# 与旧版区别：
#   旧版 auth_basic 会让 iPhone 反复弹出浏览器自带的账号密码框，出错也不提示；
#   现在：未登录 → 跳转 /login.html；登录成功 → 下发 180 天 Cookie。
#   口令仍保存在 /etc/nginx/.htpasswd_kaogong，算法不变。
#
# 双重保险：
#   正常走鉴权服务（中文登录页）；万一该服务异常，自动回退到旧版 Basic Auth，
#   保证站点始终可访问，也始终不对外裸奔。

server {
    server_name kaogong.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }


    root /var/www/kaogong;
    location = /sw.js { root /var/www/kaogong; try_files $uri =404; add_header Cache-Control "no-cache"; }
    location = / { root /var/www/kaogong-public; try_files /index.html =404; default_type text/html; add_header Cache-Control "no-cache"; }
    location ^~ /welcome/ { alias /var/www/kaogong-public/; }
    index index.html;

    # ---------- 鉴权服务（本机 127.0.0.1:8790，systemd 托管）----------
    location = /api/login {
        proxy_pass http://127.0.0.1:8790/api/login;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location = /api/logout {
        proxy_pass http://127.0.0.1:8790/api/logout;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    # 登录页用它查询「当前是否已登录」。对外可访问，但只回 204 / 401，
    # 不返回任何用户信息，也不接受写入。
    location = /api/session {
        proxy_pass http://127.0.0.1:8790/api/auth;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 内部子请求：只允许 Nginx 自己调用，不对外暴露
    location = /api/auth {
        internal;
        proxy_pass http://127.0.0.1:8790/api/auth;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Real-IP $remote_addr;
    }
    location = /api/health {
        internal;
        proxy_pass http://127.0.0.1:8790/api/health;
    }

    # ---------- 免登录：登录页自身 ----------
    # 精确匹配与 ^~ 前缀匹配优先于下面的正则，因此不会被鉴权规则拦住。
    location = /login.html { add_header Cache-Control "no-cache"; }
    location = /login.css  { add_header Cache-Control "no-cache"; }
    location = /login.js   { add_header Cache-Control "no-cache"; }
    location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }
    location = /favicon.ico { try_files $uri =404; }
    location ^~ /icons/ { try_files $uri =404; }

    # ---------- 受保护的静态资源 ----------
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|webp|json|woff2?)$ {
        auth_request /api/auth;
        error_page 401 = @tologin;
        error_page 500 502 503 504 = @fallback;
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # ---------- 其余一律要求登录 ----------
    location / {
        auth_request /api/auth;
        error_page 401 = @tologin;
        error_page 500 502 503 504 = @fallback;
        try_files $uri $uri/ /index.html;
    }

    # 未登录：送去中文登录页，并记住原地址
    location @tologin {
        add_header Cache-Control "no-store" always;
        return 302 /login.html?next=$request_uri;
    }

    # 鉴权服务异常时的兜底：退回旧版账号密码，站点不至于打不开。
    #
    # 两个坑，改动前务必看懂：
    #   1) 不能在这里直接 try_files。兜底命中后会内部重定向到 /index.html，
    #      再次进入 location /，又触发一次 auth_request，形成死循环（500）。
    #   2) 也不能在这里 auth_basic 之后 rewrite。rewrite 会重新选择 location，
    #      鉴权配置随原 location 一起失效，未登录也能直接拿到页面。
    # 所以：这里只做转发，真正的账号密码校验放在下面最终处理请求的位置。
    location @fallback {
        rewrite ^ /__private$request_uri last;
    }

    # 仅供上面的兜底分支内部调用。
    # internal：公网直接访问 /__private/ 一律 404，不会被绕过。
    location ^~ /__private/ {
        internal;
        auth_basic "Hebei Kaogong Private";
        auth_basic_user_file /etc/nginx/.htpasswd_kaogong;
        rewrite ^/__private(/.*)$ $1 break;
        root /var/www/kaogong;
        add_header Cache-Control "no-store" always;
        try_files $uri $uri/index.html =404;
    }

location = /api/auth/login {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host kaogong.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /api/auth/complete.js {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host kaogong.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
}
location = /api/auth/callback {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host kaogong.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /api/auth/session {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host kaogong.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body on;
 proxy_read_timeout 15s;
}
location = /api/auth/logout {
 access_log off;
 proxy_pass http://127.0.0.1:8151;
 proxy_set_header Host kaogong.cauai.fun;
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
 proxy_set_header Host kaogong.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Forwarded-For "";
 proxy_set_header X-Real-IP $remote_addr;
 proxy_pass_request_body off;
 proxy_set_header Content-Length "";
 proxy_read_timeout 15s;
}
location @ans_site_login { add_header Cache-Control "no-store" always; return 303 /api/auth/login; }


location ^~ /analysis/api/ {
 access_log off;
 client_max_body_size 15m;
 proxy_request_buffering off;
 proxy_pass http://127.0.0.1:8788;
 proxy_set_header Host kaogong.cauai.fun;
 proxy_set_header Cookie $http_cookie;
 proxy_set_header X-Real-IP "";
 proxy_set_header X-Forwarded-For "";
 proxy_read_timeout 45s;
 add_header Cache-Control "no-store, private" always;
}

location = /analysis { return 302 /analysis/; }
location ^~ /analysis/ {
 auth_request /_ans_site_auth;
 error_page 401 = @ans_site_login;
 types { text/html html; text/javascript js mjs; text/css css; image/svg+xml svg; image/png png; image/jpeg jpg; application/json json; application/wasm wasm; model/gltf-binary glb; }
 default_type application/octet-stream;
 add_header Cache-Control 'no-cache, must-revalidate' always;
 add_header X-Content-Type-Options nosniff always;
 add_header Referrer-Policy no-referrer always;
 add_header Content-Security-Policy "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob:; worker-src 'self'; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; frame-src 'self' https://ans.cauai.fun" always;
 try_files $uri $uri/ =404;
}

    include /etc/nginx/snippets/kaogong-trainer.conf;

    listen [::]:443 ssl http2; # managed by Certbot
    listen 443 ssl http2; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/kaogong.cauai.fun/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/kaogong.cauai.fun/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = kaogong.cauai.fun) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name kaogong.cauai.fun;

    # 2026-10-06 加：ACME http-01 校验目录（webroot 方式）。
    # 必须在 location / 之前命中，否则校验请求会被 proxy_pass 或 301 吃掉 → 续期失败。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
        try_files $uri =404;
    }

    return 404;
}
