'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Archive, Banknote, Bot, CircleAlert, CircleCheck, LoaderCircle, MapPin, Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { fileToResizedDataUrl } from '@/lib/image';
import { loadDraft, saveDraft, saveResult } from '@/lib/storage';

const SAMPLE_PHOTO = '/images/kain-katun-hitam.jpg';
const EMPTY_FORM = { description: '', quantity: '', price: '', location: '' };

function validate(form, photo) {
  const errors = {};
  if (form.description.trim().length < 3) errors.description = 'Deskripsi wajib diisi';
  if (!(Number(form.quantity) > 0)) errors.quantity = 'Jumlah wajib diisi';
  if (form.price === '' || Number(form.price) < 0) errors.price = 'Harga wajib diisi';
  if (!form.location.trim()) errors.location = 'Lokasi wajib diisi';
  if (!photo) errors.photo = 'Foto wajib diunggah';
  return errors;
}

const fieldClass = (hasError) =>
  `w-full rounded-lg border bg-circlo-field text-[15px] text-circlo-ink outline-none transition focus:border-circlo-green focus:bg-white ${
    hasError ? 'border-red-500' : 'border-circlo-fieldline'
  }`;

function UploadMaterialForm() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null); // { dataUrl, name, sizeKb }
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // Isi ulang form kalau Seller kembali dari halaman hasil (tombol Edit) atau punya draf
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm({ ...EMPTY_FORM, ...draft.form });
      if (draft.photo) setPhoto(draft.photo);
    }
  }, []);

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

  function onSave() {
    const ok = saveDraft({ form, photo });
    setNotice(ok ? 'Draf tersimpan di browser ini.' : 'Draf tidak bisa disimpan (penyimpanan browser penuh).');
    setTimeout(() => setNotice(''), 2500);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const found = validate(form, photo);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Upload failed. Please check the data');
      return;
    }
    setFormError('');
    setLoading(true);

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image: photo.dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Klasifikasi gagal');

      saveDraft({ form, photo });
      saveResult({ form, photo, result: data });
      router.push('/upload-material/result');
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan, coba lagi.');
      setLoading(false);
    }
  }

  return (
    <>
      <main className="w-full px-10 pt-12">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Kartu form */}
          <form onSubmit={onSubmit} noValidate className="rounded-2xl bg-white p-8 shadow-card">
            <h1 className="font-display text-[32px] font-semibold leading-tight text-circlo-ink">Upload Material</h1>
            <p className="mt-3 text-[16px] leading-[1.6] text-circlo-muted">
              Bagikan sisa material Anda. Deskripsikan material, masukkan foto, dan lengkapi detailnya agar AI dapat
              membantu klasifikasi material dengan lebih akurat.
            </p>

            {formError && (
              <div role="alert" className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Foto */}
            <div className="mt-5">
              <label className="text-[14px] font-medium">Photo</label>
              <div className={`mt-3 rounded-xl border bg-white p-3 ${errors.photo ? 'border-red-500' : 'border-circlo-line'}`}>
                <div className="relative h-[96px] w-full overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo ? photo.dataUrl : SAMPLE_PHOTO} alt="Pratinjau foto material" className="h-full w-full object-cover" />
                </div>
                <p className="mt-4 text-[14px] font-semibold">{photo ? photo.name : 'Foto material contoh'}</p>
                <p className="mt-1 text-[14px] text-circlo-muted">
                  {photo ? `${photo.sizeKb} KB — pratinjau material yang diunggah.` : 'Foto kain katun hitam — pratinjau material yang diunggah.'}
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 rounded-lg bg-circlo-green px-6 py-2.5 text-[14px] font-medium text-white transition hover:brightness-110"
                >
                  Ganti Foto
                </button>
                <input ref={fileRef} type="file" name="photo" accept="image/*" onChange={onPickPhoto} className="hidden" />
              </div>
              {errors.photo && <p className="mt-1.5 text-[13px] text-red-600">{errors.photo}</p>}
            </div>

            {/* Deskripsi */}
            <div className="mt-8">
              <label htmlFor="description" className="block text-[14px] font-medium">Description</label>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-circlo-ink/80">
                <Sparkles className="h-3.5 w-3.5 text-circlo-green" />
                Tuliskan deskripsi singkat material Anda, seperti jenis, kondisi, dan detail lainnya.
              </p>
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
              <button type="button" onClick={onSave} className="px-4 py-2 text-[14px] font-medium text-circlo-ink/80 hover:text-circlo-green">
                Save
              </button>
              {notice && <span className="text-[13px] text-circlo-green">{notice}</span>}
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
        <UploadMaterialForm />
      </RoleGate>
    </>
  );
}
