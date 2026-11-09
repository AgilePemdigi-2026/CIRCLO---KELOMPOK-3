


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cancel_buyer_order"("p_order_id" integer, "p_auth_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_status text;
    v_detail record;
    v_jumlah_material integer := 0;
BEGIN
    -- Validasi input
    IF p_order_id IS NULL
       OR p_order_id <= 0
       OR p_auth_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Data pembatalan tidak valid.'
        );
    END IF;

    -- Pastikan pesanan milik Buyer yang login.
    -- Kunci pesanan untuk mencegah pembatalan ganda.
    SELECT p.status_pesanan
    INTO v_status
    FROM public.pesanan p
    JOIN public.pembeli b
        ON b.id_buyer = p.id_buyer
    WHERE p.id_pesanan = p_order_id
      AND b.auth_user_id = p_auth_user_id
    FOR UPDATE OF p;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Pesanan tidak ditemukan atau bukan milik Anda.'
        );
    END IF;

    -- Hanya pesanan yang belum dikonfirmasi
    -- yang boleh dibatalkan.
    IF LOWER(TRIM(COALESCE(v_status, '')))
       <> 'menunggu konfirmasi' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Pesanan tidak dapat dibatalkan pada status ini.'
        );
    END IF;

    -- Kembalikan stok seluruh material.
    -- Material diproses dalam urutan ID.
    FOR v_detail IN
        SELECT
            d.id_material,
            SUM(d.kuantitas_pesan) AS jumlah
        FROM public.detail_pesanan d
        WHERE d.id_pesanan = p_order_id
        GROUP BY d.id_material
        ORDER BY d.id_material
    LOOP
        IF v_detail.jumlah IS NULL
           OR v_detail.jumlah <= 0 THEN
            RAISE EXCEPTION
                'Jumlah material pesanan tidak valid.';
        END IF;

        UPDATE public.material
        SET stok = stok + v_detail.jumlah
        WHERE id_material = v_detail.id_material;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Material % tidak ditemukan.',
                v_detail.id_material;
        END IF;

        v_jumlah_material := v_jumlah_material + 1;
    END LOOP;

    IF v_jumlah_material = 0 THEN
        RAISE EXCEPTION
            'Detail pesanan tidak ditemukan.';
    END IF;

    -- Ubah status pesanan.
    UPDATE public.pesanan
    SET status_pesanan = 'Dibatalkan'
    WHERE id_pesanan = p_order_id;

    -- Catat riwayat pembatalan.
    INSERT INTO public.riwayat_pesanan (
        id_pesanan,
        status_update,
        waktu_update
    )
    VALUES (
        p_order_id,
        'Dibatalkan',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'id_pesanan', p_order_id,
        'status_pesanan', 'Dibatalkan',
        'jumlah_material', v_jumlah_material
    );
END;
$$;


ALTER FUNCTION "public"."cancel_buyer_order"("p_order_id" integer, "p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cart_add_item"("p_buyer_id" integer, "p_material_id" integer, "p_quantity" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_cart_id integer;
    v_current_quantity integer;
    v_stock integer;
    v_active boolean;
    v_new_quantity integer;
BEGIN
    -- Validasi jumlah
    IF p_buyer_id IS NULL
       OR p_material_id IS NULL
       OR p_quantity IS NULL
       OR p_quantity < 1
       OR p_quantity > 10000
    THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Data keranjang tidak valid.'
        );
    END IF;

    -- Kunci transaksi untuk Buyer dan material yang sama
    PERFORM pg_advisory_xact_lock(
        p_buyer_id,
        p_material_id
    );

    -- Pastikan material tersedia
    SELECT stok, status_material
    INTO v_stock, v_active
    FROM public.material
    WHERE id_material = p_material_id;

    IF NOT FOUND OR v_active IS DISTINCT FROM true
       OR COALESCE(v_stock, 0) <= 0
    THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Material tidak tersedia.'
        );
    END IF;

    -- Cari material yang sudah ada di keranjang Buyer
    SELECT k.id_keranjang, k.kuantitas
    INTO v_cart_id, v_current_quantity
    FROM public.keranjang k
    JOIN public.keranjang_pembeli kp
        ON kp.id_keranjang = k.id_keranjang
    JOIN public.item i
        ON i.id_keranjang = k.id_keranjang
    WHERE kp.id_buyer = p_buyer_id
      AND i.id_material = p_material_id
    ORDER BY k.id_keranjang
    LIMIT 1
    FOR UPDATE OF k;

    IF FOUND THEN
        -- Material sudah ada: tambahkan jumlah
        v_new_quantity := v_current_quantity + p_quantity;

        IF v_new_quantity > v_stock THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Jumlah melebihi stok tersedia.'
            );
        END IF;

        UPDATE public.keranjang
        SET kuantitas = v_new_quantity
        WHERE id_keranjang = v_cart_id;

    ELSE
        -- Material baru: buat keranjang
        IF p_quantity > v_stock THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Jumlah melebihi stok tersedia.'
            );
        END IF;

        INSERT INTO public.keranjang (kuantitas)
        VALUES (p_quantity)
        RETURNING id_keranjang INTO v_cart_id;

        INSERT INTO public.keranjang_pembeli (
            id_keranjang,
            id_buyer
        )
        VALUES (
            v_cart_id,
            p_buyer_id
        );

        INSERT INTO public.item (
            id_keranjang,
            id_material
        )
        VALUES (
            v_cart_id,
            p_material_id
        );

        v_new_quantity := p_quantity;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id_keranjang', v_cart_id,
        'jumlah', v_new_quantity
    );
END;
$$;


ALTER FUNCTION "public"."cart_add_item"("p_buyer_id" integer, "p_material_id" integer, "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cart_delete_item"("p_buyer_id" integer, "p_cart_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_cart_id integer;
    v_buyer_count integer;
    v_item_count integer;
BEGIN
    -- Validasi input
    IF p_buyer_id IS NULL
       OR p_cart_id IS NULL
       OR p_buyer_id <= 0
       OR p_cart_id <= 0
    THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Data keranjang tidak valid.'
        );
    END IF;

    -- Pastikan keranjang milik Buyer yang sedang login
    -- sekaligus mengunci baris selama proses penghapusan
    SELECT k.id_keranjang
    INTO v_cart_id
    FROM public.keranjang AS k
    JOIN public.keranjang_pembeli AS kp
      ON kp.id_keranjang = k.id_keranjang
    WHERE k.id_keranjang = p_cart_id
      AND kp.id_buyer = p_buyer_id
    FOR UPDATE OF k;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Keranjang tidak ditemukan.'
        );
    END IF;

    -- Pengamanan untuk struktur keranjang CIRCLO:
    -- satu keranjang hanya boleh milik satu Buyer
    -- dan menyimpan satu jenis material
    SELECT COUNT(*)
    INTO v_buyer_count
    FROM public.keranjang_pembeli
    WHERE id_keranjang = v_cart_id;

    SELECT COUNT(*)
    INTO v_item_count
    FROM public.item
    WHERE id_keranjang = v_cart_id;

    IF v_buyer_count <> 1 OR v_item_count <> 1 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Struktur keranjang perlu diperiksa.'
        );
    END IF;

    -- Hapus relasi material
    DELETE FROM public.item
    WHERE id_keranjang = v_cart_id;

    -- Hapus relasi Buyer
    DELETE FROM public.keranjang_pembeli
    WHERE id_keranjang = v_cart_id
      AND id_buyer = p_buyer_id;

    -- Hapus data keranjang
    DELETE FROM public.keranjang
    WHERE id_keranjang = v_cart_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Material berhasil dihapus dari keranjang.',
        'id_keranjang', v_cart_id
    );
