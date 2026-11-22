# Installation

## Local development

Needs PHP 8.3 (with `pdo_mysql`, `redis`, `mbstring`, `intl`, `gd`, `zip`, `bcmath`), Composer, Node.js 22, MySQL 8 and Redis 7. On Windows, the easiest route is WSL2 (Ubuntu) or Laragon.

```bash
# 1. API
cd backend
composer install
cp .env.example .env                 # then edit: APP_ENV=local, APP_DEBUG=true, DB_*, MAIL_MAILER=log
php artisan key:generate
php artisan migrate --seed           # tables + Surat areas, categories, roles, permissions
php artisan db:seed --class=DemoSeeder   # optional demo jobs/accounts (refuses to run in production)
php artisan sr:create-super-admin    # asks for email and a strong password
php artisan storage:link
php artisan serve                    # http://127.0.0.1:8000
php artisan queue:work --queue=high,notifications,default   # in a second terminal (emails, OTPs)

# 2. Website
cd ../frontend
npm ci
cp .env.example .env.local           # set NEXT_PUBLIC_SITE_URL=http://localhost:3000, COOKIE_SECURE=false,
                                     # API_INTERNAL_URL=http://127.0.0.1:8000/api/v1, INTERNAL_API_KEY = same as backend
npm run dev                          # http://localhost:3000
```

With `MAIL_MAILER=log`, emails (including OTP codes) are written to `backend/storage/logs/`. Demo accounts use `@demo.suratrojgar.test` addresses and the `DEMO_PASSWORD` value (default `Demo@12345`, local only).

## Production on a Hostinger VPS

Recommended starting plan: **KVM 4 (4 vCPU, 16 GB RAM)** or at least KVM 2 (2 vCPU, 8 GB). The config files in `deploy/` are sized for 8 GB. Choose Ubuntu 24.04 as the OS.

### 1. DNS
In your domain's DNS, point `@`, `www` and `api` (A records) to the VPS IP address.

### 2. Server packages
```bash
ssh root@YOUR_VPS_IP
git clone https://github.com/YOUR-ACCOUNT/SuratRojgar.git /root/sr && cd /root/sr
bash deploy/scripts/server-setup.sh suratrojgar.in you@example.com
```

### 3. Database and Redis
```bash
mysql_secure_installation
mysql -u root -p
  CREATE DATABASE suratrojgar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'suratrojgar'@'localhost' IDENTIFIED BY 'A-LONG-RANDOM-PASSWORD';
  GRANT ALL PRIVILEGES ON suratrojgar.* TO 'suratrojgar'@'localhost';
cp deploy/mysql/suratrojgar.cnf /etc/mysql/mysql.conf.d/zz-suratrojgar.cnf && systemctl restart mysql
# Add the lines from deploy/redis/suratrojgar.conf to /etc/redis/redis.conf (choose a requirepass), then:
systemctl restart redis-server
```

### 4. Web server, PHP and workers
```bash
cp deploy/nginx/snippets-suratrojgar-ssl.conf   /etc/nginx/snippets/suratrojgar-ssl.conf
cp deploy/nginx/snippets-suratrojgar-proxy.conf /etc/nginx/snippets/suratrojgar-proxy.conf
cp deploy/php-fpm/suratrojgar.conf /etc/php/8.3/fpm/pool.d/
cp deploy/php-fpm/opcache.ini /etc/php/8.3/fpm/conf.d/99-suratrojgar-opcache.ini
cp deploy/supervisor/suratrojgar.conf /etc/supervisor/conf.d/
cp deploy/cron/suratrojgar /etc/cron.d/suratrojgar
# Let the app user reload services during deploys, and nothing else:
echo 'suratrojgar ALL=(root) NOPASSWD: /usr/bin/systemctl reload php8.3-fpm, /usr/bin/supervisorctl restart suratrojgar-web' > /etc/sudoers.d/suratrojgar
# HTTPS certificate (temporarily serve only port 80 for the challenge):
certbot certonly --nginx -d suratrojgar.in -d www.suratrojgar.in -d api.suratrojgar.in
cp deploy/nginx/suratrojgar.conf /etc/nginx/sites-available/ && ln -s ../sites-available/suratrojgar.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx
systemctl restart php8.3-fpm
```

### 5. Let the website reach the API over loopback
The website server must reach the API through `127.0.0.1`, not over the internet. That keeps it fast, and it lets the API recognise server-side page renders:
```bash
echo "127.0.0.1 api.suratrojgar.in" >> /etc/hosts
```
Then use `API_INTERNAL_URL=https://api.suratrojgar.in/api/v1` in `frontend.env`.

### 6. Environment files
Create `/var/www/suratrojgar/shared/backend.env` (from `backend/.env.example`) and `/var/www/suratrojgar/shared/frontend.env` (from `frontend/.env.example`). See [ENV.md](ENV.md). Then lock them down:
```bash
chown suratrojgar:www-data /var/www/suratrojgar/shared/*.env && chmod 640 /var/www/suratrojgar/shared/*.env
```

### 7. First deploy
```bash
su - suratrojgar
ssh-keygen -t ed25519   # add the public key to GitHub as a read-only Deploy key
REPO_URL=git@github.com:YOUR-ACCOUNT/SuratRojgar.git bash /root/sr/deploy/scripts/deploy.sh main
cd /var/www/suratrojgar/current/backend
php artisan key:generate --force       # first time only; writes APP_KEY into the shared env file
php artisan db:seed --force            # reference data only (areas, categories, permissions)
php artisan sr:create-super-admin
exit
supervisorctl reread && supervisorctl update
```

### 8. After the first deploy
- Log in at `/super-admin/login` and complete **Site settings**: support email and phone, Grievance Officer, job approval mode.
- Send a test email from Site settings.
- Run **Back up now** on the Backups page, then set up `deploy/scripts/backup-offsite.sh` (see [BACKUP.md](BACKUP.md)).
- Set `ALLOW_INDEXING=true` in `frontend.env` and redeploy only when you're ready for Google to index the site, then submit `https://suratrojgar.in/sitemap.xml` in Google Search Console.

### Later deploys
`/var/www/suratrojgar/current/deploy/scripts/deploy.sh main`. If something goes wrong, run `rollback.sh`.
