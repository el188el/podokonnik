-- Таймлапсы растений: в хранилище для сторис можно класть и короткие видео mp4.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'video/mp4'], file_size_limit = 8388608
where id = 'stories';
