# 🔐 Module 3 Assignment — Nginx Web Server with HTTPS, SSL & Reverse Proxy

A complete production-like secure web server setup using **Nginx**, **OpenSSL (self-signed SSL)**, **HTTP→HTTPS redirect**, and a **Node.js reverse proxy** backend.

---

## 📁 Project Structure

```
nginx-ssl-assignment/
├── secure-app/
│   └── index.html          # Static website
├── backend/
│   └── server.js           # Node.js backend (port 3000)
├── nginx-config/
│   └── secure-app          # Nginx server block config
└── README.md
```

---

## 🔹 Part 1 — Basic Setup (Install Nginx & Create Website)

### Step 1: Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Nginx and OpenSSL
```bash
sudo apt install nginx openssl -y
```

### Step 3: Verify installations
```bash
nginx -v
openssl version
```

### Step 4: Create the web root directory
```bash
sudo mkdir -p /var/www/secure-app
```

### Step 5: Create the HTML page
```bash
sudo nano /var/www/secure-app/index.html
```

Paste this content:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Secure Server</title>
</head>
<body>
  <h1>Secure Server Running via Nginx</h1>
  <p>HTTPS enabled with self-signed SSL and reverse proxy.</p>
</body>
</html>
```

### Step 6: Set correct permissions
```bash
sudo chown -R www-data:www-data /var/www/secure-app
sudo chmod -R 755 /var/www/secure-app
```

---

## 🔹 Part 2 — SSL Certificate Generation (Self-Signed, 365 days)

### Step 1: Create SSL directory
```bash
sudo mkdir -p /etc/nginx/ssl
```

### Step 2: Generate self-signed SSL certificate (365 days)
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/selfsigned.key \
  -out /etc/nginx/ssl/selfsigned.crt \
  -subj "/C=BD/ST=Dhaka/L=Dhaka/O=SecureApp/OU=IT/CN=localhost"
```

**Command breakdown:**
| Flag | Description |
|------|-------------|
| `-x509` | Output a self-signed certificate |
| `-nodes` | No passphrase on the key |
| `-days 365` | Valid for 1 year |
| `-newkey rsa:2048` | New 2048-bit RSA key |
| `-keyout` | Path to save private key |
| `-out` | Path to save certificate |
| `-subj` | Certificate subject (avoids interactive prompt) |

### Step 3: Verify certificate files exist
```bash
ls -la /etc/nginx/ssl/
# Should show: selfsigned.crt  selfsigned.key
```

### Step 4: Set secure permissions on key
```bash
sudo chmod 600 /etc/nginx/ssl/selfsigned.key
sudo chmod 644 /etc/nginx/ssl/selfsigned.crt
```

---

## 🔹 Part 3 — Nginx Configuration

### Step 1: Create custom config file
```bash
sudo nano /etc/nginx/sites-available/secure-app
```

Paste the full config:
```nginx
# HTTP → HTTPS Redirect (Port 80)
server {
    listen 80;
    listen [::]:80;
    server_name localhost;

    return 301 https://$host$request_uri;
}

# HTTPS Server (Port 443)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name localhost;

    # SSL Certificate
    ssl_certificate     /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # SSL Settings
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Static Site
    root  /var/www/secure-app;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Reverse Proxy → backend on port 3000
    location /api/ {
        proxy_pass         http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header   Host            $host;
        proxy_set_header   X-Real-IP       $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Security Headers
    add_header X-Frame-Options        "SAMEORIGIN"    always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header X-XSS-Protection       "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/secure-app.access.log;
    error_log  /var/log/nginx/secure-app.error.log;
}
```

### Step 2: Enable the site (symlink to sites-enabled)
```bash
sudo ln -s /etc/nginx/sites-available/secure-app /etc/nginx/sites-enabled/
```

### Step 3: Disable the default site (optional but recommended)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

---

## 🔹 Part 4 — Reverse Proxy Backend Setup

### Step 1: Install Node.js (if not already installed)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # Verify
```

### Step 2: Create backend directory and server file
```bash
mkdir -p ~/backend
nano ~/backend/server.js
```

Paste this:
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Backend API running on port 3000',
    proxied_via: 'Nginx Reverse Proxy',
    timestamp: new Date().toISOString()
  }));
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Backend running at http://127.0.0.1:3000');
});
```

### Step 3: Start the backend
```bash
node ~/backend/server.js &
```

### Step 4: Verify backend is running
```bash
curl http://127.0.0.1:3000
# Expected: {"status":"ok","message":"Backend API running on port 3000",...}
```

> **Tip:** For production, use PM2 to keep it running:
> ```bash
> sudo npm install -g pm2
> pm2 start ~/backend/server.js --name backend
> pm2 startup
> pm2 save
> ```

---

## 🔹 Part 5 — Testing

### Step 1: Test Nginx config syntax
```bash
sudo nginx -t
# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 2: Reload Nginx
```bash
sudo systemctl reload nginx
# or
sudo nginx -s reload
```

### Step 3: Check Nginx status
```bash
sudo systemctl status nginx
```

### Step 4: Test HTTP → HTTPS redirect
```bash
curl -I http://localhost
# Expected: HTTP/1.1 301 Moved Permanently
#           Location: https://localhost/
```

### Step 5: Test HTTPS (ignoring self-signed cert warning)
```bash
curl -k https://localhost
# Expected: HTML content of your index.html
```

### Step 6: Test backend via reverse proxy
```bash
curl -k https://localhost/api/
# Expected: {"status":"ok","message":"Backend API running on port 3000",...}
```

### Step 7: Check SSL certificate details
```bash
echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates
```

### Step 8: View logs
```bash
sudo tail -f /var/log/nginx/secure-app.access.log
sudo tail -f /var/log/nginx/secure-app.error.log
```

---

## 📊 Architecture Overview

```
Client Browser
     │
     │  HTTP :80
     ▼
┌──────────────┐
│    Nginx     │──── 301 Redirect ────► HTTPS :443
│  (Port 80)   │
└──────────────┘

     │  HTTPS :443
     ▼
┌──────────────────────────────────────┐
│            Nginx (Port 443)          │
│  SSL: /etc/nginx/ssl/selfsigned.crt  │
│                                      │
│  /       → /var/www/secure-app/      │  Static Site
│  /api/   → http://127.0.0.1:3000    │  Reverse Proxy
└──────────────────────────────────────┘
                    │
                    │ proxy_pass
                    ▼
          ┌──────────────────┐
          │  Node.js Backend │
          │   Port 3000      │
          └──────────────────┘
```

---

## 🛠️ Quick Troubleshooting

| Issue | Command |
|-------|---------|
| Nginx won't start | `sudo nginx -t` to find config errors |
| Port 80/443 in use | `sudo ss -tlnp \| grep ':80\|:443'` |
| Backend not responding | `curl http://127.0.0.1:3000` |
| Check nginx error log | `sudo tail -20 /var/log/nginx/error.log` |
| Firewall blocking ports | `sudo ufw allow 80 && sudo ufw allow 443` |

---


---

*Module 3 Assignment — Nginx Web Server with HTTPS, SSL & Reverse Proxy*
