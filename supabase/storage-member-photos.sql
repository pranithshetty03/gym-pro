-- Supabase Storage: member photos bucket + policies
-- Run in Supabase SQL Editor after creating bucket in Dashboard (Storage → New bucket → public: member-photos)
-- Or uncomment insert below if your project allows SQL bucket creation.

-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('member-photos', 'member-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Allow authenticated Supabase users (if using Supabase Auth). For Firebase-only apps,
-- use the Next.js API route with service role upload instead.

alter table storage.objects enable row level security;

-- Public read for public bucket
drop policy if exists "Public read member-photos" on storage.objects;
create policy "Public read member-photos"
  on storage.objects for select
  using (bucket_id = 'member-photos');

-- Service role bypasses RLS; client uploads go through /api/members/photo with service role.
