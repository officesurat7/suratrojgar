#!/usr/bin/env bash
# One-time setup of a fresh Hostinger VPS (Ubuntu 24.04) for SuratRojgar. Run as root:
#   bash server-setup.sh suratrojgar.in you@example.com
# It installs packages and creates the app user and folders. It does NOT create passwords for you:
# you choose them when prompted by mysql_secure_installation and when editing the .env files.
set -euo pipefail
DOMAIN="${1:?usage: server-setup.sh <domain> <email-for-ssl>}"
EMAIL="${2:?usage: server-setup.sh <domain> <email-for-ssl>}"

apt-get update
apt-get -y upgrade
apt-get install -y software-properties-common curl git unzip ufw fail2ban supervisor nginx certbot python3-certbot-nginx \
  mysql-server redis-server clamav-daemon
add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y php8.3-fpm php8.3-cli php8.3-mysql php8.3-redis php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip \
  php8.3-gd php8.3-intl php8.3-bcmath php8.3-opcache
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# App user (no password login) and folders
id suratrojgar >/dev/null 2>&1 || adduser --system --group --home /var/www/suratrojgar --shell /bin/bash suratrojgar
usermod -aG www-data suratrojgar
mkdir -p /var/www/suratrojgar/{releases,shared} /var/www/certbot /var/log/suratrojgar /var/log/php /var/backups/suratrojgar
mkdir -p /var/www/suratrojgar/shared/storage/{app/public,app/private,framework/cache,framework/sessions,framework/views,logs}
chown -R suratrojgar:www-data /var/www/suratrojgar /var/log/suratrojgar /var/backups/suratrojgar
chown suratrojgar:www-data /var/log/php
chmod 750 /var/backups/suratrojgar

# Firewall: only SSH, HTTP and HTTPS are reachable. MySQL and Redis listen on localhost only.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now fail2ban

echo
echo "Next steps (see docs/INSTALL.md):"
echo " 1. mysql_secure_installation, then create the database and user."
echo " 2. Copy the deploy/ config files into place and set Redis requirepass."
echo " 3. certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN -m $EMAIL --agree-tos"
echo " 4. Create /var/www/suratrojgar/shared/backend.env and shared/frontend.env, then run deploy.sh."
