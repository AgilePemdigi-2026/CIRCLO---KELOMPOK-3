-- supabase/profiles.sql
-- Menyimpan profil pengguna ke tabel pembeli / penjual / pemerintah saat akun baru dibuat.
-- Skema ini mengikuti tabel yang SUDAH ADA di database (kolom *_buyer / *_seller / id_pemerintah).
-- Jalankan file ini di Supabase: Dashboard > SQL Editor > New query > Run.
--
-- Trigger berjalan sebagai SECURITY DEFINER sehingga melewati RLS, jadi insert tetap
-- berhasil walau sesi pengguna belum siap / email belum dikonfirmasi.
--
-- Catatan: kolom password_buyer / password_seller wajib terisi, padahal kata sandi
-- ditangani Supabase Auth. Jadi diisi nilai acak (tidak dipakai untuk login).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'buyer');
  v_nama text := coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), new.email);
begin
  begin
    if v_role = 'seller' then
      insert into public.penjual
        (auth_user_id, nama_seller, email_seller, password_seller, status_seller, alamat_seller)
      values
        (new.id, v_nama, new.email, gen_random_uuid()::text, true, '');
    elsif v_role = 'government' then
      insert into public.pemerintah
        (auth_user_id, nama_instansi, wilayah_tugas)
      values
        (new.id, v_nama, '');
    else
      insert into public.pembeli
        (auth_user_id, nama_buyer, email_buyer, password_buyer, status_buyer, alamat_buyer)
      values
        (new.id, v_nama, new.email, gen_random_uuid()::text, true, '');
    end if;
  exception when others then
    -- Jangan sampai gagal insert profil membatalkan pembuatan akun.
    raise warning 'handle_new_user gagal untuk %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: masukkan akun yang sudah terlanjur dibuat sebelum trigger ada.
insert into public.pembeli
  (auth_user_id, nama_buyer, email_buyer, password_buyer, status_buyer, alamat_buyer)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'nama', ''), u.email),
       u.email, gen_random_uuid()::text, true, ''
from auth.users u
where coalesce(nullif(u.raw_user_meta_data ->> 'role', ''), 'buyer') = 'buyer'
  and not exists (select 1 from public.pembeli p where p.auth_user_id = u.id);

insert into public.penjual
  (auth_user_id, nama_seller, email_seller, password_seller, status_seller, alamat_seller)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'nama', ''), u.email),
       u.email, gen_random_uuid()::text, true, ''
from auth.users u
where (u.raw_user_meta_data ->> 'role') = 'seller'
  and not exists (select 1 from public.penjual p where p.auth_user_id = u.id);

insert into public.pemerintah (auth_user_id, nama_instansi, wilayah_tugas)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'nama', ''), u.email),
       ''
from auth.users u
where (u.raw_user_meta_data ->> 'role') = 'government'
  and not exists (select 1 from public.pemerintah p where p.auth_user_id = u.id);
