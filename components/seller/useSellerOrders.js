'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

export function useSellerOrders() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    needsLogin: false,
    orders: [],
    summary: null,
    seller: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const token = await getAccessToken();
    if (!token) {
      setState({
        loading: false,
        error: null,
        needsLogin: true,
        orders: [],
        summary: null,
        seller: null,
      });
      return;
    }

    try {
      const response = await fetch('/api/orders?scope=seller', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Gagal memuat data penjual.');
      }

      setState({
        loading: false,
        error: null,
        needsLogin: false,
        orders: Array.isArray(data.orders) ? data.orders : [],
        summary: data.summary || null,
        seller: data.seller || null,
      });
    } catch (err) {
      setState({
        loading: false,
        error: err?.message || 'Gagal memuat data penjual.',
        needsLogin: false,
        orders: [],
        summary: null,
        seller: null,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
