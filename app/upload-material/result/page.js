'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BrainCircuit, CircleAlert, CircleCheck, LoaderCircle, Network, Pencil, Recycle, Ruler, Shapes, ThumbsUp,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { clearDraft, clearResult, loadResult } from '@/lib/storage';
import { saveMaterial } from '@/lib/materials';

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
  const [done, setDone] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setData(loadResult());
    setReady(true);
  }, []);

  async function onConfirm() {
    setSaving(true);
    setSaveError('');
    const r = data.result;
    try {
      const res = await saveMaterial({
        nama: r.nama,
        kategori: r.jenisMaterial,
        satuan: data.form.satuan,
        deskripsi: data.form.description,
        jumlah: Number(data.form.quantity),
        harga: Number(data.form.price),
        lokasi: data.form.location,
      });
      setPersisted(res.persisted);
      clearDraft();
      clearResult();
      setDone(true);
      setTimeout(() => router.push('/marketplace'), res.persisted ? 1400 : 2600);
    } catch (err) {
      setSaveError(err.message || 'Material gagal disimpan, coba lagi.');
      setSaving(false);
    }
  }

  if (!ready) return null;

  // Tidak ada data klasifikasi (halaman dibuka langsung)
  if (!data) {
    return (
      <>
        <main className="mx-auto max-w-[768px] px-8 pt-20 text-center">
          <p className="text-[16px] text-circlo-muted">Belum ada hasil klasifikasi. Silakan upload material terlebih dahulu.</p>
          <Link href="/upload-material" className="mt-6 inline-block rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white">
            Ke halaman Upload Material
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const { result, photo } = data;

  return (
    <>
      <main className="mx-auto max-w-[800px] px-4 pt-12">
        {/* Banner penjelasan */}
        <section className="flex items-start gap-4 rounded-xl border border-[#D6EAD3] bg-gradient-to-r from-[#E6F3FB] to-white px-6 py-5 shadow-card">
          <span className="mt-0.5 flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-circlo-lime">
            <BrainCircuit className="h-6 w-6 text-circlo-green" />
          </span>
          <div>
            <h1 className="font-display text-[24px] font-bold text-circlo-green">AI Material Classification</h1>
            <p className="mt-1.5 text-[16px] leading-[1.6] text-circlo-muted">
              Deskripsi material telah diproses menggunakan NLP untuk mengenali jenis dan atribut material. Tinjau hasil
              klasifikasi sebelum menekan Confirm.
            </p>
          </div>
        </section>

        {/* Pesan kalau AI belum bisa mengklasifikasikan */}
        {!result.dapatDiklasifikasikan && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-[14px] text-amber-900">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Deskripsi material belum dapat diklasifikasikan dengan yakin. Tekan Edit untuk melengkapi deskripsi
              (jenis bahan, kondisi, ukuran), lalu Submit ulang.
            </span>
          </div>
        )}

        {/* Kartu hasil */}
        <section className="mt-6 grid overflow-hidden rounded-xl border border-circlo-line bg-white shadow-card md:grid-cols-2">
          <div className="relative min-h-[360px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo?.dataUrl} alt={result.nama} className="absolute inset-0 h-full w-full object-cover" />
          </div>

          <div className="flex flex-col px-8 pb-8 pt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[24px] font-semibold leading-tight">{result.nama}</h2>
              <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-circlo-olive px-3.5 py-2 text-[14px] font-bold text-circlo-green">
                <Recycle className="h-4 w-4" />
                {result.skor}/100
              </span>
            </div>

            <div className="mt-4">
              <Row icon={Shapes} label="Jenis Material">{result.jenisMaterial}</Row>
              <Row icon={Network} label="Kategori">{result.kategori}</Row>
              <Row icon={ThumbsUp} label="Kondisi">
                <span className="rounded-full border border-circlo-lime bg-circlo-soft px-3 py-1 text-[13px] font-semibold">{result.kondisi}</span>
              </Row>
              <Row icon={Ruler} label="Dimensi (Perk.)">{result.dimensi}</Row>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 pt-7">
              <Link href="/upload-material" className="flex h-[58px] items-center justify-center gap-2 rounded-lg border border-circlo-green/60 bg-white text-[15px] font-medium hover:bg-circlo-bg">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <button
                onClick={onConfirm}
                disabled={saving || !result.dapatDiklasifikasikan}
                className="flex h-[58px] items-center justify-center gap-2 rounded-lg bg-circlo-green text-[15px] font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {saving && !done ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
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

        {done ? (
          <div className="mt-5 text-center">
            <p className="text-[14px] font-semibold text-circlo-green">Material uploaded successfully</p>
            {!persisted && (
              <p className="mt-1 text-[12px] text-circlo-muted">Mode demo: Supabase belum dikonfigurasi, data belum tersimpan ke database.</p>
            )}
          </div>
        ) : (
          <p className="mt-5 text-center text-[13.5px] font-medium text-circlo-ink/85">
            Dengan mengonfirmasi, Anda menyetujui{' '}
            <a href="#" className="font-semibold text-circlo-green underline underline-offset-2">Pedoman Komunitas</a> CIRCLO.
          </p>
        )}

        {result.source === 'fallback' && (
          <p className="mt-3 text-center text-[12px] text-circlo-muted">
            Mode demo: hasil ini dari aturan kata kunci lokal karena Gemini belum tersambung.
          </p>
        )}
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
