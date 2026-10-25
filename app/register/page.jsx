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

// Teks mengikuti user story 5.1 (Login / Register)
const TEXT = {
  success: "Registration successful",
  existing: "Registration failed. Email is already registered.",
  incomplete: "Registration failed. Please complete all data.",
  shortPassword: "Registration failed. Password must be at least 6 characters.",
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const fail = (text) => {
    setIsError(true);
    setMessage(text);
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim();

    // Data tidak lengkap
    if (!cleanNama || !cleanEmail || !password) {
      return fail(TEXT.incomplete);
    }

    if (password.length < 6) {
      return fail(TEXT.shortPassword);
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          nama: cleanNama,
          role,
        },
      },
    });

    // Email sudah terdaftar (error langsung dari Supabase)
    if (error) {
      const exists = /already|registered|exists/i.test(error.message);
      return fail(exists ? TEXT.existing : `Registration failed. ${error.message}`);
    }

    // Pada beberapa pengaturan Supabase, email yang sudah ada tidak memberi
    // error, tetapi mengembalikan identities kosong
    if (data?.user?.identities?.length === 0) {
      return fail(TEXT.existing);
    }

    // Berhasil: tampilkan pesan, lalu pindah ke /login
    setIsError(false);
    setMessage(TEXT.success);
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <AuthShell
      activeTab="register"
      title="Buat Akun Baru"
      subtitle="Mulai perjalanan kepedulian Anda."
    >
      <form onSubmit={handleRegister} className="space-y-3.5">
        <AuthField label="Full Name" icon={<UserIcon />}>
          <AuthInput
            type="text"
            aria-label="Full Name"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama lengkap"
          />
        </AuthField>

        <AuthField label="Email" icon={<MailIcon />}>
          <AuthInput
            type="email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="relawan@komunitas.org"
          />
        </AuthField>

        <AuthField label="Role" icon={<RoleIcon />}>
          <select
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        </AuthField>

        <AuthField
          label="Password"
          icon={<LockIcon />}
          action={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Tampilkan atau sembunyikan password"
            >
              <EyeIcon off={showPassword} />
            </button>
          }
        >
          <AuthInput
            type={showPassword ? "text" : "password"}
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
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
          {loading ? "Registering..." : "Register"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </AuthShell>
  );
}