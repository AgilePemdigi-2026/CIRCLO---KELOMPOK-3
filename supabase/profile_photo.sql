-- supabase/profile_photo.sql
-- Jalankan sekali di Supabase SQL Editor sebelum memakai foto profil & alamat.
-- File ini TIDAK dijalankan otomatis oleh aplikasi.

-- Kolom foto profil pada tabel pembeli dan penjual.
alter table public.pembeli
  add column if not exists foto_url text;

alter table public.penjual
  add column if not exists foto_url text;

-- Bucket foto profil. Server juga membuat bucket ini otomatis lewat service role,
-- tetapi DDL ini memastikan konfigurasi bucket sama di semua environment.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Publik hanya boleh membaca foto profil. Penulisan dilakukan server memakai service role.
drop policy if exists "Public read profile photos" on storage.objects;
create policy "Public read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');
