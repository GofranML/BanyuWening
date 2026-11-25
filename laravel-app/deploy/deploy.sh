#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/banyuwening}"
APP_DIR="$DEPLOY_ROOT/laravel-app"

if [ ! -d "$APP_DIR" ]; then
  echo "Direktori aplikasi tidak ditemukan di: $APP_DIR"
  exit 1
fi

echo "==> [1/6] Mengambil pembaruan terbaru dari origin/main..."
cd "$DEPLOY_ROOT"
git fetch origin main
git checkout main
git pull --ff-only origin main

cd "$APP_DIR"

echo "==> [2/6] Memasang dependensi Composer (production)..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> [3/6] Membangun aset frontend Vite..."
npm ci
npm run build

echo "==> [4/6] Menjalankan migrasi database..."
php artisan migrate --force

echo "==> [5/6] Menyegarkan cache konfigurasi, route & view Laravel..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> [6/6] Me-restart worker Supervisor (jika tersedia)..."
if command -v supervisorctl >/dev/null 2>&1; then
  sudo supervisorctl restart banyuwening-ws || true
fi

echo "==> Deployment selesai dengan sukses."
