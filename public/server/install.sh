#!/usr/bin/env bash
# ПВ-Система Доступ — установка сервера-ретранслятора на Ubuntu (Beget и любой VPS).
# Запускать от root:  bash install.sh ваш-домен.ru
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR=/opt/pv-relay
PORT="${RELAY_PORT:-8765}"

say() { echo -e "\n\033[1;34m==> $*\033[0m"; }
die() { echo -e "\033[1;31mОшибка: $*\033[0m" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "запустите от root (sudo bash install.sh ваш-домен.ru)"
[ -n "$DOMAIN" ] || die "укажите домен: bash install.sh relay.example.ru"

say "Устанавливаю системные пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip nginx certbot python3-certbot-nginx curl >/dev/null

say "Готовлю программу в $APP_DIR"
mkdir -p "$APP_DIR"
# Файл relay.py берём рядом со скриптом, а при установке одной командой — скачиваем.
SRC="$(dirname "$0")/relay.py"
if [ -f "$SRC" ]; then
  cp "$SRC" "$APP_DIR/relay.py"
elif [ -n "${RELAY_SOURCE:-}" ]; then
  curl -fsSL "$RELAY_SOURCE" -o "$APP_DIR/relay.py" || die "не удалось скачать relay.py"
else
  die "рядом нет файла relay.py — скопируйте его в ту же папку"
fi
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install -q --upgrade pip
"$APP_DIR/venv/bin/pip" install -q "aiohttp>=3.9,<4"

# Секрет создаётся один раз и больше не меняется при переустановке.
if [ -f "$APP_DIR/secret.env" ]; then
  . "$APP_DIR/secret.env"
  say "Использую уже существующий ключ связи"
else
  RELAY_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  echo "RELAY_SECRET=$RELAY_SECRET" > "$APP_DIR/secret.env"
  chmod 600 "$APP_DIR/secret.env"
fi

say "Настраиваю автозапуск"
cat > /etc/systemd/system/pv-relay.service <<EOF
[Unit]
Description=PV-Sistema Dostup relay
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/secret.env
Environment=RELAY_PORT=$PORT
ExecStart=$APP_DIR/venv/bin/python $APP_DIR/relay.py
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable -q pv-relay
systemctl restart pv-relay

say "Настраиваю веб-сервер для $DOMAIN"
cat > /etc/nginx/sites-available/pv-relay <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
        client_max_body_size 16m;
    }
}
EOF
ln -sf /etc/nginx/sites-available/pv-relay /etc/nginx/sites-enabled/pv-relay
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || die "конфигурация nginx не прошла проверку"
systemctl reload nginx

say "Выпускаю SSL-сертификат"
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect >/dev/null 2>&1; then
  SCHEME=wss; HTTPS=1
else
  echo "   Не удалось получить сертификат — проверьте, что домен $DOMAIN указывает на этот сервер."
  echo "   Пока работает без шифрования, повторить: certbot --nginx -d $DOMAIN"
  SCHEME=ws; HTTPS=0
fi

sleep 2
say "Проверяю работу"
if [ "$HTTPS" = "1" ]; then CHECK="https://$DOMAIN/health"; else CHECK="http://$DOMAIN/health"; fi
curl -fsS --max-time 10 "$CHECK" >/dev/null && echo "   Сервер отвечает: $CHECK" || echo "   Сервер пока не отвечает, проверьте: systemctl status pv-relay"

cat <<EOF


============================================================
 ГОТОВО. Скопируйте эти две строки в настройки программы:

 Адрес сервера:  $SCHEME://$DOMAIN/ws
 Ключ связи:     $RELAY_SECRET

============================================================
 Полезные команды:
   systemctl status pv-relay     — состояние
   systemctl restart pv-relay    — перезапуск
   journalctl -u pv-relay -f     — журнал работы
============================================================
EOF