'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, CircleAlert, CircleCheck, LoaderCircle, LogOut, Mail, Pencil, Phone, ShieldCheck, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { LOGIN_PATH, useRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ROLE_LABEL, profileFromUser } from '@/lib/roles';
import { clearDraft, clearResult } from '@/lib/storage';

// Data contoh (dari user story SRS 4.4.3) hanya dipakai saat npm run dev dan belum ada akun yang login.
const SAMPLE_USER = { email: 'buyer@gmail.com', created_at: '2026-09-01T00:00:00Z', user_metadata: { full_name: 'Maysha Akmala', phone: '081234567890' } };

const PHONE_RE = /^(\+62|62|0)8[0-9]{8,12}$/;

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Ditulis sebagai "Label: nilai" supaya sama dengan skenario SRS 4.3 ("Full Name: Maysha Akmala").
function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-circlo-line py-[18px] last:border-b-0">
      <Icon className="h-[16px] w-[16px] shrink-0 text-circlo-muted" />
      <p className="text-[16px]">
        <span className="text-circlo-muted">{label}:</span> <span className="font-medium text-circlo-ink">{children}</span>
      </p>
    </div>
  );
}

const fieldClass = (err) =>
  `h-[46px] w-full rounded-lg border bg-circlo-field px-4 text-[15px] outline-none transition focus:border-circlo-green focus:bg-white ${err ? 'border-red-500' : 'border-circlo-fieldline'}`;

function ProfileContent() {
  const router = useRouter();
  const { role, user: sessionUser } = useRole();
  const isSample = !sessionUser;
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { type: 'ok' | 'error', text }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUser(sessionUser || SAMPLE_USER);
  }, [sessionUser]);

  if (!user) return <div className="h-[60vh]" aria-busy="true" />;

  const profile = profileFromUser(user);
  const canEdit = role === 'buyer' || role === 'seller';

  function startEdit() {
    setForm({ fullName: profile.hasName ? profile.fullName : '', phone: profile.phone });
    setErrors({});
    setBanner(null);
    setEditing(true);
  }

  async function onSave(e) {
    e.preventDefault();
    const found = {};
    if (!form.fullName.trim()) found.fullName = 'Full Name wajib diisi';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) found.phone = 'Format nomor tidak valid, contoh 081234567890';
    setErrors(found);
    if (Object.keys(found).length) {
      setBanner({ type: 'error', text: 'Profile update failed. Please complete all required fields.' });
      return;
    }

    setSaving(true);
    const data = { ...user.user_metadata, full_name: form.fullName.trim(), phone: form.phone.replace(/[\s-]/g, '') };
    try {
      if (supabase && !isSample) {
        const { data: res, error } = await supabase.auth.updateUser({ data });
        if (error) throw error;
        setUser(res.user);
      } else {
        setUser({ ...user, user_metadata: data });
      }
      setBanner({ type: 'ok', text: isSample ? 'Profile updated successfully (mode demo, belum login jadi tidak tersimpan ke database)' : 'Profile updated successfully' });
      setEditing(false);
    } catch (err) {
      setBanner({ type: 'error', text: `Profile update failed. ${err.message || ''}`.trim() });
    }
    setSaving(false);
  }

  async function onLogout() {
    if (supabase) await supabase.auth.signOut();
    clearDraft();
    clearResult();
    router.push(LOGIN_PATH);
  }

  return (
    <main className="w-full px-10 pt-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[14px] font-medium text-circlo-muted hover:text-circlo-green">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-4 font-display text-[32px] font-semibold leading-tight">Profil Akun</h1>
      <p className="mt-2 text-[16px] text-circlo-muted">Informasi akun yang terdaftar di CIRCLO.</p>

      {isSample && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          Mode pengembangan: belum ada akun yang login, jadi yang tampil adalah data contoh. Setelah login terhubung, bagian ini menampilkan akun yang sedang login.
        </p>
      )}

      {banner && (
        <p
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`mt-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-[14px] font-medium ${banner.type === 'ok' ? 'border-circlo-lime/50 bg-circlo-soft text-circlo-green' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {banner.type === 'ok' ? <CircleCheck className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
          {banner.text}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Kartu ringkasan */}
        <aside className="rounded-2xl bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full bg-circlo-olive font-display text-[32px] font-bold text-circlo-green">
            {initials(profile.fullName)}
          </span>
          <h2 className="mt-5 font-display text-[22px] font-semibold leading-tight">{profile.fullName}</h2>
          <p className="mt-1 break-all text-[14px] text-circlo-muted">{profile.email}</p>
          <span className="mt-4 inline-block rounded-full border border-circlo-lime bg-circlo-soft px-4 py-1.5 text-[13px] font-semibold text-circlo-green">
            {ROLE_LABEL[role] || '-'}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="mt-7 flex h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-circlo-green/60 bg-white text-[14px] font-medium hover:bg-circlo-bg"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </aside>

        {/* Kartu detail / form edit */}
        <section className="rounded-2xl bg-white p-8 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-semibold">{editing ? 'Edit Profil' : 'Informasi Akun'}</h2>
            {!editing && canEdit && (
              <button type="button" onClick={startEdit} className="flex items-center gap-2 rounded-lg border border-circlo-green/60 px-5 py-2.5 text-[14px] font-medium hover:bg-circlo-bg">
                <Pencil className="h-4 w-4" /> Edit Profil
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={onSave} noValidate className="mt-6 space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-[14px] font-medium">Full Name</label>
                <input id="fullName" name="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Maysha Akmala" className={`${fieldClass(errors.fullName)} mt-2`} />
                {errors.fullName && <p className="mt-1 text-[13px] text-red-600">{errors.fullName}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-[14px] font-medium">Email</label>
                <input id="email" value={profile.email} disabled className={`${fieldClass(false)} mt-2 cursor-not-allowed text-circlo-muted`} />
                <p className="mt-1 text-[12.5px] text-circlo-muted">Email tidak bisa diubah di sini.</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-[14px] font-medium">Phone Number</label>
                <input id="phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="081234567890" inputMode="tel" className={`${fieldClass(errors.phone)} mt-2`} />
                {errors.phone && <p className="mt-1 text-[13px] text-red-600">{errors.phone}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-circlo-line pt-6">
                <button type="button" onClick={() => { setEditing(false); setErrors({}); setBanner(null); }} className="px-5 py-2.5 text-[14px] font-medium text-circlo-ink/80 hover:text-circlo-green">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white hover:brightness-110 disabled:opacity-70">
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-2">
              <Row icon={User} label="Full Name">{profile.fullName}</Row>
              <Row icon={Mail} label="Email">{profile.email}</Row>
              <Row icon={Phone} label="Phone Number">{profile.phone || <span className="font-normal text-circlo-muted">Belum diisi</span>}</Row>
              <Row icon={ShieldCheck} label="Peran">{ROLE_LABEL[role] || '-'}</Row>
              <Row icon={CalendarDays} label="Terdaftar sejak">{formatDate(profile.createdAt)}</Row>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['buyer', 'seller', 'government']}>
        <ProfileContent />
        <Footer />
      </RoleGate>
    </>
  );
}
