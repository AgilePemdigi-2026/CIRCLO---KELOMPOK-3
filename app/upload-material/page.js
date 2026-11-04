'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Archive, Banknote, Bot, CircleAlert, CircleCheck, ClipboardCheck, ImagePlus, LoaderCircle, MapPin, Sparkles, TriangleAlert,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { getAccessToken } from '@/lib/auth';
import { setFlash } from '@/lib/flash';
import { fileToResizedDataUrl } from '@/lib/image';
import {getMaterial,isDemoStore, updateMaterial, saveMaterial} from '@/lib/materials';
import { clearDraft, clearResult, loadDraft, loadResult, saveDraft, saveResult } from '@/lib/storage';

const EMPTY_FORM = { name: '', description: '', quantity: '', condition: '', price: '', location: '', satuan: 'kg' };
const SATUAN_VALID = ['kg', 'm2', 'pcs'];
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
const newUploadToken = () =>
  globalThis.crypto?.randomUUID?.() || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function validate(form, photo) {
  const errors = {};
  const quantity = Number(form.quantity);
  const price = Number(form.price);
  if (!form.name.trim()) {
  errors.name = 'Nama material wajib diisi';
}
  if (form.description.trim().length < 5) errors.description = 'Deskripsi wajib diisi (minimal 5 karakter)';
  if (!Number.isInteger(quantity) || quantity <= 0) errors.quantity = 'Jumlah wajib berupa angka bulat lebih dari 0';
  if (!form.condition.trim()) errors.condition = 'Kondisi wajib diisi';
  if (form.price.trim() === '' || !Number.isFinite(price) || price < 0) errors.price = 'Harga wajib berupa angka 0 atau lebih';
  if (form.satuan && !SATUAN_VALID.includes(form.satuan)) errors.satuan = 'Satuan tidak valid';
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

const CONFIDENCE_LABEL = {
  tinggi: 'Keyakinan AI: tinggi',
  sedang: 'Keyakinan AI: sedang',
  rendah: 'Keyakinan AI: rendah, periksa dengan teliti',
};

function AiSection({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-circlo-ink">{title}</p>
      {children}
    </div>
  );
}

function BulletList({ items, empty }) {
  if (!items?.length) return <p className="text-[13px] text-circlo-muted">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-circlo-ink/90">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

// Kartu hasil analisis AI (ditampilkan di bawah kolom Description)
function AiResultCard({ result }) {
  const lowConfidence = result.confidence === 'rendah';
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-circlo-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-semibold text-circlo-ink">Hasil Analisis AI</h3>
          <p className="mt-0.5 text-[13px] text-circlo-muted">Periksa kembali informasi ini sebelum menyimpan produk.</p>
        </div>
        {result.confidence && (
          <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${lowConfidence ? 'bg-amber-50 text-amber-900' : 'bg-circlo-soft text-circlo-green'}`}>
            {CONFIDENCE_LABEL[result.confidence] || result.confidence}
          </span>
        )}
      </div>

      <AiSection title="Kategori">
        <p className="text-[14px] font-medium text-circlo-ink">{result.category || 'Belum diketahui'}</p>
        {result.subcategory && <p className="text-[13px] text-circlo-muted">Subkategori: {result.subcategory}</p>}
        {result.composition && <p className="mt-1 text-[13px] text-circlo-ink/90">Komposisi: {result.composition}</p>}
      </AiSection>

      <AiSection title="Spesifikasi Material">
        {result.specifications?.length ? (
          <div className="space-y-1.5">
            {result.specifications.map((s, i) => (
              <div key={`${s.label}-${i}`} className="flex justify-between gap-4 border-b border-circlo-line pb-1.5 text-[13.5px]">
                <span className="text-circlo-muted">{s.label}</span>
                <span className="text-right text-circlo-ink">{s.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-circlo-muted">Belum ada spesifikasi.</p>
        )}
      </AiSection>

      <AiSection title="Potensi Pemanfaatan">
        <BulletList items={result.potential_uses} empty="Belum tersedia rekomendasi pemanfaatan." />
      </AiSection>

      <AiSection title="Catatan untuk Buyer">
        <BulletList items={result.buyer_notes} empty="Tidak ada catatan tambahan." />
      </AiSection>

      {result.perlu_konfirmasi?.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-1 text-[13px] font-semibold text-amber-900">Mohon dikonfirmasi oleh Seller</p>
          <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-amber-900">
            {result.perlu_konfirmasi.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      <AiSection title="Tag Material">
        <div className="flex flex-wrap gap-2">
          {result.tags?.length ? (
            result.tags.map((tag, i) => (
              <span key={`${tag}-${i}`} className="rounded-full bg-circlo-soft px-3 py-1 text-[12.5px] text-circlo-green">
                #{String(tag).replace(/^#/, '')}
              </span>
            ))
          ) : (
            <p className="text-[13px] text-circlo-muted">Belum ada tag.</p>
          )}
        </div>
      </AiSection>

      <p className="text-[12px] text-circlo-muted">
        Hasil AI merupakan rekomendasi awal berdasarkan foto dan isian Anda, bukan verifikasi fisik material.
        Pastikan seluruh informasi sesuai dengan kondisi material yang sebenarnya.
      </p>
    </div>
  );
}

function UploadMaterialForm() {
  const router = useRouter();
  const editId = useSearchParams().get('id'); // ada id = mode Edit material (dari tombol Edit di My Materials)
  const isEdit = Boolean(editId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null); // { dataUrl, name, sizeKb, remote? }
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null); // { type: 'error' | 'warning' | 'success', text }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
            name: m.nama || m.nama_material || '',
            description: m.deskripsi || m.deskripsi_material || '',
            quantity: String(m.jumlah ?? m.stok ?? ''),
            condition: m.kondisi_seller || m.kondisi || '',
            price: String(m.harga ?? ''),
            location: m.lokasi || '',
            satuan: m.satuan || 'kg',
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
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhoto(null);
      e.target.value = '';
      setErrors((er) => ({ ...er, photo: 'Foto harus berformat JPG, PNG, atau WebP' }));
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhoto({ dataUrl, name: file.name, sizeKb: Math.round(file.size / 1024) });
      setErrors((er) => ({ ...er, photo: undefined }));
      setAiResult(null); // hasil AI sebelumnya sudah tidak sesuai dengan foto baru
      setAiError('');
    } catch (err) {
      e.target.value = '';
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

  // "Bantu dengan AI": kirim FOTO + isian ke server, isi deskripsi (dan nama/kondisi bila masih kosong)
  async function onGenerateDescription() {
    setAiError('');

    if (!photo) {
      setAiError('Unggah foto material dulu supaya analisis dapat dilakukan.');
      return;
    }

    if (!isDataUrl(photo.dataUrl)) {
      setAiError('Unggah ulang foto material terlebih dahulu.');
      return;
    }

    if (!form.name.trim() && form.description.trim().length < 3) {
      setAiError('Isi nama material atau deskripsi singkat dulu.');
      return;
    }

    setIsGenerating(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = await getAccessToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/classify-material', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          image: photo.dataUrl,
          name: form.name,
          description: form.description,
          condition: form.condition,
          quantity: form.quantity,
          price: form.price,
          satuan: form.satuan,
          location: form.location,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'AI gagal menganalisis material.');

      setAiResult(data);
      const nextForm = {
        ...form,
        name: form.name.trim() ? form.name : data.name || form.name,
        description: data.description || form.description,
        condition: form.condition.trim() ? form.condition : data.condition || form.condition,
        satuan: form.satuan || data.satuan_saran || form.satuan,
      };
      setForm(nextForm);
      saveResult({ form: nextForm, photo, result: data, editId: editId || null, uploadToken: newUploadToken() });
    } catch (error) {
      setAiError(error.message || 'Gagal membuat deskripsi dengan AI.');
    } finally {
      setIsGenerating(false);
    }
  }


  async function onSubmit(e) {
  e.preventDefault();
  setNotice(null);

  const found = validate(form, photo);

  if (!form.name.trim()) {
    found.name = 'Nama material wajib diisi';
  }

  setErrors(found);

  if (Object.keys(found).length > 0) {
    setNotice({
      type: 'error',
      text: 'Periksa kembali data material yang wajib diisi.',
    });
    return;
  }

  if (isEdit) {
    setNotice({
      type: 'error',
      text: 'Fitur edit material production belum tersedia.',
    });
    return;
  }

  setLoading(true);

  try {
    const saved = await saveMaterial({
      nama: form.name.trim(),
      jenis_material: aiResult?.category || 'Belum diklasifikasikan',
      kategori: aiResult?.category || 'Belum diklasifikasikan',
      kategori_ai: aiResult?.category || null,
      deskripsi: form.description.trim(),
      jumlah: Number(form.quantity),
      harga: Number(form.price),
      satuan: form.satuan || 'kg',
      lokasi: form.location.trim(),
      kondisi_seller: form.condition.trim(),
      foto: photo.dataUrl,
      upload_token: newUploadToken(),
    });

    if (!saved?.ok || !saved?.id) {
      throw new Error('Material gagal disimpan.');
    }

    clearDraft();
    clearResult();

    setFlash({
      type: 'ok',
      text: 'Material berhasil diterbitkan!',
      note: saved.persisted
        ? 'Material berhasil tersimpan di database.'
        : 'Material tersimpan dalam mode demo.',
    });

    router.push('/my-materials');
  } catch (error) {
    console.error('UPLOAD MATERIAL ERROR:', error);

    setNotice({
      type: 'error',
      text: error.message || 'Gagal menyimpan material.',
    });
  } finally {
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
              <label htmlFor="photo" className="block text-[14px] font-medium">Photo</label>
              <div className={`mt-3 rounded-xl border bg-white p-3 ${errors.photo ? 'border-red-500' : 'border-circlo-line'}`}>
                {photo ? (
                  <>
                    <div className="relative h-[96px] w-full overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.dataUrl} alt="Pratinjau foto material" className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-4 text-[14px] font-semibold">{photo.name}</p>
                    <p className="mt-1 text-[14px] text-circlo-muted">
                      {photo.sizeKb ? `${photo.sizeKb} KB — ` : ''}pratinjau material yang diunggah.
                    </p>
                  </>
                ) : (
                  <div className="flex h-[96px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-circlo-fieldline bg-circlo-field text-circlo-muted">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[13px] font-medium">Belum ada foto dipilih</span>
                  </div>
                )}
                <input
                  id="photo"
                  name="photo"
                  type="file"
                  accept={PHOTO_TYPES.join(',')}
                  onChange={onPickPhoto}
                  aria-describedby="photo-help"
                  className="mt-3 block w-full cursor-pointer rounded-lg border border-circlo-fieldline bg-circlo-field text-[13px] text-circlo-ink file:mr-3 file:border-0 file:bg-circlo-green file:px-4 file:py-2.5 file:text-[13px] file:font-medium file:text-white hover:file:brightness-110"
                />
                <p id="photo-help" className="mt-2 text-[12.5px] text-circlo-muted">Format JPG, PNG, atau WebP. Foto wajib diunggah.</p>
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
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg border border-circlo-green/50 px-3 py-1.5 text-[12px] font-medium text-circlo-green transition hover:bg-circlo-soft disabled:opacity-60"
                >
                  {isGenerating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isGenerating ? 'Menganalisis foto...' : 'Bantu dengan AI'}
                </button>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-circlo-ink/80">
                <Sparkles className="h-3.5 w-3.5 text-circlo-green" />
                Tuliskan deskripsi singkat material Anda, seperti jenis, kondisi, dan detail lainnya.
              </p>
              {aiError && (
                <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {aiError}
                </p>
              )}
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={setField('description')}
                placeholder="Sisa kain katun hitam"
                rows={4}
                maxLength={2000}
                className={`${fieldClass(errors.description)} mt-2 h-[100px] resize-none px-4 py-3`}
              />
              {errors.description && <p className="mt-1 text-[13px] text-red-600">{errors.description}</p>}

              {aiResult && <AiResultCard result={aiResult} />}
            </div>

            {/* Quantity + Price */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="quantity" className="block text-[14px] font-medium">Quantity</label>
                <div className="relative mt-2">
                  <Archive className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-circlo-muted" />
                  <input id="quantity" name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={setField('quantity')} placeholder="250" className={`${fieldClass(errors.quantity)} h-[46px] pl-11 pr-4`} />
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

            <div className="mt-8 flex justify-end border-t border-circlo-line pt-6">
  <button
    type="submit"
    disabled={loading || saving}
    className="flex items-center gap-2 rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white transition hover:brightness-110 disabled:opacity-70"
  >
    {loading || saving ? (
      <LoaderCircle className="h-4 w-4 animate-spin" />
    ) : (
      <Sparkles className="h-4 w-4" />
    )}
    {loading || saving ? 'Menerbitkan material...' : 'Submit'}
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