# 🔐 Panduan Setup Admin PPKS - LENGKAP!

## ❌ Masalah yang Diperbaiki:

1. ✅ **Error JSON di login** - `database_secure.php` tidak ada, sudah diganti ke `database.php`
2. ✅ **Table `LoginAttempts` tidak ada** - sudah ditambahkan ke schema
3. ✅ **Kolom security di table `Admin` kurang** - sudah ditambahkan: `failed_attempts`, `locked_until`, `last_login`

---

## 📋 LANGKAH SETUP (Step by Step)

### **STEP 1: Setup Database**

Jalankan schema SQL untuk create semua table yang diperlukan:

```bash
# Login ke MySQL
mysql -u root -p

# Atau kalau tidak pakai password:
mysql -u root
```

Kemudian jalankan:

```sql
SOURCE /home/user/Bismillahirrahmanirrahim/config/database_schema_improved.sql;
```

**Atau** import via command line:

```bash
mysql -u root -p < /home/user/Bismillahirrahmanirrahim/config/database_schema_improved.sql
```

✅ **Hasil:** Database `sigap_ppks` dan semua table (termasuk `Admin` dan `LoginAttempts`) akan terbuat.

---

### **STEP 2: Buat Akun Admin Pertama**

Ada 2 cara:

#### **Cara 1: Pakai Script Otomatis (Recommended)** 🚀

1. **Edit kredensial admin** di file `setup_admin.php` (line 23-28):

```php
$ADMIN_CONFIG = [
    'username' => 'admin',           // GANTI sesuai keinginan
    'email' => 'admin@ppks.com',     // GANTI sesuai keinginan
    'password' => 'admin123',        // GANTI dengan password KUAT!
    'nama' => 'Administrator PPKS'   // GANTI sesuai keinginan
];
```

2. **Jalankan script:**

```bash
# Via command line
php setup_admin.php

# Atau buka di browser:
# http://localhost/setup_admin.php
```

3. **Hasil:**
```
✓ Database connection: OK
✓ Database check: Belum ada admin, aman untuk create
✓ Password hashing: OK

========================================================
✓ SUKSES! Admin berhasil dibuat!
========================================================

Admin ID: 1
Username: admin
Email: admin@ppks.com
Password: admin123
Nama: Administrator PPKS

========================================================
⚠ PENTING! SECURITY WARNING!
========================================================
1. Login sekarang dengan kredensial di atas
2. GANTI PASSWORD segera setelah login
3. HAPUS file setup_admin.php ini untuk keamanan!
4. Jangan share kredensial ini!
========================================================
```

4. **HAPUS file setup_admin.php** setelah selesai untuk keamanan!

```bash
rm setup_admin.php
```

#### **Cara 2: Manual via SQL** 🔧

Jika ingin lebih manual, bisa langsung insert via MySQL:

```bash
# Generate password hash terlebih dahulu
php -r "echo password_hash('password_kamu', PASSWORD_BCRYPT);"
```

Copy hash yang dihasilkan, lalu:

```sql
USE sigap_ppks;

INSERT INTO Admin (username, email, password_hash, nama)
VALUES (
    'admin',
    'admin@ppks.com',
    '$2y$10$HASH_YANG_DIHASILKAN_TADI',  -- Paste hash di sini
    'Administrator PPKS'
);
```

---

### **STEP 3: Test Login** ✅

1. **Buka halaman login:**
   ```
   http://localhost/login.html
   ```

2. **Masukkan kredensial:**
   - **Email:** `admin@ppks.com` (atau sesuai yang kamu set)
   - **Password:** `admin123` (atau sesuai yang kamu set)

3. **Hasil yang diharapkan:**
   - ✅ Login berhasil, redirect ke dashboard
   - ✅ Tidak ada error JSON lagi
   - ✅ Session tersimpan dengan baik

---

## 🔒 Fitur Security yang Aktif

Setelah setup, sistem sudah punya proteksi:

- ✅ **BCrypt Password Hashing** (Cost 12)
- ✅ **Rate Limiting** - Max 5 percobaan gagal per 15 menit
- ✅ **Account Lockout** - Lock 30 menit setelah 5x gagal
- ✅ **Login Attempts Logging** - Semua attempt tercatat di table `LoginAttempts`
- ✅ **SQL Injection Prevention** - Prepared statements
- ✅ **Session Security** - HttpOnly, SameSite, CSRF token
- ✅ **Timing Attack Prevention**

