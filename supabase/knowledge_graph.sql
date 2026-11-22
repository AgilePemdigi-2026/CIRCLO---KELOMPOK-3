-- Knowledge Graph pemanfaatan material CIRCLO.
-- Sumber: tabel resep_produk (pengetahuan proses referensi).
-- Jalankan di Supabase SQL Editor. Aman dijalankan berulang: hanya node/edge
-- dengan sumber_data = 'resep_produk' yang dibangun ulang.
--
-- Catatan: graph ini TIDAK menyimpan klaim dampak lingkungan. Ia menghubungkan
-- kategori material -> proses -> produk berdasarkan data resep yang ada.

CREATE TABLE IF NOT EXISTS public.kg_nodes (
    id_node text PRIMARY KEY,
    tipe text NOT NULL,
    label text NOT NULL,
    kategori text,
    ref_table text,
    ref_id text,
    sumber_data text NOT NULL DEFAULT 'manual',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_edges (
    id_edge bigserial PRIMARY KEY,
    sumber text NOT NULL REFERENCES public.kg_nodes(id_node) ON DELETE CASCADE,
    relasi text NOT NULL,
    target text NOT NULL REFERENCES public.kg_nodes(id_node) ON DELETE CASCADE,
    bobot numeric(6,3) NOT NULL DEFAULT 1,
    sumber_data text NOT NULL DEFAULT 'manual',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT kg_edges_unik UNIQUE (sumber, relasi, target)
);

CREATE INDEX IF NOT EXISTS idx_kg_edges_sumber ON public.kg_edges(sumber);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON public.kg_edges(target);
CREATE INDEX IF NOT EXISTS idx_kg_edges_relasi ON public.kg_edges(relasi);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_tipe ON public.kg_nodes(tipe);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_kategori ON public.kg_nodes(kategori);

CREATE OR REPLACE FUNCTION public.build_knowledge_graph_from_resep()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Hanya hapus turunan dari resep_produk; node/edge manual tetap aman.
    DELETE FROM public.kg_edges WHERE sumber_data = 'resep_produk';
    DELETE FROM public.kg_nodes WHERE sumber_data = 'resep_produk';

    -- Node kategori material.
    INSERT INTO public.kg_nodes
        (id_node, tipe, label, kategori, ref_table, ref_id, sumber_data, metadata)
    SELECT DISTINCT
        'kategori:' || regexp_replace(lower(btrim(kategori_material)), '[^a-z0-9]+', '_', 'g'),
        'kategori_material',
        btrim(kategori_material),
        btrim(kategori_material),
        'resep_produk',
        NULL,
        'resep_produk',
        jsonb_build_object('kategori', btrim(kategori_material))
    FROM public.resep_produk
    WHERE kategori_material IS NOT NULL AND btrim(kategori_material) <> ''
    ON CONFLICT (id_node) DO UPDATE SET
        label = EXCLUDED.label,
        kategori = EXCLUDED.kategori,
        metadata = EXCLUDED.metadata;

    -- Node produk.
    INSERT INTO public.kg_nodes
        (id_node, tipe, label, kategori, ref_table, ref_id, sumber_data, metadata)
    SELECT
        'produk:' || id_resep::text,
        'produk',
        nama_produk,
        kategori_material,
        'resep_produk',
        id_resep::text,
        'resep_produk',
        jsonb_build_object(
            'id_resep', id_resep,
            'bahan_per_unit', bahan_per_unit,
            'satuan', satuan,
            'persen_susut', persen_susut,
            'estimasi_modal', estimasi_modal
        )
    FROM public.resep_produk
    ON CONFLICT (id_node) DO UPDATE SET
        label = EXCLUDED.label,
        kategori = EXCLUDED.kategori,
        metadata = EXCLUDED.metadata;

    -- Node proses (satu proses per resep).
    INSERT INTO public.kg_nodes
        (id_node, tipe, label, kategori, ref_table, ref_id, sumber_data, metadata)
    SELECT
        'proses:' || id_resep::text,
        'proses',
        'Pengolahan ' || nama_produk,
        kategori_material,
        'resep_produk',
        id_resep::text,
        'resep_produk',
        jsonb_build_object(
            'id_resep', id_resep,
            'langkah_singkat', langkah_singkat,
            'catatan_k3', catatan_k3
        )
    FROM public.resep_produk
    ON CONFLICT (id_node) DO UPDATE SET
        label = EXCLUDED.label,
        kategori = EXCLUDED.kategori,
        metadata = EXCLUDED.metadata;

    -- Kategori -> proses.
    INSERT INTO public.kg_edges (sumber, relasi, target, sumber_data, metadata)
    SELECT
        k.id_node,
        'diproses_dengan',
        p.id_node,
        'resep_produk',
        jsonb_build_object('id_resep', r.id_resep)
    FROM public.resep_produk r
    JOIN public.kg_nodes k
      ON k.id_node = 'kategori:' || regexp_replace(lower(btrim(r.kategori_material)), '[^a-z0-9]+', '_', 'g')
    JOIN public.kg_nodes p
      ON p.id_node = 'proses:' || r.id_resep::text
    ON CONFLICT (sumber, relasi, target) DO NOTHING;

    -- Proses -> produk.
    INSERT INTO public.kg_edges (sumber, relasi, target, sumber_data, metadata)
    SELECT
        p.id_node,
        'menghasilkan',
        pr.id_node,
        'resep_produk',
        jsonb_build_object('id_resep', r.id_resep)
    FROM public.resep_produk r
    JOIN public.kg_nodes p
      ON p.id_node = 'proses:' || r.id_resep::text
    JOIN public.kg_nodes pr
      ON pr.id_node = 'produk:' || r.id_resep::text
    ON CONFLICT (sumber, relasi, target) DO NOTHING;

    -- Kategori -> produk (jalur ringkas untuk rekomendasi).
    INSERT INTO public.kg_edges (sumber, relasi, target, sumber_data, metadata)
    SELECT
        k.id_node,
        'berpotensi_menjadi',
        pr.id_node,
        'resep_produk',
        jsonb_build_object('id_resep', r.id_resep)
    FROM public.resep_produk r
    JOIN public.kg_nodes k
      ON k.id_node = 'kategori:' || regexp_replace(lower(btrim(r.kategori_material)), '[^a-z0-9]+', '_', 'g')
    JOIN public.kg_nodes pr
      ON pr.id_node = 'produk:' || r.id_resep::text
    ON CONFLICT (sumber, relasi, target) DO NOTHING;

    -- Produk -> kategori (untuk penelusuran balik).
    INSERT INTO public.kg_edges (sumber, relasi, target, sumber_data, metadata)
    SELECT
        pr.id_node,
        'berbahan_dasar',
        k.id_node,
        'resep_produk',
        jsonb_build_object('id_resep', r.id_resep)
    FROM public.resep_produk r
    JOIN public.kg_nodes pr
      ON pr.id_node = 'produk:' || r.id_resep::text
    JOIN public.kg_nodes k
      ON k.id_node = 'kategori:' || regexp_replace(lower(btrim(r.kategori_material)), '[^a-z0-9]+', '_', 'g')
    ON CONFLICT (sumber, relasi, target) DO NOTHING;
END;
$$;

SELECT public.build_knowledge_graph_from_resep();

ALTER TABLE public.kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kg_nodes_read ON public.kg_nodes;
CREATE POLICY kg_nodes_read ON public.kg_nodes FOR SELECT USING (true);

DROP POLICY IF EXISTS kg_edges_read ON public.kg_edges;
CREATE POLICY kg_edges_read ON public.kg_edges FOR SELECT USING (true);

GRANT SELECT ON public.kg_nodes TO anon, authenticated;
GRANT SELECT ON public.kg_edges TO anon, authenticated;
GRANT ALL ON public.kg_nodes TO service_role;
GRANT ALL ON public.kg_edges TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.kg_edges_id_edge_seq TO service_role;