END;
$$;


ALTER FUNCTION "public"."cart_delete_item"("p_buyer_id" integer, "p_cart_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cart_update_quantity"("p_buyer_id" integer, "p_cart_id" integer, "p_quantity" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_material_id integer;
    v_stock integer;
    v_active boolean;
BEGIN
    -- Pastikan jumlah valid
    IF p_quantity IS NULL
       OR p_quantity < 1
       OR p_quantity > 10000
    THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Jumlah material harus lebih dari 0.'
        );
    END IF;

    -- Pastikan keranjang milik Buyer
    -- dan kunci baris selama pembaruan
    PERFORM 1
    FROM public.keranjang k
    JOIN public.keranjang_pembeli kp
      ON kp.id_keranjang = k.id_keranjang
    WHERE k.id_keranjang = p_cart_id
      AND kp.id_buyer = p_buyer_id
    FOR UPDATE OF k;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Keranjang tidak ditemukan.'
        );
    END IF;

    -- Temukan material pada keranjang
    SELECT i.id_material
    INTO v_material_id
    FROM public.item i
    WHERE i.id_keranjang = p_cart_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Material keranjang tidak ditemukan.'
        );
    END IF;

    -- Periksa stok terbaru
    SELECT stok, status_material
    INTO v_stock, v_active
    FROM public.material
    WHERE id_material = v_material_id;

    IF NOT FOUND
       OR v_active IS DISTINCT FROM true
    THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Material sudah tidak tersedia.'
        );
    END IF;

    IF p_quantity > COALESCE(v_stock, 0) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Jumlah melebihi stok yang tersedia.'
        );
    END IF;

    -- Simpan jumlah terbaru
    UPDATE public.keranjang
    SET kuantitas = p_quantity
    WHERE id_keranjang = p_cart_id;

    RETURN jsonb_build_object(
        'success', true,
        'id_keranjang', p_cart_id,
        'jumlah', p_quantity
    );
END;
$$;


