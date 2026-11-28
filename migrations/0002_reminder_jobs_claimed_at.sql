-- Pelacakan waktu claim supaya pengiriman yang terputus bisa dipulihkan otomatis.
ALTER TABLE reminder_jobs ADD COLUMN claimed_at TEXT;

-- Normalisasi waktu pada log pesan lama (UTC tanpa zona → ISO 8601),
-- agar perbandingan kuota bulanan dan tampilan riwayat konsisten.
UPDATE message_logs
SET sent_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', sent_at)
WHERE sent_at NOT LIKE '%T%';
