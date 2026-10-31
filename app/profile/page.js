
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  Pencil,
  LogOut,
  ArrowLeft,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Leaf,
  LockKeyhole,
  ShoppingBag,
  Package,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoleGate from "@/components/RoleGate";
import { LOGIN_PATH, useRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ROLE_LABEL, profileFromUser } from "@/lib/roles";
import { clearDraft, clearResult } from "@/lib/storage";

const PHONE_RE = /^(\+62|62|0)8[0-9]{8,12}$/;

const inputClass =
  "w-full rounded-xl border border-[#dce5d5] bg-[#f9fbf7] px-4 py-3 text-sm text-[#243527] outline-none transition focus:border-[#467814] focus:bg-white focus:ring-2 focus:ring-[#467814]/10";

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "CU";

  return (
    (words[0][0] || "") +
    (words.length > 1 ? words[words.length - 1][0] : "")
  ).toUpperCase();
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 border-b border-[#edf1e9] py-5 last:border-0">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf5e6] text-[#467814]">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#809080]">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-[#253428]">
          {value || "Belum diisi"}
        </p>
      </div>
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { role, user: sessionUser } = useRole();

  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    if (sessionUser) {
      setUser(sessionUser);
    }
  }, [sessionUser]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#467814]" />
      </div>
    );
  }

  const profile = profileFromUser(user);
  const fullName = profile.fullName || "Pengguna CIRCLO";
  const isSeller = role === "seller";
  const canEdit = role === "buyer" || isSeller;

  const roleLabel =
    ROLE_LABEL[role] ||
    (isSeller ? "Seller" : "Buyer");

  function startEdit() {
    setForm({
      fullName: profile.hasName ? profile.fullName : "",
      phone: profile.phone || "",
    });

    setMessage(null);
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();

    const name = form.fullName.trim();
    const phone = form.phone.replace(/[\s-]/g, "");

    if (!name) {
      setMessage({
        type: "error",
        text: "Nama lengkap wajib diisi.",
      });
      return;
    }

    if (phone && !PHONE_RE.test(phone)) {
      setMessage({
        type: "error",
        text: "Nomor HP tidak valid. Contoh: 081234567890.",
      });
      return;
    }

    if (!supabase) {
      setMessage({
        type: "error",
        text: "Koneksi Supabase belum tersedia.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: name,
          phone,
        },
      });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("Profil terbaru tidak ditemukan.");
      }

      setUser(data.user);
      setEditing(false);

      setMessage({
        type: "success",
        text: "Profil berhasil diperbarui!",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Gagal menyimpan profil.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setMessage(null);

    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      clearDraft();
      clearResult();

      router.replace(LOGIN_PATH);
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Gagal logout.",
      });
      setLoggingOut(false);
    }
  }

  return (
   <main className="bg-[#f5f8f2] pb-4">
     <div className="mx-auto w-full max-w-[1600px] px-6 pt-8 lg:px-10">

        {/* <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#61715f] transition hover:text-[#467814]"
        >
          <ArrowLeft size={17} />
          Kembali ke Dashboard
        </Link> */}

        <div className="mt-2">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#467814]">
                      CIRCLO ACCOUNT
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#223425] sm:text-4xl">
            Profil Saya
          </h1>

          <p className="mt-2 text-sm text-[#768476]">
            Kelola informasi akun dan identitas CIRCLO kamu.
          </p>
        </div>

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-6 flex items-center gap-3 rounded-xl border px-5 py-4 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertCircle size={19} />
            )}

            {message.text}
          </div>
        )}

        {/* HEADER PROFIL */}
        <div className="relative mt-8 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#244b20] via-[#356324] to-[#56812a] p-7 text-white shadow-lg sm:p-10">

          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[38px] border-white/10" />
          <div className="pointer-events-none absolute bottom-[-70px] right-40 h-44 w-44 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">

            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-[#e3f1cf] text-3xl font-bold text-[#315d20] shadow-lg">
              {getInitials(fullName)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/75">
                Selamat datang di CIRCLO,
              </p>

              <h2 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
                {fullName}
              </h2>

              <p className="mt-2 break-all text-sm text-white/80">
                {profile.email}
              </p>

              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold">
                <ShieldCheck size={15} />
                {roleLabel}
              </span>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#315d20] transition hover:bg-[#e9f5dc]"
              >
                <Pencil size={16} />
                Edit Profil
              </button>
            )}
          </div>
        </div>

        {/* KONTEN PROFIL */}
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_1.7fr]">

          {/* KARTU KIRI */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-[#e6ecdf] bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#edf5e6] p-3 text-[#467814]">
                  {isSeller ? (
                    <Package size={21} />
                  ) : (
                    <ShoppingBag size={21} />
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-[#253428]">
                    {isSeller ? "Akun Seller" : "Akun Buyer"}
                  </h3>

                  <p className="text-xs text-[#819080]">
                    Akun CIRCLO
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-[#f3f8ed] p-4">
                <p className="text-sm leading-relaxed text-[#54704c]">
                  {isSeller
                    ? "Kelola material dan pantau pesanan dari pembeli melalui CIRCLO."
                    : "Jelajahi material berkelanjutan dan pantau pesanan melalui CIRCLO."}
                </p>
              </div>

              <Link
                href={isSeller ? "/my-materials" : "/orders"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#467814] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#345d0d]"
              >
                {isSeller ? (
                  <Package size={17} />
                ) : (
                  <ShoppingBag size={17} />
                )}
                {isSeller ? "Material Saya" : "Pesanan Saya"}
              </Link>
            </div>

            <div className="rounded-2xl border border-[#e6ecdf] bg-white p-6 shadow-sm">
              <h3 className="font-bold text-[#253428]">
                Pengaturan Akun
              </h3>

              <p className="mt-1 text-xs text-[#819080]">
                Kelola akses akun kamu.
              </p>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                {loggingOut ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LogOut size={17} />
                )}
                Keluar dari Akun
              </button>
            </div>
          </aside>

          {/* KARTU KANAN */}
          <section className="rounded-2xl border border-[#e6ecdf] bg-white p-6 shadow-sm sm:p-8">

            <div className="flex items-center justify-between gap-3 border-b border-[#edf1e9] pb-5">
              <div>
                <h3 className="text-xl font-bold text-[#253428]">
                  {editing
                    ? "Edit Informasi Profil"
                    : "Informasi Pribadi"}
                </h3>

                <p className="mt-1 text-xs text-[#819080]">
                  {editing
                    ? "Perbarui informasi akun kamu."
                    : "Detail informasi akun yang terdaftar."}
                </p>
              </div>

              <div className="rounded-xl bg-[#edf5e6] p-3 text-[#467814]">
                <UserRound size={22} />
              </div>
            </div>

            {editing ? (
              <form
                onSubmit={handleSave}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-[#354638]"
                  >
                    Nama Lengkap
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    placeholder="Masukkan nama lengkap"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[#354638]"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={profile.email || ""}
                    disabled
                    className={`${inputClass} cursor-not-allowed opacity-60`}
                  />

                  <p className="mt-2 flex items-center gap-1 text-xs text-[#819080]">
                    <LockKeyhole size={12} />
                    Email tidak dapat diubah di halaman ini.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-[#354638]"
                  >
                    Nomor HP
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Contoh: 081234567890"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-[#edf1e9] pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setMessage(null);
                    }}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-[#536354] hover:bg-gray-50"
                  >
                    <X size={16} />
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-[#467814] px-6 py-3 text-sm font-semibold text-white hover:bg-[#345d0d] disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={16} />
                    )}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <InfoItem
                  icon={UserRound}
                  label="Nama Lengkap"
                  value={fullName}
                />

                <InfoItem
                  icon={Mail}
                  label="Alamat Email"
                  value={profile.email}
                />

                <InfoItem
                  icon={Phone}
                  label="Nomor HP"
                  value={profile.phone}
                />

                <InfoItem
                  icon={ShieldCheck}
                  label="Tipe Akun"
                  value={roleLabel}
                />

                <InfoItem
                  icon={CalendarDays}
                  label="Bergabung Sejak"
                  value={formatDate(profile.createdAt)}
                />
              </div>
            )}
          </section>
        </div>

     <div className="mt-4 text-center">
          <p className="text-xs text-[#91a08c]">
            CIRCLO — Bersama menciptakan masa depan yang lebih berkelanjutan.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Navbar />

      <RoleGate allow={["buyer", "seller"]}>
        <ProfileContent />
      </RoleGate>

      <Footer />
    </>
  );
}
