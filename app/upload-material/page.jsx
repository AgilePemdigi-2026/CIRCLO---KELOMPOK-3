"use client";

// app/upload-material/page.jsx
// Halaman Upload Material (Gambar 1.7) dan AI Classification Result (Gambar 1.8)
// pada SRS CIRCLO. Stack: Next.js (App Router), Tailwind CSS, lucide-react.

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Inter, Montserrat } from "next/font/google";
import {
  Archive,
  Banknote,
  BrainCircuit,
  Bot,
  CheckCircle2,
  Loader2,
  MapPin,
  Network,
  Pencil,
  Recycle,
  Ruler,
  Shapes,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  UploadCloud,
  UserCircle2,
} from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
});

const HEADING = "font-[family-name:var(--font-montserrat)]";
const DRAFT_KEY = "circlo:upload-material-draft";

const EMPTY_FORM = { description: "", quantity: "", price: "", location: "" };

const NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "My Materials", href: "/my-materials" },
  { label: "Upload Material", href: "/upload-material" },
  { label: "Pesanan", href: "/orders" },
  { label: "Chat", href: "/chat" },
];

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

// Perkecil foto sebelum dikirim agar request ke API tetap ringan.
async function compressImage(file, maxSize = 1280, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

// Ganti isi fungsi ini dengan penyimpanan ke Supabase.
// Foto sebaiknya diunggah ke Supabase Storage, bukan disimpan sebagai base64.
async function saveMaterial(/* { form, photo, result } */) {
  // const { error } = await supabase.from("materials").insert({ ... });
  // if (error) throw error;
  await new Promise((resolve) => setTimeout(resolve, 600));
}

// Mode Edit (/upload-material?id=...): ambil data material milik Seller.
// Ganti dengan query Supabase. Kembalikan { form, photo } atau lempar error.
async function fetchMaterial(/* id */) {
  // const { data, error } = await supabase.from("materials").select("*").eq("id", id).single();
  // if (error) throw error;
  // return {
  //   form: { description: data.description, quantity: String(data.quantity), price: String(data.price), location: data.location },
  //   photo: { dataUrl: data.photo_url, name: data.photo_name },
  // };
  throw new Error("fetchMaterial belum disambungkan ke Supabase.");
}

// Mode Edit: simpan perubahan material yang sudah ada.
async function updateMaterial(/* id, { form, photo, result } */) {
  // const { error } = await supabase.from("materials").update({ ... }).eq("id", id);
  // if (error) throw error;
  await new Promise((resolve) => setTimeout(resolve, 600));
}

/* ------------------------------------------------------------------ */
/* Komponen kecil                                                      */
/* ------------------------------------------------------------------ */

function Navbar() {
  return (
    <header className="border-b border-[#dcebf3] bg-[#f4faff]">
      <div className="mx-auto flex h-[70px] max-w-[1200px] items-stretch justify-between px-6 md:px-10">
        <div className="flex items-stretch gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-circlo.png" alt="" className="h-10 w-auto" />
            <span className={`${HEADING} text-[22px] font-bold tracking-wide text-[#3e6a00]`}>
              CIRCLO
            </span>
          </Link>
          <nav className="hidden items-stretch gap-1 md:flex">
            {NAV_LINKS.map((item) => {
              const active = item.href === "/upload-material";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center border-b-2 px-4 text-[15px] ${
                    active
                      ? "border-[#3e6a00] font-semibold text-[#3e6a00]"
                      : "border-transparent text-[#2b3a40] hover:text-[#3e6a00]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Link href="/profile" className="flex items-center gap-2 text-[15px] text-[#2b3a40]">
          <UserCircle2 className="h-6 w-6 text-[#3e6a00]" strokeWidth={1.75} />
          Profil
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  const links = ["Tentang Sirkularitas", "Kebijakan Privasi", "Laporan Keberlanjutan", "Pedoman Komunitas"];
  return (
    <footer className="mt-16 border-t border-[#dcebf3]">
      <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-10">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-circlo.png" alt="" className="h-7 w-auto" />
            <span className={`${HEADING} text-sm font-bold text-[#3e6a00]`}>CIRCLO</span>
          </div>
          <p className="text-[13px] font-medium text-[#2b3a40]">
            © 2026 CIRCLO. Memberdayakan pengelolaan komunitas melalui kecerdasan sirkular.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[13px] font-medium text-[#2b3a40]">
          {links.map((l) => (
            <a key={l} href="#" className="hover:text-[#3e6a00]">
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-[#111d23]">
      {children}
    </label>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[13px] text-[#b3261e]">{children}</p>;
}

const inputBase =
  "w-full rounded-lg border border-[#d3d9dc] bg-[#f1f3f4] text-[15px] text-[#111d23] placeholder:text-[#7c868b] outline-none transition focus:border-[#3e6a00] focus:ring-2 focus:ring-[#3e6a00]/25";

function IconInput({ id, icon: Icon, error, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6b767b]" strokeWidth={1.75} />
      <input id={id} className={`${inputBase} h-11 pl-11 pr-3 ${error ? "border-[#b3261e]" : ""}`} {...props} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman utama                                                       */
/* ------------------------------------------------------------------ */

export default function Page() {
  // useSearchParams membutuhkan Suspense pada Next.js App Router
  return (
    <Suspense fallback={null}>
      <UploadMaterialPage />
    </Suspense>
  );
}

function UploadMaterialPage() {
  const router = useRouter();
  const editId = useSearchParams().get("id"); // ada id = mode Edit material
  const isEdit = Boolean(editId);
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("form"); // "form" | "result"
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null); // { dataUrl, name }
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null); // { type: "error" | "warning" | "success", text }
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Mode Edit: muat material yang ada. Mode baru: muat draf teks (foto tidak ikut disimpan).
  useEffect(() => {
    if (isEdit) {
      fetchMaterial(editId)
        .then(({ form: saved, photo: savedPhoto }) => {
          setForm({ ...EMPTY_FORM, ...saved });
          setPhoto(savedPhoto);
        })
        .catch(() => setNotice({ type: "error", text: "Material tidak dapat dimuat." }));
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setForm({ ...EMPTY_FORM, ...JSON.parse(raw) });
    } catch {
      /* abaikan */
    }
  }, [isEdit, editId]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleFile(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: "Foto harus berformat JPG, PNG, atau WebP." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: "Ukuran foto maksimal 10 MB." }));
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setPhoto({ dataUrl, name: file.name });
      setErrors((prev) => ({ ...prev, photo: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, photo: "Foto tidak dapat dibaca. Coba file lain." }));
    }
  }

  function validate() {
    const next = {};
    if (!photo) next.photo = "Foto material belum dipilih.";
    if (!form.description.trim()) next.description = "Deskripsi wajib diisi.";
    if (!form.quantity.trim() || Number(form.quantity) <= 0) next.quantity = "Isi jumlah dengan angka lebih dari 0.";
    if (form.price.trim() === "" || Number(form.price) < 0) next.price = "Isi harga dengan angka.";
    if (!form.location.trim()) next.location = "Lokasi wajib diisi.";
    return next;
  }

  async function handleSave() {
    setNotice(null);
    if (isEdit) {
      const found = validate();
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setNotice({ type: "error", text: "Upload failed. Please check the data" });
        return;
      }
      setSaving(true);
      try {
        await updateMaterial(editId, { form, photo, result });
        setNotice({ type: "success", text: "Material updated successfully" });
        setTimeout(() => router.push("/my-materials"), 1200);
      } catch {
        setNotice({ type: "error", text: "Perubahan gagal disimpan. Coba lagi." });
        setSaving(false);
      }
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setNotice({ type: "success", text: "Draf tersimpan." });
    } catch {
      setNotice({ type: "error", text: "Draf tidak dapat disimpan di browser ini." });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setNotice(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ type: "error", text: "Upload failed. Please check the data" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/classify-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image: photo.dataUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setNotice({ type: "error", text: data.error || "Klasifikasi gagal. Coba lagi." });
        return;
      }
      if (!data.dapat_diklasifikasi) {
        // REQ-104: minta Seller melengkapi deskripsi
        setNotice({
          type: "warning",
          text: data.pesan || "Deskripsi belum cukup jelas. Lengkapi jenis, kondisi, dan detail material.",
        });
        return;
      }
      setResult(data);
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setNotice({ type: "error", text: "Koneksi bermasalah. Periksa jaringan Anda lalu coba lagi." });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      if (isEdit) {
        await updateMaterial(editId, { form, photo, result });
        setNotice({ type: "success", text: "Material updated successfully" });
        setTimeout(() => router.push("/my-materials"), 1200);
        return;
      }
      await saveMaterial({ form, photo, result });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* abaikan */
      }
      setNotice({ type: "success", text: "Material uploaded successfully" });
      setTimeout(() => router.push("/marketplace"), 1200);
    } catch {
      setNotice({ type: "error", text: "Material gagal disimpan. Coba lagi." });
      setConfirming(false);
    }
  }

  return (
    <div className={`${inter.variable} ${montserrat.variable} min-h-screen bg-[#f4faff] font-[family-name:var(--font-inter)] text-[#111d23]`}>
      <Navbar />

      {step === "form" ? (
        <main className="mx-auto max-w-[1200px] px-6 pt-10 md:px-10">
          <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
            {/* ---------- Form ---------- */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(17,29,35,0.06)] md:p-8"
            >
              <h1 className={`${HEADING} text-[32px] font-semibold leading-tight`}>{isEdit ? "Edit Material" : "Upload Material"}</h1>
              <p className="mt-2 text-base leading-relaxed text-[#3a474d]">
                Bagikan sisa material Anda. Deskripsikan material, masukkan foto, dan lengkapi detailnya agar AI dapat
                membantu klasifikasi material dengan lebih akurat.
              </p>

              {notice && <Notice notice={notice} />}

              {/* Foto */}
              <div className="mt-7">
                <Label>Photo</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`rounded-xl border bg-white p-3 transition ${
                    dragging ? "border-[#3e6a00] bg-[#f3f9e8]" : errors.photo ? "border-[#b3261e]" : "border-[#cfe3ee]"
                  }`}
                >
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.dataUrl} alt="Pratinjau material" className="h-24 w-full rounded-lg object-cover" />
                      <p className="mt-3 text-sm font-semibold">Foto material</p>
                      <p className="mt-0.5 text-sm text-[#3a474d]">{photo.name} — pratinjau material yang diunggah.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 rounded-lg bg-[#3e6a00] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#2d4e00]"
                      >
                        Ganti Foto
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center gap-2 rounded-lg py-8 text-center"
                    >
                      <UploadCloud className="h-8 w-8 text-[#3e6a00]" strokeWidth={1.5} />
                      <span className="text-sm font-semibold">Pilih foto atau seret ke sini</span>
                      <span className="text-[13px] text-[#5b676c]">JPG, PNG, atau WebP</span>
                    </button>
                  )}
                </div>
                <FieldError>{errors.photo}</FieldError>
              </div>

              {/* Deskripsi */}
              <div className="mt-6">
                <Label htmlFor="description">Description</Label>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#2b3a40]">
                  <Sparkles className="h-3.5 w-3.5 text-[#3e6a00]" />
                  Tuliskan deskripsi singkat material Anda, seperti jenis, kondisi, dan detail lainnya.
                </p>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Sisa kain katun hitam"
                  className={`${inputBase} resize-none px-4 py-3 ${errors.description ? "border-[#b3261e]" : ""}`}
                />
                <FieldError>{errors.description}</FieldError>
              </div>

              {/* Quantity + Price */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <IconInput
                    id="quantity"
                    icon={Archive}
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="250"
                    error={errors.quantity}
                  />
                  <FieldError>{errors.quantity}</FieldError>
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <IconInput
                    id="price"
                    icon={Banknote}
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="3000"
                    error={errors.price}
                  />
                  <FieldError>{errors.price}</FieldError>
                </div>
              </div>

              {/* Location */}
              <div className="mt-5">
                <Label htmlFor="location">Location</Label>
                <IconInput
                  id="location"
                  icon={MapPin}
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Surabaya"
                  error={errors.location}
                />
                <FieldError>{errors.location}</FieldError>
              </div>

              {/* Aksi */}
              <div className="mt-7 flex items-center justify-between border-t border-[#dcebf3] pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="px-4 py-2 text-sm font-medium text-[#2b3a40] hover:text-[#3e6a00] disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Save"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-[#3e6a00] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#2d4e00] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Memproses..." : "Submit"}
                </button>
              </div>
            </form>

            {/* ---------- Kolom kanan ---------- */}
            <aside className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-[#d5e9f3] bg-gradient-to-br from-[#e9f6fc] to-white p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#b1b96d]">
                    <Bot className="h-6 w-6 text-[#2d4e00]" strokeWidth={1.75} />
                  </span>
                  <h2 className={`${HEADING} text-lg font-semibold`}>AI Material Classification</h2>
                </div>
                <p className="mt-4 text-base leading-relaxed text-[#3a474d]">
                  AI Material Classification memproses deskripsi material menggunakan NLP untuk mengenali jenis dan
                  atribut material.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-[#2b3a40]">
                  {["Mengidentifikasi komposisi material", "Menyarankan tag standar", "Menampilkan hasil klasifikasi material"].map(
                    (t) => (
                      <li key={t} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3e6a00]" strokeWidth={1.75} />
                        {t}
                      </li>
                    )
                  )}
                </ul>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/gudang-palet.jpg"
                alt="Tumpukan palet kayu di gudang"
                className="h-[250px] w-full rounded-2xl object-cover"
              />
            </aside>
          </div>
        </main>
      ) : (
        <ResultView
          result={result}
          photo={photo}
          notice={notice}
          confirming={confirming}
          onEdit={() => {
            setNotice(null);
            setStep("form");
          }}
          onConfirm={handleConfirm}
        />
      )}

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifikasi                                                          */
/* ------------------------------------------------------------------ */

function Notice({ notice }) {
  const styles = {
    error: "border-[#f0c4c0] bg-[#fdf1f0] text-[#8c1d18]",
    warning: "border-[#ecd9a0] bg-[#fdf8e6] text-[#6b5200]",
    success: "border-[#c5e1a5] bg-[#f1f8e9] text-[#2d4e00]",
  };
  const Icon = notice.type === "success" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      role={notice.type === "success" ? "status" : "alert"}
      className={`mt-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${styles[notice.type]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{notice.text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hasil klasifikasi (Gambar 1.8)                                      */
/* ------------------------------------------------------------------ */

function ResultView({ result, photo, notice, confirming, onEdit, onConfirm }) {
  const rows = [
    { icon: Shapes, label: "Jenis Material", value: result.jenis_material },
    { icon: Network, label: "Kategori", value: result.kategori },
    { icon: ThumbsUp, label: "Kondisi", value: result.kondisi, pill: true },
    { icon: Ruler, label: "Dimensi (Perk.)", value: result.dimensi_perkiraan },
  ];

  return (
    <main className="mx-auto max-w-[800px] px-6 pt-10">
      <section className="flex items-start gap-4 rounded-2xl border border-[#d9ecd0] bg-gradient-to-r from-[#e9f6fc] to-white p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#84b93c]">
          <BrainCircuit className="h-6 w-6 text-[#2d4e00]" strokeWidth={1.75} />
        </span>
        <div>
          <h1 className={`${HEADING} text-2xl font-semibold text-[#3e6a00]`}>AI Material Classification</h1>
          <p className="mt-1.5 text-base leading-relaxed text-[#3a474d]">
            Deskripsi material telah diproses menggunakan NLP untuk mengenali jenis dan atribut material. Tinjau hasil
            klasifikasi sebelum menekan Confirm.
          </p>
        </div>
      </section>

      {notice && <Notice notice={notice} />}

      <section className="mt-6 grid overflow-hidden rounded-2xl border border-[#d5e9f3] bg-white md:grid-cols-2">
        <div className="relative min-h-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.dataUrl} alt={result.nama_material} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold">
            Gambar: {photo.name}
          </span>
        </div>

        <div className="p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className={`${HEADING} text-2xl font-semibold`}>{result.nama_material}</h2>
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#b1b96d] px-3 py-1.5 text-sm font-semibold text-[#2d4e00]">
              <Recycle className="h-4 w-4" />
              {result.skor_kelayakan}/100
            </span>
          </div>

          <dl className="mt-3">
            {rows.map(({ icon: Icon, label, value, pill }) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-[#dcebf3] py-4">
                <dt className="flex items-center gap-2 text-sm text-[#3a474d]">
                  <Icon className="h-4 w-4 text-[#5b676c]" strokeWidth={1.75} />
                  {label}
                </dt>
                <dd className="text-right">
                  {pill ? (
                    <span className="rounded-full border border-[#8fc460] bg-[#e5f3d6] px-3 py-1 text-xs font-semibold">
                      {value}
                    </span>
                  ) : (
                    <span className="text-base font-medium">{value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onEdit}
              disabled={confirming}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#7b7d6a] bg-white py-3 text-sm font-medium transition hover:bg-[#f4f7ee] disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#3e6a00] py-3 text-sm font-medium text-white transition hover:bg-[#2d4e00] disabled:opacity-70"
            >
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm
            </button>
          </div>
        </div>
      </section>

      <p className="mt-5 text-center text-[13px] font-medium text-[#2b3a40]">
        Dengan mengonfirmasi, Anda menyetujui{" "}
        <a href="#" className="font-semibold text-[#3e6a00] underline">
          Pedoman Komunitas
        </a>{" "}
        CIRCLO.
      </p>
    </main>
  );
}
