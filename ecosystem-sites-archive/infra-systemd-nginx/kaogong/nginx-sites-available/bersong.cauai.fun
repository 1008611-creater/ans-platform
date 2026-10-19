server {
 listen 80;
 listen [::]:80;
 server_name bersong.cauai.fun;
 location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
 location / { return 301 https://beersong.cauai.fun$request_uri; }
}
server {
 listen 443 ssl http2;
 listen [::]:443 ssl http2;
 server_name bersong.cauai.fun;
 ssl_certificate /etc/letsencrypt/live/bersong.cauai.fun/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/bersong.cauai.fun/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 return 301 https://beersong.cauai.fun$request_uri;
}
