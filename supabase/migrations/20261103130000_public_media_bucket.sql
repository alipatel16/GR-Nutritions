-- Product photos are shown to every visitor, so serve them from public CDN URLs
-- instead of signing each image per page view. Uploads remain staff-only: there
-- are still no client storage policies, and objects use unguessable UUID paths.
-- Images are compressed before upload, so 1.5 MB is a generous per-file cap.
update storage.buckets set public = true, file_size_limit = 1572864 where id = 'product-media';
