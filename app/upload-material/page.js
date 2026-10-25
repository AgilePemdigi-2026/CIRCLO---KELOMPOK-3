'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Archive, Banknote, Bot, CircleAlert, CircleCheck, ClipboardCheck, LoaderCircle, MapPin, Sparkles, TriangleAlert,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { getAccessToken } from '@/lib/auth';
import { setFlash } from '@/lib/flash';
import { fileToResizedDataUrl } from '@/lib/image';
import { getMaterial, isDemoStore, updateMaterial } from '@/lib/materials';
import { clearDraft, clearResult, loadDraft, loadResult, saveDraft, saveResult } from '@/lib/storage';

const SAMPLE_PHOTO = '/images/kain-katun-hitam.jpg';
const EMPTY_FORM = { name: '', description: '', quantity: '', condition: '', price: '', location: '', satuan: '' };

const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');

function validate(form, photo) {
  const errors = {};
  if (form.description.trim().length < 5) errors.description = 'Deskripsi wajib diisi (minimal 5 karakter)';
  if (!(Number(form.quantity) > 0)) errors.quantity = 'Jumlah wajib diisi';
  if (!form.condition.trim()) errors.condition = 'Kondisi wajib diisi';
  if (form.price === '' || Number(form.price) < 0) errors.price = 'Harga wajib diisi';
  if (!['kg', 'm2', 'pcs'].includes(form.satuan)) errors.satuan = 'Satuan wajib dipilih';
  if (!form.location.trim()) errors.location = 'Lokasi wajib diisi';
  if (!photo) errors.photo = 'Foto wajib diunggah';
  return errors;
}

const fieldClass = (hasError) =>
  `w-full rounded-lg border bg-circlo-field text-[15px] text-circlo-ink outline-none transition focus:border-circlo-green focus:bg-white ${
    hasError ? 'border-red-500' : 'border-circlo-fieldline'
  }`;

const NOTICE_STYLE = {
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-circlo-lime/60 bg-circlo-soft text-circlo-green',
};