ALTER FUNCTION "public"."cart_update_quantity"("p_buyer_id" integer, "p_cart_id" integer, "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checkout_selected_cart"("p_buyer_id" integer, "p_cart_items" "jsonb", "p_metode_kirim" "text", "p_alamat" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
    v_entry jsonb;
    v_cart_id integer;
    v_material_id integer;
    v_qty integer;
    v_price numeric;
    v_ids integer[] := ARRAY[]::integer[];
    v_count integer;
    v_seller_id integer;
    v_total numeric := 0;
    v_order_id integer;
    v_row record;
BEGIN
    -- VALIDASI BUYER
    IF p_buyer_id IS NULL OR p_buyer_id <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Buyer tidak valid.'
        );
    END IF;

    PERFORM 1
    FROM public.pembeli
    WHERE id_buyer = p_buyer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Buyer tidak ditemukan.'
        );
    END IF;

    -- VALIDASI DATA CHECKOUT
    IF jsonb_typeof(p_cart_items) IS DISTINCT FROM 'array' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Data keranjang tidak valid.'
        );
    END IF;

    IF jsonb_array_length(p_cart_items) NOT BETWEEN 2 AND 20 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Pilih 2 sampai 20 material.'
        );
    END IF;

    IF p_metode_kirim IS NULL
       OR p_metode_kirim NOT IN ('Dikirim', 'Ambil di tempat') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Metode pengiriman tidak valid.'
        );
    END IF;

    IF p_metode_kirim = 'Dikirim'
       AND COALESCE(BTRIM(p_alamat), '') = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Alamat pengiriman wajib diisi.'
        );
    END IF;

    -- MEMBACA ID KERANJANG
    FOR v_entry IN
        SELECT value FROM jsonb_array_elements(p_cart_items)
    LOOP
        IF jsonb_typeof(v_entry) <> 'object'
           OR COALESCE(v_entry->>'id_keranjang', '') !~ '^[0-9]{1,9}$'
           OR COALESCE(v_entry->>'kuantitas', '') !~ '^[0-9]{1,6}$'
           OR COALESCE(v_entry->>'harga', '') !~ '^[0-9]+(\.[0-9]+)?$'
        THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Format material tidak valid.'
            );
        END IF;

        v_cart_id := (v_entry->>'id_keranjang')::integer;
        v_qty := (v_entry->>'kuantitas')::integer;
        v_price := (v_entry->>'harga')::numeric;

        IF v_cart_id <= 0
           OR v_qty <= 0
           OR v_price < 0
           OR v_cart_id = ANY(v_ids) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Material tidak valid atau duplikat.'
            );
        END IF;

        v_ids := array_append(v_ids, v_cart_id);
    END LOOP;

    -- KUNCI DAN VERIFIKASI KERANJANG
    FOR v_cart_id IN
        SELECT unnest(v_ids) ORDER BY 1
    LOOP
        PERFORM 1
        FROM public.keranjang
        WHERE id_keranjang = v_cart_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Keranjang tidak ditemukan.'
            );
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM public.keranjang_pembeli
        WHERE id_keranjang = v_cart_id
          AND id_buyer = p_buyer_id;

        IF v_count <> 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Keranjang bukan milik Buyer.'
            );
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM public.keranjang_pembeli
        WHERE id_keranjang = v_cart_id;

        IF v_count <> 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Relasi keranjang tidak valid.'
            );
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM public.item
        WHERE id_keranjang = v_cart_id;

        IF v_count <> 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Item keranjang tidak valid.'
            );
        END IF;
    END LOOP;

    -- KUNCI MATERIAL AGAR STOK TIDAK BERUBAH
    FOR v_material_id IN
        SELECT DISTINCT id_material
        FROM public.item
        WHERE id_keranjang = ANY(v_ids)
        ORDER BY id_material
    LOOP
        PERFORM 1
        FROM public.material
        WHERE id_material = v_material_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Material tidak ditemukan.'
            );
        END IF;
    END LOOP;

    -- CEK HARGA, JUMLAH, DAN SELLER
    FOR v_entry IN
        SELECT value FROM jsonb_array_elements(p_cart_items)
    LOOP
        v_cart_id := (v_entry->>'id_keranjang')::integer;
        v_qty := (v_entry->>'kuantitas')::integer;
        v_price := (v_entry->>'harga')::numeric;

        SELECT
            k.kuantitas,
            m.harga,
            m.stok,
            m.id_seller,
            m.status_material
        INTO v_row
        FROM public.keranjang k
        JOIN public.item i
            ON i.id_keranjang = k.id_keranjang
        JOIN public.material m
            ON m.id_material = i.id_material
        WHERE k.id_keranjang = v_cart_id;

        IF NOT FOUND OR v_row.status_material IS DISTINCT FROM TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Material tidak tersedia.'
            );
        END IF;

        IF v_row.kuantitas IS DISTINCT FROM v_qty
           OR v_row.harga IS DISTINCT FROM v_price THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Jumlah atau harga berubah. Refresh keranjang.'
            );
        END IF;

        IF v_row.harga IS NULL OR v_row.harga < 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Harga material tidak valid.'
            );
        END IF;

        IF v_row.id_seller IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Seller material tidak ditemukan.'
            );
        END IF;

        IF v_seller_id IS NULL THEN
            v_seller_id := v_row.id_seller;
        ELSIF v_seller_id <> v_row.id_seller THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Checkout gabungan harus dari toko yang sama.'
            );
        END IF;

        v_total := v_total + v_qty * v_row.harga;
    END LOOP;

    -- CEK TOTAL STOK SETIAP MATERIAL
    FOR v_row IN
        SELECT
            m.id_material,
            m.stok,
            SUM(k.kuantitas) AS jumlah
        FROM public.item i
        JOIN public.keranjang k
            ON k.id_keranjang = i.id_keranjang
        JOIN public.material m
            ON m.id_material = i.id_material
        WHERE i.id_keranjang = ANY(v_ids)
        GROUP BY m.id_material, m.stok
    LOOP
        IF v_row.jumlah > COALESCE(v_row.stok, 0) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Stok material tidak mencukupi.'
            );
        END IF;
    END LOOP;

    -- MEMBUAT SATU PESANAN
    INSERT INTO public.pesanan (
        id_buyer,
        total_estimasi,
        metode_kirim,
        status_pesanan,
        tgl_pesan
    )
    VALUES (
        p_buyer_id,
        ROUND(v_total, 2),
        p_metode_kirim,
        'Menunggu Konfirmasi',
        NOW()
    )
    RETURNING id_pesanan INTO v_order_id;

    -- MEMBUAT DETAIL UNTUK SEMUA MATERIAL
    INSERT INTO public.detail_pesanan (
        id_pesanan,
        id_material,
        kuantitas_pesan,
        subtotal
    )
    SELECT
        v_order_id,
        i.id_material,
        SUM(k.kuantitas),
        SUM(k.kuantitas * m.harga)
    FROM public.item i
    JOIN public.keranjang k
        ON k.id_keranjang = i.id_keranjang
    JOIN public.material m
        ON m.id_material = i.id_material
    WHERE i.id_keranjang = ANY(v_ids)
    GROUP BY i.id_material;

    -- KURANGI STOK
    FOR v_row IN
        SELECT
            i.id_material,
            SUM(k.kuantitas) AS jumlah
        FROM public.item i
        JOIN public.keranjang k
            ON k.id_keranjang = i.id_keranjang
        WHERE i.id_keranjang = ANY(v_ids)
        GROUP BY i.id_material
        ORDER BY i.id_material
    LOOP
        UPDATE public.material
        SET stok = stok - v_row.jumlah
        WHERE id_material = v_row.id_material
          AND stok >= v_row.jumlah;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Stok berubah. Pesanan dibatalkan.';
        END IF;
    END LOOP;

    -- SIMPAN ALAMAT KE PROFIL BUYER
    IF p_metode_kirim = 'Dikirim' THEN
        UPDATE public.pembeli
        SET alamat_buyer = BTRIM(p_alamat)
        WHERE id_buyer = p_buyer_id;
    END IF;

    -- SIMPAN RIWAYAT PESANAN
    INSERT INTO public.riwayat_pesanan (
        id_pesanan,
        status_update,
        waktu_update
    )
    VALUES (
        v_order_id,
        'Menunggu Konfirmasi',
        NOW()
    );

    -- HAPUS ITEM YANG BERHASIL DIPESAN DARI CART
    DELETE FROM public.item
    WHERE id_keranjang = ANY(v_ids);

    DELETE FROM public.keranjang_pembeli
    WHERE id_buyer = p_buyer_id
      AND id_keranjang = ANY(v_ids);

    DELETE FROM public.keranjang
    WHERE id_keranjang = ANY(v_ids);

    RETURN jsonb_build_object(
        'success', true,
        'id_pesanan', v_order_id,
        'total_estimasi', ROUND(v_total, 2),
        'jumlah_material', jsonb_array_length(p_cart_items)
    );
END;
$_$;


