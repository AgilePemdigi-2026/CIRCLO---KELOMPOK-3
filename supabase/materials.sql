-- USULAN skema. Samakan dengan tabel yang sudah dibuat teman kelompok, atau jalankan ini
-- di Supabase SQL Editor kalau tabel material belum ada. Kalau nama kolom berbeda,
-- ubah fungsi toRow() di lib/materials.js.

create table if not exists public.materials (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid references auth.users (id),
  nama           text not null,
  jenis_material text not null,
  kategori       text not null,
  kondisi        text not null,          -- penilaian AI (Sangat Baik, Baik, dst)
  kondisi_seller text,                    -- isian Seller di field Condition, mis. 'Bersih dan kering'
  dimensi        text,
  skor_ai        integer check (skor_ai between 0 and 100),
  deskripsi      text not null,
  jumlah         numeric not null check (jumlah > 0),
  harga          numeric not null check (harga >= 0),
  lokasi         text not null,
  foto_url       text,
  status         text not null default 'aktif',
  created_at     timestamptz not null default now()
);

alter table public.materials enable row level security;

-- Siapa pun boleh melihat katalog
create policy "materials_read" on public.materials
  for select using (true);

-- Seller yang login hanya boleh menambah dan mengubah materialnya sendiri.
-- Role dibaca dari app_metadata (hanya bisa diubah server/admin). Jangan pakai user_metadata
-- untuk keamanan, karena user bisa mengubahnya sendiri. Kalau role disimpan di tabel profiles,
-- ganti kondisi role di bawah dengan pengecekan ke tabel itu.
create policy "materials_insert_own" on public.materials
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'seller'
  );
create policy "materials_update_own" on public.materials
  for update to authenticated using (seller_id = auth.uid());

-- Bucket foto (publik untuk dibaca)
insert into storage.buckets (id, name, public)
values ('material-photos', 'material-photos', true)
on conflict (id) do nothing;

create policy "photos_read" on storage.objects
  for select using (bucket_id = 'material-photos');
create policy "photos_upload_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'material-photos');
