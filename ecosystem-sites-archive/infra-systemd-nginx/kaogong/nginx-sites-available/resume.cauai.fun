server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name resume.cauai.fun;
    root /var/www/resume.cauai.fun;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/resume.cauai.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/resume.cauai.fun/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/resume.cauai.fun.access.log;
    error_log /var/log/nginx/resume.cauai.fun.error.log;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    location ~* ^/assets/.*\.(js|css)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
    }

    location /models/ {
        # me.glb?v=... is versioned; keep the large model cached for one year.
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        gzip_static always;
        gzip_types model/gltf-binary;
        types { model/gltf-binary glb; }
        default_type model/gltf-binary;
        access_log off;
    }

    # ⚠️ 必须显式声明 image/webp：本机 /etc/nginx/mime.types 虽含 webp，
    # 但 location 里的 types 块会**覆盖**继承来的映射，没列到的后缀会落到
    # default_type —— 之前 env.webp 就被当成 application/octet-stream 发出，
    # 并被 CDN 原样缓存。浏览器靠嗅探多半能解码，但这是错的。
    location /textures/ {
        add_header Cache-Control "public, max-age=2592000" always;
        types {
            image/webp webp;
            application/octet-stream hdr;
        }
        default_type image/webp;
        access_log off;
    }

    # 作品封面：内容极少变动，长缓存。
    # 不加这条会落到 location / ，缓存只有 1 小时。
    location /works/ {
        add_header Cache-Control "public, max-age=2592000" always;
        types { image/webp webp; }
        default_type image/webp;
        access_log off;
    }

    # The embedded motion portfolio has its own hashed JS/CSS assets.
    location ~* ^/portfolio/assets/.*\.(js|css)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
    }

    # 字体：本机 mime.types 不含 woff2，必须在此显式声明，
    # 否则会退回 default_type，影响字体解码与缓存效率。
    location ~* \.(woff2?|ttf|otf|eot)$ {
        types {
            font/woff2 woff2;
            font/woff woff;
            font/ttf ttf;
            font/otf otf;
            application/vnd.ms-fontobject eot;
        }
        default_type font/woff2;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name resume.cauai.fun;
    root /var/www/resume.cauai.fun;
    index index.html;
    # CDN HTTPS 回源到 HTTP 时直接提供内容，避免 HTTPS 301 循环。
    location / { try_files $uri $uri/ /index.html; }
    location = /index.html { add_header Cache-Control "no-cache, must-revalidate" always; add_header X-Content-Type-Options "nosniff" always; }
    location ~* ^/assets/.*\.(js|css)$ { add_header Cache-Control "public, max-age=31536000, immutable" always; access_log off; }
    location /models/ { add_header Cache-Control "public, max-age=31536000, immutable" always; gzip_static always; gzip_types model/gltf-binary; types { model/gltf-binary glb; } default_type model/gltf-binary; access_log off; }
    location /textures/ { add_header Cache-Control "public, max-age=2592000" always; types { image/webp webp; application/octet-stream hdr; } default_type image/webp; access_log off; }
    location /works/ { add_header Cache-Control "public, max-age=2592000" always; types { image/webp webp; } default_type image/webp; access_log off; }
    location ~* ^/portfolio/assets/.*\.(js|css)$ { add_header Cache-Control "public, max-age=31536000, immutable" always; access_log off; }
    location ~* \.(woff2?|ttf|otf|eot)$ { types { font/woff2 woff2; font/woff woff; font/ttf ttf; font/otf otf; application/vnd.ms-fontobject eot; } default_type font/woff2; add_header Cache-Control "public, max-age=31536000, immutable" always; access_log off; }
}