ALTER FUNCTION "public"."checkout_selected_cart"("p_buyer_id" integer, "p_cart_items" "jsonb", "p_metode_kirim" "text", "p_alamat" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_material"("p_nama" "text", "p_deskripsi" "text", "p_kondisi" "text", "p_kategori" "text", "p_stok" integer, "p_satuan" "text", "p_harga" numeric, "p_lokasi" "text", "p_kota" "text", "p_provinsi" "text", "p_foto_url" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT '{}'::"text"[], "p_ai_hasil" "jsonb" DEFAULT NULL::"jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_uid        uuid := auth.uid();
    v_role       text;
    v_seller     integer;
    v_email      text;
    v_nama_sell  text;
    v_kategori   text;
    v_id         integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Silakan login terlebih dahulu.';
    END IF;

    -- Hanya seller. Memakai klaim role di metadata akun; sesuaikan bila aplikasi memakai nama lain.
    v_role := lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role',
                             auth.jwt() -> 'app_metadata' ->> 'role', ''));
    IF v_role IN ('buyer', 'pembeli', 'government', 'pemerintah') THEN
        RAISE EXCEPTION 'Hanya Seller yang dapat mengunggah material.';
    END IF;

    IF length(trim(coalesce(p_nama, ''))) < 2 THEN
        RAISE EXCEPTION 'Nama material wajib diisi.';
    END IF;
    IF length(trim(coalesce(p_deskripsi, ''))) < 5 THEN
        RAISE EXCEPTION 'Deskripsi minimal 5 karakter.';
    END IF;
    IF coalesce(p_stok, 0) <= 0 THEN
        RAISE EXCEPTION 'Jumlah harus lebih dari 0.';
    END IF;
    IF p_harga IS NULL OR p_harga < 0 THEN
        RAISE EXCEPTION 'Harga tidak valid.';
    END IF;
    IF p_satuan IS NULL OR p_satuan NOT IN ('kg', 'm2', 'pcs', 'meter') THEN
        RAISE EXCEPTION 'Satuan tidak valid.';
    END IF;
    IF length(trim(coalesce(p_lokasi, ''))) = 0 THEN
        RAISE EXCEPTION 'Lokasi wajib diisi.';
    END IF;

    v_kategori := CASE
        WHEN p_kategori IN ('Spanduk','Plastik','Tekstil','Kulit','Kayu','Logam','Kaca','Karet','Organik','Kertas')
            THEN p_kategori
        ELSE 'Lainnya' END;

    -- Cari baris penjual milik akun ini; kalau belum ada, hubungkan lewat email atau buat baru
    SELECT id_seller INTO v_seller FROM penjual WHERE auth_user_id = v_uid;
    IF v_seller IS NULL THEN
        SELECT u.email,
               coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
          INTO v_email, v_nama_sell
          FROM auth.users u WHERE u.id = v_uid;

        SELECT id_seller INTO v_seller FROM penjual WHERE lower(email_seller) = lower(v_email);
        IF v_seller IS NOT NULL THEN
            UPDATE penjual SET auth_user_id = v_uid WHERE id_seller = v_seller;
        ELSE
            INSERT INTO penjual (auth_user_id, nama_seller, email_seller, password_seller, status_seller, alamat_seller)
            VALUES (v_uid, left(v_nama_sell, 50), left(v_email, 50), 'AUTH-MANAGED', true, left(trim(p_lokasi), 1000))
            RETURNING id_seller INTO v_seller;
        END IF;
    END IF;

    INSERT INTO material (id_seller, nama_material, kategori, stok, status_material, harga,
                          lokasi, deskripsi_material, kota, provinsi, satuan,
                          foto_url, kondisi, tags, ai_hasil)
    VALUES (v_seller, left(trim(p_nama), 100), v_kategori, p_stok, true, p_harga,
            trim(p_lokasi), trim(p_deskripsi),
            left(nullif(trim(coalesce(p_kota, '')), ''), 50),
            left(nullif(trim(coalesce(p_provinsi, '')), ''), 50),
            p_satuan, p_foto_url, nullif(trim(coalesce(p_kondisi, '')), ''),
            coalesce(p_tags, '{}'), p_ai_hasil)
    RETURNING id_material INTO v_id;

    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."create_material"("p_nama" "text", "p_deskripsi" "text", "p_kondisi" "text", "p_kategori" "text", "p_stok" integer, "p_satuan" "text", "p_harga" numeric, "p_lokasi" "text", "p_kota" "text", "p_provinsi" "text", "p_foto_url" "text", "p_tags" "text"[], "p_ai_hasil" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
BEGIN
    user_role := NEW.raw_user_meta_data ->> 'role';
    user_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'nama', ''),
        split_part(NEW.email, '@', 1)
    );

    IF user_role = 'seller' THEN

        INSERT INTO public.penjual (
            auth_user_id,
            nama_seller,
            email_seller,
            status_seller
        )
        VALUES (
            NEW.id,
            user_name,
            NEW.email,
            TRUE
        )
        ON CONFLICT (auth_user_id) DO NOTHING;

    ELSIF user_role = 'buyer' THEN

        INSERT INTO public.pembeli (
            auth_user_id,
            nama_buyer,
            email_buyer,
            status_buyer
        )
        VALUES (
            NEW.id,
            user_name,
            NEW.email,
            TRUE
        )
        ON CONFLICT (auth_user_id) DO NOTHING;

    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_materials"("query_embedding" "extensions"."vector", "p_kota" "text" DEFAULT NULL::"text", "p_provinsi" "text" DEFAULT NULL::"text", "p_max_harga" numeric DEFAULT NULL::numeric, "p_kategori" "text" DEFAULT NULL::"text", "match_count" integer DEFAULT 5) RETURNS TABLE("id_material" integer, "nama_material" character varying, "kategori" character varying, "stok" integer, "satuan" character varying, "harga" numeric, "kota" character varying, "provinsi" character varying, "deskripsi_material" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT m.id_material, m.nama_material, m.kategori,
           m.stok, m.satuan, m.harga,
           m.kota, m.provinsi, m.deskripsi_material,
           1 - (m.embedding <=> query_embedding) AS similarity
    FROM material m
    WHERE m.status_material = true
      AND m.stok > 0
      AND m.embedding IS NOT NULL
      AND (p_kota      IS NULL OR lower(m.kota)     = lower(p_kota))
      AND (p_provinsi  IS NULL OR lower(m.provinsi) = lower(p_provinsi))
      AND (p_max_harga IS NULL OR m.harga <= p_max_harga)
      AND (p_kategori  IS NULL OR m.kategori = p_kategori)
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
$$;


ALTER FUNCTION "public"."match_materials"("query_embedding" "extensions"."vector", "p_kota" "text", "p_provinsi" "text", "p_max_harga" numeric, "p_kategori" "text", "match_count" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_conversation" (
    "id_conversation" integer NOT NULL,
    "id_buyer" integer NOT NULL,
    "fase" character varying(20) DEFAULT 'discovery'::character varying NOT NULL,
    "slots" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_conversation_fase_check" CHECK ((("fase")::"text" = ANY ((ARRAY['discovery'::character varying, 'rekomendasi'::character varying, 'pendampingan'::character varying])::"text"[])))
);


ALTER TABLE "public"."ai_conversation" OWNER TO "postgres";


ALTER TABLE "public"."ai_conversation" ALTER COLUMN "id_conversation" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."ai_conversation_id_conversation_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ai_message" (
    "id_message" integer NOT NULL,
    "id_conversation" integer NOT NULL,
    "role" character varying(10) NOT NULL,
    "content" "text" NOT NULL,
    "material_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_message_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::"text"[])))
);


ALTER TABLE "public"."ai_message" OWNER TO "postgres";


ALTER TABLE "public"."ai_message" ALTER COLUMN "id_message" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."ai_message_id_message_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chat" (
    "id_chat" integer NOT NULL,
    "isi_pesan" "text" NOT NULL,
    "waktu_kirim" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_buyer" (
    "id_chat" integer NOT NULL,
    "id_buyer" integer NOT NULL
);


ALTER TABLE "public"."chat_buyer" OWNER TO "postgres";


ALTER TABLE "public"."chat" ALTER COLUMN "id_chat" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."chat_id_chat_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chat_seller" (
    "id_seller" integer NOT NULL,
    "id_chat" integer NOT NULL
);


