# SIGAP Maintenance Mode

## Cara Menggunakan

### 1. Aktifkan Maintenance Mode

**Via Browser:**
```
https://yourdomain.com/maintenance/toggle.php?action=on&key=sigap_admin_2025
```

**Via CLI (Server):**
```bash
php maintenance/toggle.php on
```

### 2. Nonaktifkan Maintenance Mode

**Via Browser:**
```
https://yourdomain.com/maintenance/toggle.php?action=off&key=sigap_admin_2025
```

**Via CLI (Server):**
```bash
php maintenance/toggle.php off
```

### 3. Cek Status Maintenance

**Via Browser:**
```
https://yourdomain.com/maintenance/toggle.php?action=status&key=sigap_admin_2025
```

---

## Konfigurasi

Edit file `maintenance/check.php`:

```php
// Ganti dengan secret key Anda
$bypassSecretKey = 'your_secret_key_here';

// Tambahkan IP yang boleh bypass
$bypassIPs = [
    '127.0.0.1',
    '::1',
    'YOUR_IP_ADDRESS',  // IP admin Anda
];
```

---

## Bypass Maintenance (untuk Testing)

### Via IP
Tambahkan IP Anda ke array `$bypassIPs` di `check.php`

### Via URL Parameter
```
https://yourdomain.com/?bypass_maintenance=sigap_admin_2025
```
Cookie akan disimpan selama 1 jam.

---

## Integrasi ke API/Halaman Lain

Tambahkan di awal file PHP:

```php
<?php
require_once __DIR__ . '/../maintenance/check.php';
// ... kode lainnya
```

---

## File Structure

```
maintenance/
├── index.html      # Halaman maintenance untuk user
├── check.php       # Include file untuk auto-check
├── toggle.php      # Script untuk on/off
└── README.md       # Dokumentasi ini
```

---

## Response saat Maintenance

**Halaman Web:**
Akan redirect ke halaman maintenance cantik dengan:
- Ilustrasi animasi
- Contact darurat
- Auto-refresh setiap 60 detik

**API:**
```json
{
    "success": false,
    "message": "Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.",
    "error_code": "MAINTENANCE_MODE",
    "retry_after": 3600
}
```

---

## ⚠️ PENTING

1. **Ganti secret key** sebelum deploy ke production!
2. **Simpan secret key** di tempat aman
3. **Test bypass** sebelum aktifkan maintenance
4. Jangan commit file `.maintenance` ke git
