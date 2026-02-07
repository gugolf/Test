-- Enable public access to 'resumes' bucket
-- Note: In production, you might want to restrict this to authenticated users, but for this app's current state:

-- 1. Insert Policy
create policy "Public Insert"
on storage.objects for insert
with check ( bucket_id = 'resumes' );

-- 2. Select Policy (for download)
create policy "Public Select"
on storage.objects for select
using ( bucket_id = 'resumes' );

-- 3. Update Policy (optional)
create policy "Public Update"
on storage.objects for update
with check ( bucket_id = 'resumes' );
