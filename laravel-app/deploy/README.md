# BanyuWening Production Deployment Guide

Panduan konfigurasi layanan latar belakang (*background workers*) untuk BanyuWening di server produksi Linux (Ubuntu/Debian).

## 1. Supervisor Configuration (Queue & MQTT)
Salin berkas konfigurasi ke folder konfigurasi Supervisor:
```bash
sudo cp deploy/supervisor/*.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

Periksa status proses yang berjalan:
```bash
sudo supervisorctl status
```

## 2. Environment Variables Production Checklist (`.env`)
Pastikan variabel berikut disesuaikan dengan server produksi:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://banyuwening.id

# Driver Database PostgreSQL
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=banyuwening_prod
DB_USERNAME=banyuwening_user
DB_PASSWORD=your_secure_password

# Machine Learning Engine Path
ML_PYTHON_PATH=/var/www/banyuwening/ml_env/bin/python
ML_PREDICT_SCRIPT=/var/www/banyuwening/ml/src/predict.py

# Broker MQTT
MQTT_HOST=broker.hivemq.com
MQTT_PORT=8883
MQTT_TLS=true
MQTT_USERNAME=banyuwening_iot
MQTT_PASSWORD=your_broker_token
```
