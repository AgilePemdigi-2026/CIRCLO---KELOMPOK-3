-- Jalankan sekali di Supabase SQL Editor sebelum memakai Upload Material dengan Supabase.
-- File ini TIDAK dijalankan otomatis oleh aplikasi.

alter table public.material
  add column if not exists foto_url text,
  add column if not exists kondisi_seller text,
  add column if not exists kategori_ai text,
  add column if not exists upload_token text;

-- Kunci idempotensi Confirm: request ulang dengan token yang sama tidak membuat baris baru.
create unique index if not exists material_upload_token_key
  on public.material (upload_token)
  where upload_token is not null;

-- Bucket foto. Aplikasi juga membuat bucket ini otomatis lewat service role,
-- tetapi DDL ini memastikan konfigurasi bucket sama di semua environment.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('material-photos', 'material-photos', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Publik hanya boleh membaca. Penulisan foto dilakukan server memakai service role.
drop policy if exists "Public read material photos" on storage.objects;
create policy "Public read material photos"
  on storage.objects for select
  using (bucket_id = 'material-photos');

-- Opsional untuk alur edit lama yang masih mengunggah langsung dari browser.
drop policy if exists "Seller upload own material photos" on storage.objects;
create policy "Seller upload own material photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'material-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Seller update own material photos" on storage.objects;
create policy "Seller update own material photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'material-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
