-- supabase/chat.sql
-- Fitur Chat Buyer-Seller (SRS 4.10). Jalankan sekali di SQL Editor Supabase.
-- Peserta percakapan disimpan lewat auth user id (uuid) supaya tidak bergantung pada tipe
-- id_buyer / id_seller di tabel pembeli dan penjual. Nama lawan bicara disalin (denormalisasi)
-- agar daftar percakapan bisa ditampilkan tanpa join. Akses lewat API server (service role).

-- Jika sebelumnya pernah menjalankan chat.sql versi lain (kolom id_percakapan / id_buyer), tabel lama
-- dihapus dulu karena skemanya tidak cocok dengan kode sekarang (isinya hanya data uji).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'percakapan' and column_name = 'id_percakapan') then
    drop table if exists public.pesan_chat cascade;
    drop table if exists public.percakapan cascade;
  end if;
end $$;

create table if not exists public.percakapan (
  id                uuid primary key default gen_random_uuid(),
  buyer_auth_id     uuid not null,
  seller_auth_id    uuid not null,
  buyer_name        text not null default '',
  seller_name       text not null default '',
  id_material       int  references public.material(id_material) on delete set null,
  terakhir_pesan    text not null default '',
  terakhir_pesan_at timestamptz not null default now(),
  dibuat_pada       timestamptz not null default now(),
  check (buyer_auth_id <> seller_auth_id)
);

-- Satu percakapan per pasangan buyer-seller per material (material boleh kosong).
create unique index if not exists percakapan_unik
  on public.percakapan (buyer_auth_id, seller_auth_id, coalesce(id_material, -1));
create index if not exists percakapan_buyer_idx  on public.percakapan (buyer_auth_id, terakhir_pesan_at desc);
create index if not exists percakapan_seller_idx on public.percakapan (seller_auth_id, terakhir_pesan_at desc);

create table if not exists public.pesan_chat (
  id             uuid primary key default gen_random_uuid(),
  id_percakapan  uuid not null references public.percakapan(id) on delete cascade,
  pengirim_id    uuid not null,
  pengirim_role  text not null check (pengirim_role in ('buyer','seller')),
  isi            text not null check (char_length(isi) between 1 and 1000),
  client_id      text,
  dibuat_pada    timestamptz not null default now()
);

-- client_id mencegah pesan ganda saat pengguna menekan "Coba Lagi".
create unique index if not exists pesan_chat_client_unik
  on public.pesan_chat (id_percakapan, client_id) where client_id is not null;
create index if not exists pesan_chat_riwayat_idx on public.pesan_chat (id_percakapan, dibuat_pada);

-- Tabel hanya diakses lewat API server (service role), jadi RLS dinyalakan tanpa policy publik.
alter table public.percakapan enable row level security;
alter table public.pesan_chat enable row level security;
