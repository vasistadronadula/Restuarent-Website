-- Match the upload API and artwork picker. Existing buckets retained the old
-- 5 MB / three-format restriction, so accepted AVIF/GIF uploads failed in storage.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
WHERE id = 'menu-images';
