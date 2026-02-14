<?php
/**
 * SIGAP PPKS - Log Rotation
 * Arsipkan log lama dan bersihkan log aktif
 * 
 * Jalankan: php api/logs/rotate.php
 * Atau jadwalkan via cron setiap minggu
 */

$logsDir = __DIR__;
$archiveDir = $logsDir . '/archive';
$maxLogSize = 50 * 1024; // 50KB sebelum rotate
$maxArchiveAge = 30; // Hapus arsip > 30 hari

// Buat folder archive jika belum ada
if (!is_dir($archiveDir)) {
    mkdir($archiveDir, 0755, true);
    echo "Folder archive dibuat\n";
}

// Daftar file log
$logFiles = glob($logsDir . '/*.log');

$rotated = 0;
$archived = 0;

foreach ($logFiles as $logFile) {
    $filename = basename($logFile);
    $filesize = filesize($logFile);
    
    echo "Cek: $filename (" . round($filesize/1024, 2) . " KB)\n";
    
    // Rotate jika > maxLogSize
    if ($filesize > $maxLogSize) {
        $date = date('Y-m-d_His');
        $archiveName = str_replace('.log', "_$date.log", $filename);
        $archivePath = $archiveDir . '/' . $archiveName;
        
        // Pindahkan ke archive
        if (rename($logFile, $archivePath)) {
            echo "  → Diarsipkan ke: archive/$archiveName\n";
            $archived++;
            
            // Buat file log baru yang kosong
            file_put_contents($logFile, "# Log baru dibuat: " . date('Y-m-d H:i:s') . "\n");
            $rotated++;
        }
    }
}

// Bersihkan arsip lama
$archiveFiles = glob($archiveDir . '/*.log');
$deleted = 0;

foreach ($archiveFiles as $archiveFile) {
    $fileAge = (time() - filemtime($archiveFile)) / 86400; // dalam hari
    
    if ($fileAge > $maxArchiveAge) {
        unlink($archiveFile);
        echo "Hapus arsip lama: " . basename($archiveFile) . " ($fileAge hari)\n";
        $deleted++;
    }
}

// Kompresi arsip (opsional - jika ada gzip)
if (function_exists('gzopen')) {
    foreach (glob($archiveDir . '/*.log') as $archiveFile) {
        $gzFile = $archiveFile . '.gz';
        if (!file_exists($gzFile)) {
            $content = file_get_contents($archiveFile);
            $gz = gzopen($gzFile, 'w9');
            gzwrite($gz, $content);
            gzclose($gz);
            unlink($archiveFile);
            echo "Kompresi: " . basename($archiveFile) . " → .gz\n";
        }
    }
}

echo "\n=== Ringkasan ===\n";
echo "File dirotasi: $rotated\n";
echo "File diarsipkan: $archived\n";
echo "Arsip lama dihapus: $deleted\n";