ALTER TABLE "public"."chat_seller" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."detail_pesanan" (
    "id_detail" integer NOT NULL,
    "id_pesanan" integer NOT NULL,
    "id_material" integer NOT NULL,
    "kuantitas_pesan" integer NOT NULL,
    "subtotal" numeric(14,2) NOT NULL,
    CONSTRAINT "detail_pesanan_kuantitas_pesan_check" CHECK (("kuantitas_pesan" > 0)),
    CONSTRAINT "detail_pesanan_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);


ALTER TABLE "public"."detail_pesanan" OWNER TO "postgres";


ALTER TABLE "public"."detail_pesanan" ALTER COLUMN "id_detail" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."detail_pesanan_id_detail_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."item" (
    "id_keranjang" integer NOT NULL,
    "id_material" integer NOT NULL
);


ALTER TABLE "public"."item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."keranjang" (
    "id_keranjang" integer NOT NULL,
    "kuantitas" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "keranjang_kuantitas_check" CHECK (("kuantitas" >= 0))
);


ALTER TABLE "public"."keranjang" OWNER TO "postgres";


ALTER TABLE "public"."keranjang" ALTER COLUMN "id_keranjang" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."keranjang_id_keranjang_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."keranjang_pembeli" (
    "id_keranjang" integer NOT NULL,
    "id_buyer" integer NOT NULL
);


ALTER TABLE "public"."keranjang_pembeli" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material" (
    "id_material" integer NOT NULL,
    "id_seller" integer NOT NULL,
    "nama_material" character varying(100) NOT NULL,
    "kategori" character varying(20) NOT NULL,
    "stok" integer DEFAULT 0 NOT NULL,
    "status_material" boolean DEFAULT true NOT NULL,
    "harga" numeric(14,2) NOT NULL,
    "lokasi" "text" NOT NULL,
    "deskripsi_material" "text" NOT NULL,
    "kota" character varying(50),
    "provinsi" character varying(50),
    "satuan" character varying(10) DEFAULT 'kg'::character varying NOT NULL,
    "embedding" "extensions"."vector"(768),
    "foto_url" "text",
    "kondisi" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "ai_hasil" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kondisi_seller" "text",
    "kategori_ai" "text",
    "upload_token" "text",
    CONSTRAINT "material_harga_check" CHECK (("harga" >= (0)::numeric)),
    CONSTRAINT "material_stok_check" CHECK (("stok" >= 0))
);


ALTER TABLE "public"."material" OWNER TO "postgres";


ALTER TABLE "public"."material" ALTER COLUMN "id_material" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."material_id_material_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pemantauan" (
    "id_pemerintah" integer NOT NULL,
    "id_pesanan" integer NOT NULL
);


ALTER TABLE "public"."pemantauan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pembeli" (
    "id_buyer" integer NOT NULL,
    "auth_user_id" "uuid",
    "nama_buyer" character varying(50) NOT NULL,
    "email_buyer" character varying(50) NOT NULL,
    "password_buyer" character varying(255),
    "status_buyer" boolean DEFAULT true NOT NULL,
    "alamat_buyer" "text",
    "foto_buyer" "text"
);


ALTER TABLE "public"."pembeli" OWNER TO "postgres";


ALTER TABLE "public"."pembeli" ALTER COLUMN "id_buyer" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pembeli_id_buyer_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pemerintah" (
    "id_pemerintah" integer NOT NULL,
    "auth_user_id" "uuid",
    "nama_instansi" character varying(50) NOT NULL,
    "wilayah_tugas" "text" NOT NULL
);


ALTER TABLE "public"."pemerintah" OWNER TO "postgres";


ALTER TABLE "public"."pemerintah" ALTER COLUMN "id_pemerintah" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pemerintah_id_pemerintah_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."penjual" (
    "id_seller" integer NOT NULL,
    "auth_user_id" "uuid",
    "nama_seller" character varying(50) NOT NULL,
    "email_seller" character varying(50) NOT NULL,
    "password_seller" character varying(255),
    "status_seller" boolean DEFAULT true NOT NULL,
    "alamat_seller" "text",
    "foto_seller" "text"
);


ALTER TABLE "public"."penjual" OWNER TO "postgres";


ALTER TABLE "public"."penjual" ALTER COLUMN "id_seller" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."penjual_id_seller_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."percakapan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_auth_id" "uuid" NOT NULL,
    "seller_auth_id" "uuid" NOT NULL,
    "buyer_name" "text" DEFAULT ''::"text" NOT NULL,
    "seller_name" "text" DEFAULT ''::"text" NOT NULL,
    "id_material" integer,
    "terakhir_pesan" "text" DEFAULT ''::"text" NOT NULL,
    "terakhir_pesan_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dibuat_pada" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "percakapan_check" CHECK (("buyer_auth_id" <> "seller_auth_id"))
);


ALTER TABLE "public"."percakapan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pertanyaan" (
    "id_chat" integer NOT NULL,
    "id_material" integer NOT NULL
);


ALTER TABLE "public"."pertanyaan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pesan_chat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_percakapan" "uuid" NOT NULL,
    "pengirim_id" "uuid" NOT NULL,
    "pengirim_role" "text" NOT NULL,
    "isi" "text" NOT NULL,
    "client_id" "text",
    "dibuat_pada" timestamp with time zone DEFAULT "now"() NOT NULL,
    "diterima_pada" timestamp with time zone,
    "dibaca_pada" timestamp with time zone,
    CONSTRAINT "pesan_chat_isi_check" CHECK ((("char_length"("isi") >= 1) AND ("char_length"("isi") <= 1000))),
    CONSTRAINT "pesan_chat_pengirim_role_check" CHECK (("pengirim_role" = ANY (ARRAY['buyer'::"text", 'seller'::"text"])))
);


ALTER TABLE "public"."pesan_chat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pesanan" (
    "id_pesanan" integer NOT NULL,
    "id_buyer" integer NOT NULL,
    "total_estimasi" numeric(14,2) DEFAULT 0 NOT NULL,
    "metode_kirim" character varying(20) NOT NULL,
    "status_pesanan" character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    "tgl_pesan" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pesanan_total_estimasi_check" CHECK (("total_estimasi" >= (0)::numeric))
);


ALTER TABLE "public"."pesanan" OWNER TO "postgres";


ALTER TABLE "public"."pesanan" ALTER COLUMN "id_pesanan" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pesanan_id_pesanan_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."resep_produk" (
    "id_resep" integer NOT NULL,
    "nama_produk" character varying(100) NOT NULL,
    "kategori_material" character varying(20) NOT NULL,
    "bahan_per_unit" numeric(10,3) NOT NULL,
    "satuan" character varying(10) NOT NULL,
    "persen_susut" numeric(4,3) DEFAULT 0.10 NOT NULL,
    "estimasi_modal" numeric(14,2),
    "langkah_singkat" "text",
    "catatan_k3" "text",
    "kata_kunci_material" "text",
    CONSTRAINT "resep_produk_bahan_per_unit_check" CHECK (("bahan_per_unit" > (0)::numeric)),
    CONSTRAINT "resep_produk_persen_susut_check" CHECK ((("persen_susut" >= (0)::numeric) AND ("persen_susut" < (1)::numeric)))
);