---

## 🐛 Troubleshooting

### **Error: "Service temporarily unavailable"**
**Penyebab:** Database tidak connect atau table belum dibuat

**Solusi:**
1. Cek apakah MySQL running: `systemctl status mysql`
2. Cek kredensial database di `config/database.php`
3. Pastikan database `sigap_ppks` sudah dibuat
4. Jalankan ulang schema SQL (STEP 1)

---

### **Error: "Failed to execute 'json' on 'Response'"**
**Penyebab:** Endpoint PHP menghasilkan error sebelum output JSON

**Solusi:** ✅ **SUDAH DIPERBAIKI!**
- File `auth_login.php` sudah diupdate untuk pakai `database.php` yang benar
- Jika masih error, cek `logs/auth_error.log` untuk detail

---

### **Error: "Invalid email or password"**
**Penyebab:**
1. Belum ada akun admin di database
2. Password salah
3. Email salah

**Solusi:**
1. Jalankan STEP 2 untuk create admin
2. Pastikan kredensial yang diinput sesuai
3. Cek di database: `SELECT * FROM Admin;`

---

### **Error: "Table 'LoginAttempts' doesn't exist"**
**Penyebab:** Schema database belum dijalankan atau versi lama

**Solusi:** ✅ **SUDAH DIPERBAIKI!**
- Schema `database_schema_improved.sql` sudah diupdate dengan table `LoginAttempts`
- Jalankan ulang STEP 1

---

### **Cek Status Database**

Untuk memastikan semua table sudah ada:

```sql
USE sigap_ppks;

SHOW TABLES;

-- Harus muncul:
-- Admin
-- LoginAttempts
-- ArtikelBlog
-- ChatSession
-- ChatMessage
-- Laporan
-- Bukti
```

Cek apakah ada admin:

```sql
SELECT id, username, email, nama FROM Admin;
```

Cek login attempts (untuk debugging):

```sql
SELECT * FROM LoginAttempts ORDER BY attempt_time DESC LIMIT 10;
```

---

## 📂 File-file yang Diubah

### **Fixed:**
- ✅ `api/auth_login.php` - Line 47: `database_secure.php` → `database.php`
- ✅ `config/database_schema_improved.sql` - Tambah table `LoginAttempts` dan kolom security di `Admin`

### **Created:**
- ✅ `setup_admin.php` - Script untuk create admin pertama kali (HAPUS setelah dipakai!)
- ✅ `SETUP_ADMIN_GUIDE.md` - Dokumentasi lengkap ini

---

## 🚀 Quick Start (TL;DR)

Untuk yang males baca panjang-panjang:

```bash
# 1. Setup database
mysql -u root -p < config/database_schema_improved.sql

# 2. Edit kredensial di setup_admin.php (line 23-28), lalu:
php setup_admin.php

# 3. Hapus script setup
rm setup_admin.php

# 4. Login di browser dengan kredensial yang dibuat
```

---

## ✅ Checklist Setup

- [ ] Database `sigap_ppks` sudah dibuat
- [ ] Semua table ada (7 table: Admin, LoginAttempts, ArtikelBlog, ChatSession, ChatMessage, Laporan, Bukti)
- [ ] Table `Admin` punya kolom: `failed_attempts`, `locked_until`, `last_login`
- [ ] Table `LoginAttempts` ada
- [ ] Admin pertama sudah dibuat via `setup_admin.php`
- [ ] File `setup_admin.php` sudah dihapus
- [ ] Bisa login dengan sukses tanpa error JSON
- [ ] Dashboard terbuka setelah login

---

## 📞 Contact Developer

Jika masih ada masalah, cek:

1. **PHP Error Log:** `logs/auth_error.log`
2. **Browser Console:** Buka DevTools (F12) → Console
3. **Network Tab:** Cek response dari `api/auth_login.php`

---

## 🎉 Selamat!

Setup admin sudah selesai! Sekarang kamu bisa:

- ✅ Login sebagai admin
- ✅ Manage laporan PPKS
- ✅ Manage artikel blog
- ✅ View statistics dashboard

**JANGAN LUPA:** Ganti password default setelah login pertama kali!

---

*Dibuat dengan ❤️ untuk SIGAP PPKS*
