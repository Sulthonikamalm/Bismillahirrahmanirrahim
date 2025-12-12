-- ==========================================================
-- FIX DATA tingkat_kekhawatiran
-- Nilai yang benar: 'sedikit', 'khawatir', 'sangat'
-- ==========================================================

-- Cek data sebelum update
SELECT kode_pelaporan, tingkat_kekhawatiran FROM Laporan;

UPDATE Laporan SET tingkat_kekhawatiran = 'sedikit'
WHERE tingkat_kekhawatiran = 'Kekerasan Verbal';

UPDATE Laporan SET tingkat_kekhawatiran = 'khawatir'
WHERE tingkat_kekhawatiran IN ('Kekerasan Psikologis', 'Kekerasan Fisik');

UPDATE Laporan SET tingkat_kekhawatiran = 'sangat'
WHERE tingkat_kekhawatiran = 'Kekerasan Seksual';

-- Untuk data yang NULL atau tidak valid, set ke 'khawatir' sebagai default
UPDATE Laporan SET tingkat_kekhawatiran = 'khawatir'
WHERE tingkat_kekhawatiran IS NULL
   OR tingkat_kekhawatiran NOT IN ('sedikit', 'khawatir', 'sangat');

-- Verifikasi setelah update
SELECT tingkat_kekhawatiran, COUNT(*) as jumlah
FROM Laporan
GROUP BY tingkat_kekhawatiran;

-- tambahan baru untuk meloongtextkan isinya
ALTER TABLE ArtikelBlog
MODIFY isi_postingan MEDIUMTEXT NOT NULL;
