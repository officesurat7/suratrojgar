# SuratRojgar API (Laravel 13)

The REST API behind suratrojgar.in. See the [project README](../README.md), [API reference](../docs/API.md) and [install guide](../docs/INSTALL.md).

```bash
composer install && cp .env.example .env && php artisan key:generate
php artisan migrate --seed && php artisan sr:create-super-admin
php artisan serve
php artisan test
```
