"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    console.log("REGISTER DATA:", data);
    console.log("REGISTER ERROR:", error);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setIsError(false);
    setMessage("Registrasi berhasil.");

    setNama("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("buyer");

    setLoading(false);
  };

  return (
    <main>
      <h1>Daftar CIRCLO</h1>
      <p>Buat akun untuk mulai menggunakan CIRCLO.</p>

      <form onSubmit={handleRegister}>
        <div>
          <label>Nama</label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>

        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="government">Pemerintah/Admin</option>
          </select>
        </div>

        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label>Konfirmasi Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {message && (
          <p style={{ color: isError ? "red" : "green" }}>
            {message}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Mendaftarkan..." : "Register"}
        </button>
      </form>

      <p>
        Sudah memiliki akun?{" "}
        <button type="button" onClick={() => router.push("/login")}>
          Login
        </button>
      </p>
    </main>
  );
}