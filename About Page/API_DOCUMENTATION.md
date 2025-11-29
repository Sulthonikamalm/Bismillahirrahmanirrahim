# Statistics API Documentation

## Overview
Dokumentasi ini menjelaskan format API endpoint yang diperlukan untuk menampilkan statistik real-time di halaman About.

## Endpoint

### GET `/api/statistics`

Endpoint ini digunakan untuk mengambil data statistik terkini dari database.

## Request

**Method:** `GET`
**URL:** `/api/statistics`
**Headers:**
```
Content-Type: application/json
```

## Response

### Success Response (200 OK)

```json
{
  "korban": 6239,
  "laporan": 120,
  "perlindungan": 390
}
```

**Response Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `korban` | Number | Jumlah total korban yang berani bicara | 6239 |
| `laporan` | Number | Jumlah pelaporan yang diterima | 120 |
| `perlindungan` | Number | Jumlah korban dalam perlindungan | 390 |

### Error Response (4xx / 5xx)

```json
{
  "error": "Error message",
  "status": 500
}
```

## Implementation Examples

### Node.js (Express)

```javascript
// routes/api.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/statistics', async (req, res) => {
  try {
    // Query database untuk mendapatkan statistik
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM korban) as korban,
        (SELECT COUNT(*) FROM laporan WHERE status = 'diterima') as laporan,
        (SELECT COUNT(*) FROM korban WHERE status = 'dalam_perlindungan') as perlindungan
    `);

    res.json({
      korban: stats.korban || 0,
      laporan: stats.laporan || 0,
      perlindungan: stats.perlindungan || 0
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      status: 500
    });
  }
});

module.exports = router;
```

### PHP (Laravel)

```php
<?php
// routes/api.php
use Illuminate\Support\Facades\DB;

Route::get('/statistics', function () {
    try {
        $korban = DB::table('korban')->count();
        $laporan = DB::table('laporan')
            ->where('status', 'diterima')
            ->count();
        $perlindungan = DB::table('korban')
            ->where('status', 'dalam_perlindungan')
            ->count();

        return response()->json([
            'korban' => $korban,
            'laporan' => $laporan,
            'perlindungan' => $perlindungan
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to fetch statistics',
            'status' => 500
        ], 500);
    }
});
```

### Python (Flask)

```python
# app.py
from flask import Flask, jsonify
import mysql.connector

app = Flask(__name__)

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="your_username",
            password="your_password",
            database="your_database"
        )
        cursor = conn.cursor()

        # Query database
        cursor.execute("SELECT COUNT(*) FROM korban")
        korban = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM laporan WHERE status = 'diterima'")
        laporan = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM korban WHERE status = 'dalam_perlindungan'")
        perlindungan = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({
            'korban': korban,
            'laporan': laporan,
            'perlindungan': perlindungan
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch statistics',
            'status': 500
        }), 500
```

## Database Schema Example

### Table: `korban`
```sql
CREATE TABLE korban (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama VARCHAR(255),
    status ENUM('aktif', 'dalam_perlindungan', 'selesai'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `laporan`
```sql
CREATE TABLE laporan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    korban_id INT,
    status ENUM('pending', 'diterima', 'ditolak', 'selesai'),
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (korban_id) REFERENCES korban(id)
);
```

## Frontend Integration

File JavaScript sudah dikonfigurasi untuk mengambil data dari endpoint ini:

```javascript
// About Page/about.js (sudah terimplementasi)
const STATS_API_CONFIG = {
  endpoint: '/api/statistics', // Update sesuai URL backend Anda
  fallbackData: {
    korban: 6239,
    laporan: 120,
    perlindungan: 390
  }
};
```

### Update Endpoint URL

Jika backend Anda berada di URL yang berbeda, update konfigurasi:

```javascript
const STATS_API_CONFIG = {
  endpoint: 'https://your-backend-url.com/api/statistics',
  // atau
  endpoint: 'http://localhost:3000/api/statistics',
  // ...
};
```

## CORS Configuration

Jika frontend dan backend berada di domain yang berbeda, pastikan backend mengizinkan CORS:

### Node.js (Express)
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  methods: ['GET'],
  credentials: true
}));
```

### PHP
```php
header('Access-Control-Allow-Origin: https://your-frontend-domain.com');
header('Access-Control-Allow-Methods: GET');
header('Content-Type: application/json');
```

## Testing

### Using cURL
```bash
curl -X GET http://localhost:3000/api/statistics
```

### Using Postman
1. Method: GET
2. URL: http://localhost:3000/api/statistics
3. Headers: Content-Type: application/json

### Expected Response
```json
{
  "korban": 6239,
  "laporan": 120,
  "perlindungan": 390
}
```

## Fallback Behavior

Jika API gagal atau tidak tersedia:
- Frontend akan otomatis menggunakan fallback data
- Tidak ada error yang ditampilkan ke user
- Console warning akan muncul di browser developer tools

## Auto Refresh (Optional)

Untuk mengaktifkan auto-refresh setiap 5 menit, uncomment kode berikut di `about.js`:

```javascript
setInterval(() => {
  fetchStatistics().then(data => {
    updateStatisticsCards(data);
  });
}, 5 * 60 * 1000); // 5 minutes
```

## Security Recommendations

1. **Rate Limiting**: Batasi jumlah request per IP
2. **Authentication**: Pertimbangkan untuk menambahkan API key jika diperlukan
3. **Input Validation**: Validasi semua input dari client
4. **SQL Injection Prevention**: Gunakan prepared statements
5. **HTTPS**: Gunakan HTTPS untuk production

## Support

Jika ada pertanyaan terkait integrasi API, silakan hubungi tim development.
