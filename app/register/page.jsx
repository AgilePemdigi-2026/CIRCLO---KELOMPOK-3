"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import {
  AuthField,
  AuthInput,
  UserIcon,
  MailIcon,
  LockIcon,
  RoleIcon,
  EyeIcon,
  inputClass,
  GREEN,
} from "@/components/auth/AuthFields";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim();

    if (!cleanNama || !cleanEmail || !password || !confirmPassword) {
      setIsError(true);
      setMessage("Semua data harus diisi.");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Konfirmasi password tidak sesuai.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          nama: cleanNama,
          role,
        },
      },
    });

    if (error) {
      setIsError(true);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setIsError(false);
    setMessage("Registrasi berhasil. Mengarahkan ke halaman masuk...");

    router.push("/login");
  };

  return (
    <AuthShell
      activeTab="register"
      title="Buat Akun Baru"
      subtitle="Mulai perjalanan kepedulian Anda."
    >
      <form onSubmit={handleRegister} className="space-y-3.5">
        <AuthField label="Nama Lengkap" icon={<UserIcon />}>
          <AuthInput
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama lengkap"
          />
        </AuthField>

        <AuthField label="Alamat Email" icon={<MailIcon />}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="relawan@komunitas.org"
          />
        </AuthField>

        <AuthField label="Daftar Sebagai" icon={<RoleIcon />}>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        </AuthField>

        <AuthField
          label="Kata Sandi"
          icon={<LockIcon />}
          action={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Tampilkan atau sembunyikan kata sandi"
            >
              <EyeIcon off={showPassword} />
            </button>
          }
        >
          <AuthInput
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />
        </AuthField>

        <AuthField
          label="Konfirmasi Kata Sandi"
          icon={<LockIcon />}
          action={
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label="Tampilkan atau sembunyikan konfirmasi kata sandi"
            >
              <EyeIcon off={showConfirm} />
            </button>
          }
        >
          <AuthInput
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi kata sandi"
          />
        </AuthField>

        {message && (
          <p
            className={`rounded-md px-3 py-2 text-xs ${
              isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: GREEN }}
        >
          {loading ? "Mendaftarkan..." : "Daftar"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </AuthShell>
  );
}