ALTER TABLE "public"."resep_produk" OWNER TO "postgres";


ALTER TABLE "public"."resep_produk" ALTER COLUMN "id_resep" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."resep_produk_id_resep_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."riwayat_pesanan" (
    "id_riwayat" integer NOT NULL,
    "id_pesanan" integer NOT NULL,
    "status_update" character varying(20) NOT NULL,
    "waktu_update" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."riwayat_pesanan" OWNER TO "postgres";


ALTER TABLE "public"."riwayat_pesanan" ALTER COLUMN "id_riwayat" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."riwayat_pesanan_id_riwayat_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."v_stat_material_daerah" AS
 SELECT "provinsi",
    "kota",
    "kategori",
    "count"(*) AS "jumlah_listing",
    "sum"("stok") AS "total_stok",
    "min"(("satuan")::"text") AS "satuan",
    "round"("avg"("harga"), 2) AS "rata_harga"
   FROM "public"."material"
  WHERE (("status_material" = true) AND ("stok" > 0))
  GROUP BY "provinsi", "kota", "kategori";


ALTER VIEW "public"."v_stat_material_daerah" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_conversation"
    ADD CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id_conversation");



ALTER TABLE ONLY "public"."ai_message"
    ADD CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id_message");



ALTER TABLE ONLY "public"."chat_buyer"
    ADD CONSTRAINT "chat_buyer_id_chat_key" UNIQUE ("id_chat");



ALTER TABLE ONLY "public"."chat_buyer"
    ADD CONSTRAINT "chat_buyer_pkey" PRIMARY KEY ("id_chat", "id_buyer");



ALTER TABLE ONLY "public"."chat"
    ADD CONSTRAINT "chat_pkey" PRIMARY KEY ("id_chat");



ALTER TABLE ONLY "public"."chat_seller"
    ADD CONSTRAINT "chat_seller_id_chat_key" UNIQUE ("id_chat");



ALTER TABLE ONLY "public"."chat_seller"
    ADD CONSTRAINT "chat_seller_pkey" PRIMARY KEY ("id_seller", "id_chat");



ALTER TABLE ONLY "public"."detail_pesanan"
    ADD CONSTRAINT "detail_pesanan_pkey" PRIMARY KEY ("id_detail");



ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "item_pkey" PRIMARY KEY ("id_keranjang", "id_material");



ALTER TABLE ONLY "public"."keranjang_pembeli"
    ADD CONSTRAINT "keranjang_pembeli_id_keranjang_key" UNIQUE ("id_keranjang");



ALTER TABLE ONLY "public"."keranjang_pembeli"
    ADD CONSTRAINT "keranjang_pembeli_pkey" PRIMARY KEY ("id_keranjang", "id_buyer");



ALTER TABLE ONLY "public"."keranjang"
    ADD CONSTRAINT "keranjang_pkey" PRIMARY KEY ("id_keranjang");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_pkey" PRIMARY KEY ("id_material");



ALTER TABLE ONLY "public"."pemantauan"
    ADD CONSTRAINT "pemantauan_pkey" PRIMARY KEY ("id_pemerintah", "id_pesanan");



ALTER TABLE ONLY "public"."pembeli"
    ADD CONSTRAINT "pembeli_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."pembeli"
    ADD CONSTRAINT "pembeli_email_buyer_key" UNIQUE ("email_buyer");



ALTER TABLE ONLY "public"."pembeli"
    ADD CONSTRAINT "pembeli_pkey" PRIMARY KEY ("id_buyer");



ALTER TABLE ONLY "public"."pemerintah"
    ADD CONSTRAINT "pemerintah_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."pemerintah"
    ADD CONSTRAINT "pemerintah_pkey" PRIMARY KEY ("id_pemerintah");



ALTER TABLE ONLY "public"."penjual"
    ADD CONSTRAINT "penjual_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."penjual"
    ADD CONSTRAINT "penjual_email_seller_key" UNIQUE ("email_seller");



ALTER TABLE ONLY "public"."penjual"
    ADD CONSTRAINT "penjual_pkey" PRIMARY KEY ("id_seller");



ALTER TABLE ONLY "public"."percakapan"
    ADD CONSTRAINT "percakapan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pertanyaan"
    ADD CONSTRAINT "pertanyaan_pkey" PRIMARY KEY ("id_chat", "id_material");



ALTER TABLE ONLY "public"."pesan_chat"
    ADD CONSTRAINT "pesan_chat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pesanan"
    ADD CONSTRAINT "pesanan_pkey" PRIMARY KEY ("id_pesanan");



ALTER TABLE ONLY "public"."resep_produk"
    ADD CONSTRAINT "resep_produk_pkey" PRIMARY KEY ("id_resep");



ALTER TABLE ONLY "public"."riwayat_pesanan"
    ADD CONSTRAINT "riwayat_pesanan_pkey" PRIMARY KEY ("id_riwayat");



CREATE INDEX "idx_ai_conv_buyer" ON "public"."ai_conversation" USING "btree" ("id_buyer");



CREATE INDEX "idx_ai_msg_conv" ON "public"."ai_message" USING "btree" ("id_conversation", "created_at");



CREATE INDEX "idx_chat_buyer_buyer" ON "public"."chat_buyer" USING "btree" ("id_buyer");



CREATE INDEX "idx_chat_seller_seller" ON "public"."chat_seller" USING "btree" ("id_seller");



CREATE INDEX "idx_detail_material" ON "public"."detail_pesanan" USING "btree" ("id_material");



CREATE INDEX "idx_detail_pesanan" ON "public"."detail_pesanan" USING "btree" ("id_pesanan");



CREATE INDEX "idx_item_material" ON "public"."item" USING "btree" ("id_material");



CREATE INDEX "idx_keranjang_pembeli_buyer" ON "public"."keranjang_pembeli" USING "btree" ("id_buyer");



CREATE INDEX "idx_material_embedding" ON "public"."material" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_material_kategori" ON "public"."material" USING "btree" ("kategori");



CREATE INDEX "idx_material_kota" ON "public"."material" USING "btree" ("kota");



CREATE INDEX "idx_material_provinsi" ON "public"."material" USING "btree" ("provinsi");



CREATE INDEX "idx_material_seller" ON "public"."material" USING "btree" ("id_seller");



CREATE INDEX "idx_pemantauan_pesanan" ON "public"."pemantauan" USING "btree" ("id_pesanan");



CREATE INDEX "idx_pertanyaan_material" ON "public"."pertanyaan" USING "btree" ("id_material");



CREATE INDEX "idx_pesanan_buyer" ON "public"."pesanan" USING "btree" ("id_buyer");