function UploadMaterialForm() {
  const router = useRouter();
  const editId = useSearchParams().get('id'); // ada id = mode Edit material (dari tombol Edit di My Materials)
  const isEdit = Boolean(editId);
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null); // { dataUrl, name, sizeKb, remote? }
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null); // { type: 'error' | 'warning' | 'success', text }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Isi form: (1) kembali dari halaman hasil lewat tombol Edit, (2) mode edit material, (3) draf tersimpan
  useEffect(() => {
    let active = true;
    (async () => {
      const pending = loadResult();
      if (pending && String(pending.editId || '') === String(editId || '')) {
        setForm({ ...EMPTY_FORM, ...pending.form });
        if (pending.photo) setPhoto(pending.photo);
        return;
      }
      if (editId) {
        try {
          const m = await getMaterial(editId);
          if (!active) return;
          setForm({
            ...EMPTY_FORM,
            name: m.nama || '', // TODO: sesuaikan nama field dengan skema tabel materials
            description: m.deskripsi || '',
            quantity: String(m.jumlah ?? ''),
            condition: m.kondisi_seller || '',
            price: String(m.harga ?? ''),
            location: m.lokasi || '',
            satuan: m.satuan || '', // TODO: sesuaikan nama field dengan skema tabel materials
          });
          setPhoto(m.foto_url ? { dataUrl: m.foto_url, name: 'Foto material', remote: true } : null);
        } catch {
          if (active) setNotice({ type: 'error', text: 'Material tidak dapat dimuat.' });
        }
        return;
      }
      const draft = loadDraft();
      if (draft) {
        setForm({ ...EMPTY_FORM, ...draft.form });
        if (draft.photo) setPhoto(draft.photo);
      }
    })();
    return () => {
      active = false;
    };
  }, [editId]);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((er) => ({ ...er, photo: 'File harus berupa gambar' }));
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhoto({ dataUrl, name: file.name, sizeKb: Math.round(file.size / 1024) });
      setErrors((er) => ({ ...er, photo: undefined }));
    } catch (err) {
      setErrors((er) => ({ ...er, photo: err.message }));
    }
  }

  // Mode baru: simpan draf di browser. Mode edit: simpan perubahan material langsung (skenario "update material").
  async function onSave() {
    setNotice(null);
    if (!isEdit) {
      const ok = saveDraft({ form, photo });
      setNotice(ok ? { type: 'success', text: 'Draf tersimpan di browser ini.' } : { type: 'error', text: 'Draf tidak bisa disimpan (penyimpanan browser penuh).' });
      return;
    }
    const found = validate(form, photo);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ type: 'error', text: 'Upload failed. Please check the data' });
      return;
    }
    setSaving(true);
    try {
      await updateMaterial(editId, {
        deskripsi: form.description.trim(),
        jumlah: Number(form.quantity),
        kondisi_seller: form.condition.trim(),
        harga: Number(form.price),
        lokasi: form.location.trim(),
        foto: photo.remote ? undefined : photo.dataUrl,
      });
      clearResult();
      setFlash({
        type: 'ok',
        text: 'Material updated successfully',
        note: isDemoStore ? 'Mode demo: tersimpan di browser ini saja, belum ke database.' : undefined,
      });
      router.push('/my-materials');
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Perubahan gagal disimpan. Coba lagi.' });
      setSaving(false);
    }
  }

  async function onGenerateDescription() {
    const name = form.name.trim();
    const description = form.description.trim();
    if (!name && !description) {
      setAiError('Isi dulu nama produk atau deskripsi singkat.');
      return;
    }
    setAiError('');
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat deskripsi.');
      setForm((f) => ({ ...f, description: data.description }));
      setErrors((er) => ({ ...er, description: undefined }));
    } catch (err) {
      setAiError(err.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setAiLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setNotice(null);
    const found = validate(form, photo);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ type: 'error', text: 'Upload failed. Please check the data' });
      return;
    }
    setLoading(true);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/classify-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          description: form.description,
          quantity: form.quantity,
          price: form.price,
          location: form.location,
          condition: form.condition,
          image: isDataUrl(photo.dataUrl) ? photo.dataUrl : null, // foto lama (URL) tidak dikirim ulang ke AI
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNotice({ type: 'error', text: data.error || 'Klasifikasi gagal. Coba lagi.' });
        setLoading(false);
        return;
      }
      if (!data.dapat_diklasifikasi) {
        // REQ-104: minta Seller melengkapi deskripsi
        setNotice({ type: 'warning', text: data.pesan || 'Deskripsi belum cukup jelas. Lengkapi jenis, kondisi, dan detail material.' });
        setLoading(false);
        return;
      }
      if (!isEdit) saveDraft({ form, photo });
      saveResult({ form, photo, result: data, editId: editId || null });
      router.push('/upload-material/result');
    } catch {
      setNotice({ type: 'error', text: 'Koneksi bermasalah. Periksa jaringan Anda lalu coba lagi.' });
      setLoading(false);
    }
  }

  const Alert = notice?.type === 'success' ? CircleCheck : notice?.type === 'warning' ? TriangleAlert : CircleAlert;

  return (
    <>
      <main className="w-full px-10 pt-12">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Kartu form */}
          <form onSubmit={onSubmit} noValidate className="rounded-2xl bg-white p-8 shadow-card">
            <h1 className="font-display text-[32px] font-semibold leading-tight text-circlo-ink">{isEdit ? 'Edit Material' : 'Upload Material'}</h1>
            <p className="mt-3 text-[16px] leading-[1.6] text-circlo-muted">
              {isEdit
                ? 'Perbarui informasi material Anda. Tekan Save untuk menyimpan perubahan, atau Submit untuk meminta AI mengklasifikasi ulang.'
                : 'Bagikan sisa material Anda. Deskripsikan material, masukkan foto, dan lengkapi detailnya agar AI dapat membantu klasifikasi material dengan lebih akurat.'}
            </p>

            {notice && (
              <div role={notice.type === 'success' ? 'status' : 'alert'} className={`mt-6 flex items-start gap-2 rounded-lg border px-4 py-3 text-[14px] font-medium ${NOTICE_STYLE[notice.type]}`}>
                <Alert className="mt-0.5 h-4 w-4 shrink-0" />
                {notice.text}
              </div>
            )}

            {/* Foto */}
            <div className="mt-5">
              <label htmlFor="photo" className="text-[14px] font-medium">Photo</label>
              <div className={`mt-3 rounded-xl border bg-white p-3 ${errors.photo ? 'border-red-500' : 'border-circlo-line'}`}>
                <div className="relative h-[96px] w-full overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo ? photo.dataUrl : SAMPLE_PHOTO} alt="Pratinjau foto material" className="h-full w-full object-cover" />
                </div>
                <p className="mt-4 text-[14px] font-semibold">{photo ? photo.name : 'Foto material contoh'}</p>
                <p className="mt-1 text-[14px] text-circlo-muted">
                  {photo ? `${photo.sizeKb ? `${photo.sizeKb} KB — ` : ''}pratinjau material yang diunggah.` : 'Foto kain katun hitam — pratinjau material yang diunggah.'}
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 rounded-lg bg-circlo-green px-6 py-2.5 text-[14px] font-medium text-white transition hover:brightness-110"
                >
                  Ganti Foto
                </button>
                <input ref={fileRef} type="file" id="photo" name="photo" accept="image/*" onChange={onPickPhoto} className="sr-only" tabIndex={-1} />
              </div>
              {errors.photo && <p className="mt-1.5 text-[13px] text-red-600">{errors.photo}</p>}
            </div>

            {/* Nama Produk */}
            <div className="mt-8">
              <label htmlFor="name" className="block text-[14px] font-medium">Nama Produk / Material</label>
              <p className="mt-0.5 text-[12px] text-circlo-ink/80">
                Sebutkan nama singkat material, misalnya &quot;Perca kain katun hitam&quot; atau &quot;Palet kayu bekas&quot;.
              </p>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={setField('name')}
                placeholder="Perca kain katun hitam"
                className={`${fieldClass()} mt-2 h-[46px] px-4`}
              />
            </div>

            {/* Deskripsi */}
            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="description" className="block text-[14px] font-medium">Description</label>
                <button
                  type="button"
                  onClick={onGenerateDescription}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-circlo-green/50 px-3 py-1.5 text-[12px] font-medium text-circlo-green transition hover:bg-circlo-soft disabled:opacity-60"
                >
                  {aiLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiLoading ? 'Menyusun...' : 'Bantu dengan AI'}
                </button>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-circlo-ink/80">
                <Sparkles className="h-3.5 w-3.5 text-circlo-green" />
                Tuliskan deskripsi singkat material Anda, seperti jenis, kondisi, dan detail lainnya.
              </p>
              {aiError && <p className="mt-1 text-[13px] text-red-600">{aiError}</p>}
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={setField('description')}
                placeholder="Sisa kain katun hitam"
                rows={4}
                className={`${fieldClass(errors.description)} mt-2 h-[100px] resize-none px-4 py-3`}
              />
              {errors.description && <p className="mt-1 text-[13px] text-red-600">{errors.description}</p>}
            </div>

            {/* Quantity + Price */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="quantity" className="block text-[14px] font-medium">Quantity</label>
                <div className="relative mt-2">
                  <Archive className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-circlo-muted" />
                  <input id="quantity" name="quantity" type="number" min="0" value={form.quantity} onChange={setField('quantity')} placeholder="250" className={`${fieldClass(errors.quantity)} h-[46px] pl-11 pr-4`} />
                </div>
                {errors.quantity && <p className="mt-1 text-[13px] text-red-600">{errors.quantity}</p>}
              </div>
              <div>
                <label htmlFor="price" className="block text-[14px] font-medium">Price</label>
                <div className="relative mt-2">
                  <Banknote className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-circlo-muted" />
                  <input id="price" name="price" type="number" min="0" value={form.price} onChange={setField('price')} placeholder="3000" className={`${fieldClass(errors.price)} h-[46px] pl-11 pr-4`} />
                </div>
                {errors.price && <p className="mt-1 text-[13px] text-red-600">{errors.price}</p>}
              </div>
            </div>

            {/* Condition (ada di skenario SRS 4.6, tidak ada di mockup) */}
            <div className="mt-6">
              <label htmlFor="condition" className="block text-[14px] font-medium">Condition</label>
              <div className="relative mt-2">
                <ClipboardCheck className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-circlo-muted" />
                <input id="condition" name="condition" type="text" value={form.condition} onChange={setField('condition')} placeholder="Bersih dan kering" className={`${fieldClass(errors.condition)} h-[46px] pl-11 pr-4`} />
              </div>
              {errors.condition && <p className="mt-1 text-[13px] text-red-600">{errors.condition}</p>}
            </div>

            {/* Satuan */}
            <div className="mt-6">
              <label htmlFor="satuan" className="block text-[14px] font-medium">Satuan</label>
              <p className="mt-0.5 text-[12px] text-circlo-ink/80">
                Pilih satuan jumlah material. Nilai ini dipakai AI untuk mencocokkan bahan dengan resep usaha.
              </p>
              <select
                id="satuan"
                name="satuan"
                value={form.satuan}
                onChange={setField('satuan')}
                className={`${fieldClass(errors.satuan)} mt-2 h-[46px] px-4`}
              >
                <option value="" disabled>Pilih satuan</option>
                <option value="kg">kg — Kilogram</option>
                <option value="m2">m² — Meter persegi</option>
                <option value="pcs">pcs — Buah / Potong</option>
              </select>
              {errors.satuan && <p className="mt-1 text-[13px] text-red-600">{errors.satuan}</p>}
            </div>

            {/* Lokasi */}
            <div className="mt-6">
              <label htmlFor="location" className="block text-[14px] font-medium">Location</label>
              <div className="relative mt-2">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-circlo-muted" />
                <input id="location" name="location" type="text" value={form.location} onChange={setField('location')} placeholder="Surabaya" className={`${fieldClass(errors.location)} h-[46px] pl-11 pr-4`} />
              </div>
              {errors.location && <p className="mt-1 text-[13px] text-red-600">{errors.location}</p>}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-circlo-line pt-6">
              <button type="button" onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-circlo-ink/80 hover:text-circlo-green disabled:opacity-60">
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Save
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white transition hover:brightness-110 disabled:opacity-70"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Menganalisis...' : 'Submit'}
              </button>
            </div>
          </form>

          {/* Kolom kanan */}
          <aside className="space-y-5">
            <div className="relative overflow-hidden rounded-xl border border-circlo-line bg-gradient-to-br from-[#E6F3FB] to-white px-6 pb-5 pt-6 shadow-card">
              <svg aria-hidden className="absolute -right-6 -top-6 h-24 w-24 text-circlo-lime/15" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="9">
                <path d="M85 30 A38 38 0 1 0 60 88" strokeLinecap="round" />
              </svg>
              <div className="relative flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-circlo-olive">
                  <Bot className="h-6 w-6 text-circlo-green" />
                </span>
                <h2 className="text-[18px] font-semibold">AI Material Classification</h2>
              </div>
              <p className="relative mt-5 text-[16px] leading-[1.6] text-circlo-muted">
                AI Material Classification memproses deskripsi material menggunakan NLP untuk mengenali jenis dan atribut material.
              </p>
              <ul className="relative mt-3.5 space-y-2 text-[14.5px] font-medium text-circlo-ink/90">
                {['Mengidentifikasi komposisi material', 'Menyarankan tag standar', 'Menampilkan hasil klasifikasi material'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <CircleCheck className="h-4 w-4 text-circlo-green" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative aspect-[334/250] w-full overflow-hidden rounded-2xl">
              <Image src="/images/palet-kayu-lebar.jpg" alt="Tumpukan palet kayu di gudang" fill sizes="(min-width:1024px) 400px, 100vw" className="object-cover" />
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function UploadMaterialPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        {/* useSearchParams membutuhkan Suspense pada App Router */}
        <Suspense fallback={null}>
          <UploadMaterialForm />
        </Suspense>
      </RoleGate>
    </>
  );
}
