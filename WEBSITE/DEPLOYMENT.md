# 🚀 SIGAP PPKS - Panduan Deployment Production

## ✅ Checklist Sebelum Deploy

### 1. Environment & Config

```bash
# Pastikan .env sudah dikonfigurasi dengan benar
```

**File:** `.env`

| Variable | Development | Production |
|----------|-------------|------------|
| `APP_ENV` | `development` | `production` |
| `DEBUG_MODE` | `true` | `false` |
| `GROQ_API_KEY` | API key valid | API key valid |
| `ENCRYPTION_KEY` | 64 karakter hex | 64 karakter hex |
| `DB_PASS` | kosong/local | password kuat! |
| `CORS_ALLOWED_ORIGINS` | `*` | `https://domain.com` |
| `MAINTENANCE_SECRET_KEY` | random | random 40+ karakter |

---

### 2. HTTPS Configuration

**Mengapa HTTPS wajib:**
- Enkripsi data sensitif (password, info korban)
- Session cookies dengan flag `Secure`
- Mencegah man-in-the-middle attack

**Setup HTTPS dengan Let's Encrypt (gratis):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-apache

# Generate certificate
sudo certbot --apache -d sigap.domain.com

# Auto-renew (cron)
0 0 1 * * certbot renew --quiet
```

**Update `.env` untuk HTTPS:**
```env
CORS_ALLOWED_ORIGINS=https://sigap.domain.com,https://www.sigap.domain.com
```

---

### 3. CORS Settings Production

**File:** `.env`

```env
# JANGAN gunakan * di production!
# Daftar domain yang diizinkan (pisah dengan koma)
CORS_ALLOWED_ORIGINS=https://sigap.telkomuniversity.ac.id,https://admin.sigap.telkomuniversity.ac.id
```

**Jika API diakses dari mobile app:**
```env
CORS_ALLOWED_ORIGINS=https://sigap.domain.com,capacitor://localhost,http://localhost
```

---

### 4. Apache Virtual Host (HTTPS)

```apache
<VirtualHost *:443>
    ServerName sigap.domain.com
    DocumentRoot /var/www/sigap
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/sigap.domain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/sigap.domain.com/privkey.pem
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    <Directory /var/www/sigap>
        AllowOverride All
        Require all granted
    </Directory>
    
    # Lindungi file sensitif
    <FilesMatch "^\.env|^config\.php$">
        Require all denied
    </FilesMatch>
</VirtualHost>

# Redirect HTTP ke HTTPS
<VirtualHost *:80>
    ServerName sigap.domain.com
    Redirect permanent / https://sigap.domain.com/
</VirtualHost>
```

---

### 5. File Permissions (Linux)

```bash
# Set ownership
sudo chown -R www-data:www-data /var/www/sigap

# Directories: 755, Files: 644
find /var/www/sigap -type d -exec chmod 755 {} \;
find /var/www/sigap -type f -exec chmod 644 {} \;

# Protect sensitive files
chmod 600 /var/www/sigap/.env
chmod 600 /var/www/sigap/config/config.php

# Upload directory writable
chmod 755 /var/www/sigap/uploads/bukti
```

---

### 6. Database Production

```sql
-- Buat user khusus (bukan root!)
CREATE USER 'sigap_user'@'localhost' IDENTIFIED BY 'password_kuat_123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON sigap_ppks.* TO 'sigap_user'@'localhost';
FLUSH PRIVILEGES;
```

**Update `.env`:**
```env
DB_USER=sigap_user
DB_PASS=password_kuat_123!
```

---

### 7. Maintenance Mode

**Aktifkan maintenance:**
```bash
# Via CLI
php maintenance/toggle.php on

# Via Browser (butuh secret key)
https://sigap.domain.com/maintenance/toggle.php?action=on&key=YOUR_SECRET_KEY
```

**Nonaktifkan maintenance:**
```bash
php maintenance/toggle.php off
```

---

### 8. Log Rotation

```bash
# Jalankan manual
php api/logs/rotate.php

# Atau setup cron (setiap minggu)
0 0 * * 0 php /var/www/sigap/api/logs/rotate.php >> /var/log/sigap-rotate.log
```

---

### 9. Final Checklist

- [ ] `APP_ENV=production`
- [ ] `DEBUG_MODE=false`
- [ ] `CORS_ALLOWED_ORIGINS` tidak menggunakan `*`
- [ ] HTTPS aktif dan forced redirect
- [ ] `.env` dan `config.php` tidak bisa diakses via browser
- [ ] Database menggunakan user non-root
- [ ] File permissions sudah benar
- [ ] Backup database terjadwal
- [ ] SSL certificate auto-renew aktif
- [ ] Log rotation terjadwal

---

## 📞 Emergency

Jika terjadi masalah:

1. **Aktifkan maintenance mode** untuk mencegah akses
2. **Cek log files** di `api/logs/`
3. **Rollback** jika perlu dari backup

---

*Terakhir diupdate: 2026-01-05*