CREATE INDEX "idx_riwayat_pesanan" ON "public"."riwayat_pesanan" USING "btree" ("id_pesanan");



CREATE UNIQUE INDEX "material_upload_token_key" ON "public"."material" USING "btree" ("upload_token") WHERE ("upload_token" IS NOT NULL);



CREATE UNIQUE INDEX "pembeli_auth_user_id_unique" ON "public"."pembeli" USING "btree" ("auth_user_id");



CREATE UNIQUE INDEX "penjual_auth_user_id_unique" ON "public"."penjual" USING "btree" ("auth_user_id");



CREATE INDEX "percakapan_buyer_idx" ON "public"."percakapan" USING "btree" ("buyer_auth_id", "terakhir_pesan_at" DESC);



CREATE UNIQUE INDEX "percakapan_pasangan_unik" ON "public"."percakapan" USING "btree" ("buyer_auth_id", "seller_auth_id");



CREATE INDEX "percakapan_seller_idx" ON "public"."percakapan" USING "btree" ("seller_auth_id", "terakhir_pesan_at" DESC);



CREATE UNIQUE INDEX "pesan_chat_client_unik" ON "public"."pesan_chat" USING "btree" ("id_percakapan", "client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "pesan_chat_riwayat_idx" ON "public"."pesan_chat" USING "btree" ("id_percakapan", "dibuat_pada");



CREATE UNIQUE INDEX "uq_material_seller_nama" ON "public"."material" USING "btree" ("id_seller", "nama_material");



CREATE UNIQUE INDEX "uq_resep_nama" ON "public"."resep_produk" USING "btree" ("nama_produk");



ALTER TABLE ONLY "public"."ai_conversation"
    ADD CONSTRAINT "ai_conversation_id_buyer_fkey" FOREIGN KEY ("id_buyer") REFERENCES "public"."pembeli"("id_buyer") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_message"
    ADD CONSTRAINT "ai_message_id_conversation_fkey" FOREIGN KEY ("id_conversation") REFERENCES "public"."ai_conversation"("id_conversation") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_buyer"
    ADD CONSTRAINT "chat_buyer_id_buyer_fkey" FOREIGN KEY ("id_buyer") REFERENCES "public"."pembeli"("id_buyer") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_buyer"
    ADD CONSTRAINT "chat_buyer_id_chat_fkey" FOREIGN KEY ("id_chat") REFERENCES "public"."chat"("id_chat") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_seller"
    ADD CONSTRAINT "chat_seller_id_chat_fkey" FOREIGN KEY ("id_chat") REFERENCES "public"."chat"("id_chat") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_seller"
    ADD CONSTRAINT "chat_seller_id_seller_fkey" FOREIGN KEY ("id_seller") REFERENCES "public"."penjual"("id_seller") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."detail_pesanan"
    ADD CONSTRAINT "detail_pesanan_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "public"."material"("id_material") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."detail_pesanan"
    ADD CONSTRAINT "detail_pesanan_id_pesanan_fkey" FOREIGN KEY ("id_pesanan") REFERENCES "public"."pesanan"("id_pesanan") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "item_id_keranjang_fkey" FOREIGN KEY ("id_keranjang") REFERENCES "public"."keranjang"("id_keranjang") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "item_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "public"."material"("id_material") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."keranjang_pembeli"
    ADD CONSTRAINT "keranjang_pembeli_id_buyer_fkey" FOREIGN KEY ("id_buyer") REFERENCES "public"."pembeli"("id_buyer") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."keranjang_pembeli"
    ADD CONSTRAINT "keranjang_pembeli_id_keranjang_fkey" FOREIGN KEY ("id_keranjang") REFERENCES "public"."keranjang"("id_keranjang") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_id_seller_fkey" FOREIGN KEY ("id_seller") REFERENCES "public"."penjual"("id_seller") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pemantauan"
    ADD CONSTRAINT "pemantauan_id_pemerintah_fkey" FOREIGN KEY ("id_pemerintah") REFERENCES "public"."pemerintah"("id_pemerintah") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pemantauan"
    ADD CONSTRAINT "pemantauan_id_pesanan_fkey" FOREIGN KEY ("id_pesanan") REFERENCES "public"."pesanan"("id_pesanan") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pembeli"
    ADD CONSTRAINT "pembeli_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pemerintah"
    ADD CONSTRAINT "pemerintah_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."penjual"
    ADD CONSTRAINT "penjual_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."percakapan"
    ADD CONSTRAINT "percakapan_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "public"."material"("id_material") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pertanyaan"
    ADD CONSTRAINT "pertanyaan_id_chat_fkey" FOREIGN KEY ("id_chat") REFERENCES "public"."chat"("id_chat") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pertanyaan"
    ADD CONSTRAINT "pertanyaan_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "public"."material"("id_material") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pesan_chat"
    ADD CONSTRAINT "pesan_chat_id_percakapan_fkey" FOREIGN KEY ("id_percakapan") REFERENCES "public"."percakapan"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pesanan"
    ADD CONSTRAINT "pesanan_id_buyer_fkey" FOREIGN KEY ("id_buyer") REFERENCES "public"."pembeli"("id_buyer") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."riwayat_pesanan"
    ADD CONSTRAINT "riwayat_pesanan_id_pesanan_fkey" FOREIGN KEY ("id_pesanan") REFERENCES "public"."pesanan"("id_pesanan") ON DELETE CASCADE;



CREATE POLICY "Buyer can view available materials" ON "public"."material" FOR SELECT TO "authenticated" USING ((("status_material" = true) AND ("stok" > 0)));



ALTER TABLE "public"."ai_conversation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_message" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_buyer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_seller" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."detail_pesanan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."keranjang" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."keranjang_pembeli" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pemantauan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pembeli" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pemerintah" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."penjual" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percakapan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pertanyaan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pesan_chat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pesanan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resep_produk" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riwayat_pesanan" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";












































































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "public"."cancel_buyer_order"("p_order_id" integer, "p_auth_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_buyer_order"("p_order_id" integer, "p_auth_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cart_add_item"("p_buyer_id" integer, "p_material_id" integer, "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cart_add_item"("p_buyer_id" integer, "p_material_id" integer, "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cart_delete_item"("p_buyer_id" integer, "p_cart_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cart_delete_item"("p_buyer_id" integer, "p_cart_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cart_update_quantity"("p_buyer_id" integer, "p_cart_id" integer, "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cart_update_quantity"("p_buyer_id" integer, "p_cart_id" integer, "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."checkout_selected_cart"("p_buyer_id" integer, "p_cart_items" "jsonb", "p_metode_kirim" "text", "p_alamat" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."checkout_selected_cart"("p_buyer_id" integer, "p_cart_items" "jsonb", "p_metode_kirim" "text", "p_alamat" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_material"("p_nama" "text", "p_deskripsi" "text", "p_kondisi" "text", "p_kategori" "text", "p_stok" integer, "p_satuan" "text", "p_harga" numeric, "p_lokasi" "text", "p_kota" "text", "p_provinsi" "text", "p_foto_url" "text", "p_tags" "text"[], "p_ai_hasil" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_material"("p_nama" "text", "p_deskripsi" "text", "p_kondisi" "text", "p_kategori" "text", "p_stok" integer, "p_satuan" "text", "p_harga" numeric, "p_lokasi" "text", "p_kota" "text", "p_provinsi" "text", "p_foto_url" "text", "p_tags" "text"[], "p_ai_hasil" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_material"("p_nama" "text", "p_deskripsi" "text", "p_kondisi" "text", "p_kategori" "text", "p_stok" integer, "p_satuan" "text", "p_harga" numeric, "p_lokasi" "text", "p_kota" "text", "p_provinsi" "text", "p_foto_url" "text", "p_tags" "text"[], "p_ai_hasil" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_material"("p_nama" "text", "p_deskripsi" "text", "p_kondisi" "text", "p_kategori" "text", "p_stok" integer, "p_satuan" "text", "p_harga" numeric, "p_lokasi" "text", "p_kota" "text", "p_provinsi" "text", "p_foto_url" "text", "p_tags" "text"[], "p_ai_hasil" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

































GRANT ALL ON TABLE "public"."ai_conversation" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversation" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversation" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_conversation_id_conversation_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_conversation_id_conversation_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_conversation_id_conversation_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_message" TO "anon";
GRANT ALL ON TABLE "public"."ai_message" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_message" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_message_id_message_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_message_id_message_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_message_id_message_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chat" TO "anon";
GRANT ALL ON TABLE "public"."chat" TO "authenticated";
GRANT ALL ON TABLE "public"."chat" TO "service_role";



GRANT ALL ON TABLE "public"."chat_buyer" TO "anon";
GRANT ALL ON TABLE "public"."chat_buyer" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_buyer" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chat_id_chat_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chat_id_chat_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chat_id_chat_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chat_seller" TO "anon";
GRANT ALL ON TABLE "public"."chat_seller" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_seller" TO "service_role";



GRANT ALL ON TABLE "public"."detail_pesanan" TO "anon";
GRANT ALL ON TABLE "public"."detail_pesanan" TO "authenticated";
GRANT ALL ON TABLE "public"."detail_pesanan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."detail_pesanan_id_detail_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."detail_pesanan_id_detail_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."detail_pesanan_id_detail_seq" TO "service_role";



GRANT ALL ON TABLE "public"."item" TO "anon";
GRANT ALL ON TABLE "public"."item" TO "authenticated";
GRANT ALL ON TABLE "public"."item" TO "service_role";



GRANT ALL ON TABLE "public"."keranjang" TO "anon";
GRANT ALL ON TABLE "public"."keranjang" TO "authenticated";
GRANT ALL ON TABLE "public"."keranjang" TO "service_role";



GRANT ALL ON SEQUENCE "public"."keranjang_id_keranjang_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."keranjang_id_keranjang_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."keranjang_id_keranjang_seq" TO "service_role";



GRANT ALL ON TABLE "public"."keranjang_pembeli" TO "anon";
GRANT ALL ON TABLE "public"."keranjang_pembeli" TO "authenticated";
GRANT ALL ON TABLE "public"."keranjang_pembeli" TO "service_role";



GRANT ALL ON TABLE "public"."material" TO "anon";
GRANT ALL ON TABLE "public"."material" TO "authenticated";
GRANT ALL ON TABLE "public"."material" TO "service_role";



GRANT ALL ON SEQUENCE "public"."material_id_material_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."material_id_material_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."material_id_material_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pemantauan" TO "anon";
GRANT ALL ON TABLE "public"."pemantauan" TO "authenticated";
GRANT ALL ON TABLE "public"."pemantauan" TO "service_role";



GRANT ALL ON TABLE "public"."pembeli" TO "anon";
GRANT ALL ON TABLE "public"."pembeli" TO "authenticated";
GRANT ALL ON TABLE "public"."pembeli" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pembeli_id_buyer_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pembeli_id_buyer_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pembeli_id_buyer_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pemerintah" TO "anon";
GRANT ALL ON TABLE "public"."pemerintah" TO "authenticated";
GRANT ALL ON TABLE "public"."pemerintah" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pemerintah_id_pemerintah_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pemerintah_id_pemerintah_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pemerintah_id_pemerintah_seq" TO "service_role";



GRANT ALL ON TABLE "public"."penjual" TO "anon";
GRANT ALL ON TABLE "public"."penjual" TO "authenticated";
GRANT ALL ON TABLE "public"."penjual" TO "service_role";



GRANT ALL ON SEQUENCE "public"."penjual_id_seller_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."penjual_id_seller_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."penjual_id_seller_seq" TO "service_role";



GRANT ALL ON TABLE "public"."percakapan" TO "anon";
GRANT ALL ON TABLE "public"."percakapan" TO "authenticated";
GRANT ALL ON TABLE "public"."percakapan" TO "service_role";



GRANT ALL ON TABLE "public"."pertanyaan" TO "anon";
GRANT ALL ON TABLE "public"."pertanyaan" TO "authenticated";
GRANT ALL ON TABLE "public"."pertanyaan" TO "service_role";



GRANT ALL ON TABLE "public"."pesan_chat" TO "anon";
GRANT ALL ON TABLE "public"."pesan_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."pesan_chat" TO "service_role";



GRANT ALL ON TABLE "public"."pesanan" TO "anon";
GRANT ALL ON TABLE "public"."pesanan" TO "authenticated";
GRANT ALL ON TABLE "public"."pesanan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pesanan_id_pesanan_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pesanan_id_pesanan_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pesanan_id_pesanan_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resep_produk" TO "anon";
GRANT ALL ON TABLE "public"."resep_produk" TO "authenticated";
GRANT ALL ON TABLE "public"."resep_produk" TO "service_role";



GRANT ALL ON SEQUENCE "public"."resep_produk_id_resep_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."resep_produk_id_resep_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."resep_produk_id_resep_seq" TO "service_role";



GRANT ALL ON TABLE "public"."riwayat_pesanan" TO "anon";
GRANT ALL ON TABLE "public"."riwayat_pesanan" TO "authenticated";
GRANT ALL ON TABLE "public"."riwayat_pesanan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."riwayat_pesanan_id_riwayat_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."riwayat_pesanan_id_riwayat_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."riwayat_pesanan_id_riwayat_seq" TO "service_role";



GRANT ALL ON TABLE "public"."v_stat_material_daerah" TO "anon";
GRANT ALL ON TABLE "public"."v_stat_material_daerah" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stat_material_daerah" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































