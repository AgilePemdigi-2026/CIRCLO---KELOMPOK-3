'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { ROLES, roleFromUser } from './roles';

const DEV_KEY = 'circlo:dev-role';
const IS_DEV = process.env.NODE_ENV !== 'production';
export const LOGIN_PATH = process.env.NEXT_PUBLIC_LOGIN_PATH || '/login';

// Mengembalikan { role, loading }.
// Urutan: (1) mode dev: ?role=buyer|seller|government menyimpan role palsu untuk uji tampilan,
// (2) sesi login Supabase, (3) saat npm run dev tanpa login, dianggap seller supaya halaman bisa dicoba.
// Di production tidak ada role palsu: tanpa login role = null dan halaman terlindungi akan ke halaman login.
export function useRole() {
  const [state, setState] = useState({ role: null, user: null, loading: true });

  useEffect(() => {
    let active = true;
    (async () => {
      const done = (next) => active && setState({ user: null, ...next, loading: false });

      if (IS_DEV) {
        const q = new URLSearchParams(window.location.search).get('role');
        if (ROLES.includes(q)) localStorage.setItem(DEV_KEY, q);
        if (q === 'reset') localStorage.removeItem(DEV_KEY);
        const dev = localStorage.getItem(DEV_KEY);
        if (ROLES.includes(dev)) return done({ role: dev });
      }

      let role = null;
      let user = null;
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
        role = roleFromUser(user);
        if (!role && user && IS_DEV) role = 'seller';
      }
      if (!role && !user && IS_DEV) role = 'seller';
      done({ role, user });
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}

// Token sesi login untuk dikirim ke API server (route /api/classify-material memeriksa role Seller).
export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}
