export const ORDER_STATUS = {
  PENDING: 'Menunggu Konfirmasi',
  CONFIRMED: 'Dikonfirmasi',
  DISTRIBUTED: 'Disalurkan',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
};

export function statusKey(value) {
  const status = String(value || '').toLowerCase();
  if (/tolak|batal/.test(status)) return 'rejected';
  if (/selesai|diterima/.test(status)) return 'completed';
  if (/salur|kirim|siap/.test(status)) return 'distributed';
  if (/proses/.test(status) || (/konfirmasi/.test(status) && !/menunggu/.test(status))) {
    return 'confirmed';
  }
  return 'pending';
}

export function statusLabel(value, metodeKirim) {
  const key = statusKey(value);
  if (key === 'pending') return 'Menunggu Konfirmasi';
  if (key === 'confirmed') return 'Dikonfirmasi';
  if (key === 'distributed') return metodeKirim === 'Dikirim' ? 'Dikirim' : 'Siap Diambil';
  if (key === 'completed') return 'Selesai';
  if (key === 'rejected') return 'Ditolak';
  return value || 'Menunggu Konfirmasi';
}

export function statusStyle(value) {
  const key = statusKey(value);
  if (key === 'pending') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (key === 'confirmed') return 'border-sky-200 bg-sky-50 text-sky-800';
  if (key === 'distributed') return 'border-circlo-lime/60 bg-circlo-soft text-circlo-green';
  if (key === 'completed') return 'border-circlo-line bg-circlo-field text-circlo-muted';
  if (key === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-circlo-line bg-circlo-field text-circlo-muted';
}

export function statusDot(value) {
  const key = statusKey(value);
  if (key === 'pending') return 'bg-amber-500';
  if (key === 'confirmed') return 'bg-sky-500';
  if (key === 'distributed') return 'bg-circlo-green';
  if (key === 'completed') return 'bg-circlo-muted';
  if (key === 'rejected') return 'bg-red-500';
  return 'bg-circlo-muted';
}

export function isActionable(order) {
  return ['pending', 'confirmed', 'distributed'].includes(statusKey(order?.status_pesanan));
}

export function sortOrders(orders) {
  const priority = { pending: 0, confirmed: 1, distributed: 2, completed: 3, rejected: 4 };
  return [...orders].sort((a, b) => {
    const byStatus = (priority[statusKey(a.status_pesanan)] ?? 9) - (priority[statusKey(b.status_pesanan)] ?? 9);
    if (byStatus !== 0) return byStatus;
    return new Date(b.tgl_pesan || 0).getTime() - new Date(a.tgl_pesan || 0).getTime();
  });
}

export function actionsFor(order) {
  const key = statusKey(order?.status_pesanan);

  if (key === 'pending') {
    return [
      { key: 'confirm', label: 'Konfirmasi Pesanan', variant: 'primary' },
      { key: 'reject', label: 'Tolak', variant: 'danger' },
    ];
  }

  if (key === 'confirmed') {
    return [
      { key: 'contact', label: 'Hubungi Pembeli', variant: 'outline' },
      order?.metode_kirim === 'Dikirim'
        ? { key: 'ship', label: 'Tandai Sudah Dikirim', variant: 'primary' }
        : { key: 'complete', label: 'Tandai Sudah Diambil', variant: 'primary' },
    ];
  }

  if (key === 'distributed') {
    return [
      { key: 'contact', label: 'Hubungi Pembeli', variant: 'outline' },
      { key: 'complete', label: 'Tandai Selesai', variant: 'primary' },
    ];
  }

  if (key === 'completed' || key === 'rejected') {
    return [{ key: 'detail', label: 'Detail Pesanan', variant: 'outline' }];
  }

  return [];
}

export function actionDialog(action, order) {
  const buyerName = order?.buyer?.nama_buyer || 'pembeli';
  const code = `#${order?.id_pesanan ?? ''}`;

  if (action === 'confirm') {
    return {
      title: 'Konfirmasi pesanan?',
      description: `Pesanan ${code} dari ${buyerName} akan dikonfirmasi. Pembeli akan melihat status Dikonfirmasi.`,
      confirmLabel: 'Ya, Konfirmasi',
      variant: 'primary',
    };
  }

  if (action === 'reject') {
    return {
      title: 'Tolak pesanan?',
      description: `Pesanan ${code} dari ${buyerName} akan ditolak. Stok material yang dipesan akan dikembalikan ke katalog.`,
      confirmLabel: 'Ya, Tolak Pesanan',
      variant: 'danger',
    };
  }

  if (action === 'ship') {
    return {
      title: 'Tandai sudah dikirim?',
      description: `Pesanan ${code} akan diperbarui menjadi Disalurkan agar pembeli tahu material sedang dalam pengiriman.`,
      confirmLabel: 'Ya, Tandai Dikirim',
      variant: 'primary',
    };
  }

  if (action === 'complete') {
    const pickup = order?.metode_kirim !== 'Dikirim';
    return {
      title: pickup ? 'Tandai sudah diambil?' : 'Selesaikan pesanan?',
      description: pickup
        ? `Pesanan ${code} akan ditandai Selesai setelah material diambil oleh ${buyerName}.`
        : `Pesanan ${code} akan ditandai Selesai setelah material diterima pembeli.`,
      confirmLabel: pickup ? 'Ya, Sudah Diambil' : 'Ya, Selesaikan',
      variant: 'primary',
    };
  }

  return null;
}
