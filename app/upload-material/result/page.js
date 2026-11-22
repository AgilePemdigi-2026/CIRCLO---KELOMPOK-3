'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrainCircuit, CircleAlert, CircleCheck, LoaderCircle, Network, Pencil, Recycle, Ruler, Shapes, ThumbsUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { jenisInEnglish, normalizeAi } from '@/lib/classification';
import { setFlash } from '@/lib/flash';
import { isDemoStore, saveMaterial, updateMaterial } from '@/lib/materials';
import { clearDraft, clearResult, loadResult } from '@/lib/storage';

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-circlo-line py-[19px]">
      <div className="flex items-center gap-3 text-[15px] text-circlo-muted">
        <Icon className="h-[15px] w-[15px]" />
        {label}
      </div>
      <div className="text-[18px] font-medium text-circlo-ink">{children}</div>
    </div>
  );
}

function ClassificationResult() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    setData(loadResult());
    setReady(true);
  }, []);

  if (!ready) return null;

  // Tidak ada data klasifikasi (halaman dibuka langsung)
  if (!data) {
    return (
      <main className="mx-auto max-w-[768px] px-8 pt-20 text-center">
        <p className="text-[16px] text-circlo-muted">Belum ada hasil klasifikasi. Silakan upload material terlebih dahulu.</p>
        <Link href="/upload-material" className="mt-6 inline-block rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white">
          Ke halaman Upload Material
        </Link>
      </main>
    );
  }

  const { form, photo, editId } = data;
  const isEdit = Boolean(editId);

  // Gunakan hasil klasifikasi AI yang benar-benar tersimpan. Bila belum ada
  // (mis. halaman dibuka dengan draf lama), susun tampilan dari isian seller.
  const n = data.result
    ? normalizeAi(data.result)
    : normalizeAi({
        name: form?.name,
        description: form?.description,
        condition: form?.condition,
        category: 'Lainnya',
        specifications: [
          form?.quantity ? { label: 'Jumlah', value: `${form.quantity} ${form.satuan || ''}`.trim() } : null,
          String(form?.price ?? '').trim() !== ''
            ? { label: 'Harga per satuan', value: `Rp ${Number(form.price).toLocaleString('id-ID')}` }
            : null,
          form?.location ? { label: 'Lokasi', value: form.location } : null,
        ].filter(Boolean),
      });

  async function onConfirm() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    if (!form || !photo?.dataUrl) {
      setSaveError('Upload failed. Please check the data');
      savingRef.current = false;
      setSaving(false);
      return;
    }
    const material = {
      nama: n.nama,
      jenis_material: n.jenis,
      kategori: n.jenis,
      kategori_ai: n.kategori,
      kondisi: n.kondisi,
      kondisi_seller: form.condition.trim(),
      dimensi: n.dimensi,
      skor_ai: n.skor,
      satuan: form.satuan || 'kg',
      deskripsi: form.description.trim(),
      jumlah: Number(form.quantity),
      harga: Number(form.price),
      lokasi: form.location.trim(),
      upload_token: data.uploadToken,
    };
    try {
      if (isEdit) await updateMaterial(editId, { ...material, foto: photo.remote ? undefined : photo.dataUrl });
      else await saveMaterial({ ...material, foto: photo.dataUrl });

      clearDraft();
      clearResult();
      // Redirect langsung, pesan ditampilkan di halaman tujuan (skenario SRS: lihat pesan DAN berada di halaman tujuan)
      setFlash({
        type: 'ok',
        text: isEdit ? 'Material updated successfully' : 'Material uploaded successfully',
        note: isDemoStore ? 'Mode demo: tersimpan di browser ini saja, belum ke database.' : undefined,
      });
      router.push(isEdit ? '/my-materials' : '/marketplace');
    } catch (err) {
      setSaveError(err.message || 'Material gagal disimpan. Coba lagi.');
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <main className="mx-auto max-w-[800px] px-4 pt-12">
        {/* Banner penjelasan. Teks tersembunyi memuat jenis dalam bahasa Inggris sesuai skenario SRS 4.6. */}
        <section className="flex items-start gap-4 rounded-xl border border-[#D6EAD3] bg-gradient-to-r from-[#E6F3FB] to-white px-6 py-5 shadow-card">
          <span className="mt-0.5 flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-circlo-lime">
            <BrainCircuit className="h-6 w-6 text-circlo-green" />
          </span>
          <div>
            <h1 className="font-display text-[24px] font-bold text-circlo-green">
              AI Material Classification: {jenisInEnglish(n.jenis)}
            </h1>
            <p className="mt-1.5 text-[16px] leading-[1.6] text-circlo-muted">
              Deskripsi material telah diproses menggunakan NLP untuk mengenali jenis dan atribut material. Tinjau hasil
              klasifikasi sebelum menekan Confirm.
            </p>
          </div>
        </section>

        {/* Kartu hasil */}
        <section className="mt-6 grid overflow-hidden rounded-xl border border-circlo-line bg-white shadow-card md:grid-cols-2">
          <div className="relative min-h-[360px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo?.dataUrl} alt={n.nama} className="absolute inset-0 h-full w-full object-cover" />
          </div>

          <div className="flex flex-col px-8 pb-8 pt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[24px] font-semibold leading-tight">{n.nama}</h2>
              <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-circlo-olive px-3.5 py-2 text-[14px] font-bold text-circlo-green">
                <Recycle className="h-4 w-4" />
                {n.skor}/100
              </span>
            </div>

            <div className="mt-4">
              <Row icon={Shapes} label="Jenis Material">{n.jenis}</Row>
              <Row icon={Network} label="Kategori">{n.kategori}</Row>
              <Row icon={ThumbsUp} label="Kondisi">
                <span className="rounded-full border border-circlo-lime bg-circlo-soft px-3 py-1 text-[13px] font-semibold">{n.kondisi}</span>
              </Row>
              <Row icon={Ruler} label="Dimensi (Perk.)">{n.dimensi}</Row>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 pt-7">
              <Link
                href={isEdit ? `/upload-material?id=${editId}` : '/upload-material'}
                className="flex h-[58px] items-center justify-center gap-2 rounded-lg border border-circlo-green/60 bg-white text-[15px] font-medium hover:bg-circlo-bg"
              >
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <button
                type="button"
                onClick={onConfirm}
                disabled={saving}
                aria-busy={saving}
                className="flex h-[58px] items-center justify-center gap-2 rounded-lg bg-circlo-green text-[15px] font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                Confirm
              </button>
            </div>
          </div>
        </section>

        {saveError && (
          <p role="alert" className="mt-5 flex items-center justify-center gap-2 text-[14px] font-medium text-red-700">
            <CircleAlert className="h-4 w-4" /> {saveError}
          </p>
        )}

        <p className="mt-5 text-center text-[13.5px] font-medium text-circlo-ink/85">
          Dengan mengonfirmasi, Anda menyetujui{' '}
          <a href="#" className="font-semibold text-circlo-green underline underline-offset-2">Pedoman Komunitas</a> CIRCLO.
        </p>
      </main>
      <Footer />
    </>
  );
}

export default function ClassificationResultPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <ClassificationResult />
      </RoleGate>
    </>
  );
}
