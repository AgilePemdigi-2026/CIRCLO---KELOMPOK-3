
export const ORDER_STATUS = {
  UNPAID: "Menunggu Pembayaran",
  PENDING: "Menunggu Konfirmasi",
  CONFIRMED: "Dikonfirmasi",
  DISTRIBUTED: "Disalurkan",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

export function statusKey(value) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status.includes("menunggu pembayaran")) {
    return "unpaid";
  }

  if (/batal/.test(status)) {
    return "cancelled";
  }

  if (/tolak/.test(status)) {
    return "rejected";
  }

  if (/selesai|diterima/.test(status)) {
    return "completed";
  }

  if (/salur|kirim|siap/.test(status)) {
    return "distributed";
  }

  if (
    /dikonfirmasi|proses/.test(status)
  ) {
    return "confirmed";
  }

  return "pending";
}

export function statusLabel(value, metodeKirim) {
  const key = statusKey(value);

  if (key === "unpaid") {
    return "Menunggu Pembayaran";
  }

  if (key === "pending") {
    return "Menunggu Konfirmasi";
  }

  if (key === "confirmed") {
    return "Dikonfirmasi";
  }

  if (key === "distributed") {
    return metodeKirim === "Dikirim"
      ? "Dikirim"
      : "Siap Diambil";
  }

  if (key === "completed") {
    return "Selesai";
  }

  if (key === "cancelled") {
    return "Dibatalkan";
  }

  if (key === "rejected") {
    return "Ditolak";
  }

  return value || "-";
}

export function statusStyle(value) {
  const key = statusKey(value);

  if (key === "unpaid") {
    return "border-gray-200 bg-gray-50 text-gray-700";
  }

  if (key === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (key === "confirmed") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (key === "distributed") {
    return "border-circlo-lime/60 bg-circlo-soft text-circlo-green";
  }

  if (key === "completed") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (key === "cancelled") {
    return "border-gray-200 bg-gray-100 text-gray-600";
  }

  if (key === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
}

export function statusDot(value) {
  const key = statusKey(value);

  if (key === "unpaid") {
    return "bg-gray-400";
  }

  if (key === "pending") {
    return "bg-amber-500";
  }

  if (key === "confirmed") {
    return "bg-sky-500";
  }

  if (key === "distributed") {
    return "bg-circlo-green";
  }

  if (key === "completed") {
    return "bg-green-500";
  }

  if (key === "rejected") {
    return "bg-red-500";
  }

  return "bg-gray-400";
}

export function isActionable(order) {
  return [
    "pending",
    "confirmed",
    "distributed",
  ].includes(
    statusKey(order?.status_pesanan)
  );
}

export function sortOrders(orders) {
  const priority = {
    pending: 0,
    confirmed: 1,
    distributed: 2,
    unpaid: 3,
    completed: 4,
    rejected: 5,
    cancelled: 6,
  };

  return [...orders].sort((a, b) => {
    const statusA =
      statusKey(a.status_pesanan);

    const statusB =
      statusKey(b.status_pesanan);

    const byStatus =
      (priority[statusA] ?? 9) -
      (priority[statusB] ?? 9);

    if (byStatus !== 0) {
      return byStatus;
    }

    return (
      new Date(b.tgl_pesan || 0).getTime() -
      new Date(a.tgl_pesan || 0).getTime()
    );
  });
}

// ===================================
// TOMBOL AKSI SELLER
// ===================================

export function actionsFor(order) {
  const key = statusKey(
    order?.status_pesanan
  );

  // Belum dibayar: jangan tampilkan
  // tombol konfirmasi atau penyaluran.
  if (key === "unpaid") {
    return [];
  }

  if (key === "pending") {
    return [
      {
        key: "confirm",
        label: "Konfirmasi Pesanan",
        variant: "primary",
      },
      {
        key: "reject",
        label: "Tolak",
        variant: "danger",
      },
    ];
  }

  if (key === "confirmed") {
    return [
      {
        key: "contact",
        label: "Hubungi Pembeli",
        variant: "outline",
      },
      order?.metode_kirim === "Dikirim"
        ? {
            key: "ship",
            label: "Tandai Sudah Dikirim",
            variant: "primary",
          }
        : {
            key: "complete",
            label: "Tandai Sudah Diambil",
            variant: "primary",
          },
    ];
  }

  if (key === "distributed") {
    return [
      {
        key: "contact",
        label: "Hubungi Pembeli",
        variant: "outline",
      },
      {
        key: "complete",
        label: "Tandai Selesai",
        variant: "primary",
      },
    ];
  }

  if (
    key === "completed" ||
    key === "rejected" ||
    key === "cancelled"
  ) {
    return [
      {
        key: "detail",
        label: "Detail Pesanan",
        variant: "outline",
      },
    ];
  }

  return [];
}

// ===================================
// POPUP KONFIRMASI AKSI SELLER
// ===================================

export function actionDialog(action, order) {
  const buyerName =
    order?.buyer?.nama_buyer ||
    "pembeli";

  const code =
    `#${order?.id_pesanan ?? ""}`;

  if (action === "confirm") {
    return {
      title: "Konfirmasi pesanan?",
      description:
        `Pesanan ${code} dari ${buyerName} ` +
        "akan dikonfirmasi. Pembeli akan " +
        "melihat status Dikonfirmasi.",
      confirmLabel: "Ya, Konfirmasi",
      variant: "primary",
    };
  }

  if (action === "reject") {
    return {
      title: "Tolak pesanan?",
      description:
        `Pesanan ${code} dari ${buyerName} ` +
        "akan ditolak. Aksi ini hanya dapat " +
        "dilakukan jika diizinkan oleh aturan " +
        "status dan pembayaran di server.",
      confirmLabel: "Ya, Tolak Pesanan",
      variant: "danger",
    };
  }

  if (action === "ship") {
    return {
      title: "Tandai sudah dikirim?",
      description:
        `Pesanan ${code} akan diperbarui ` +
        "menjadi Disalurkan agar pembeli " +
        "mengetahui material sedang dikirim.",
      confirmLabel: "Ya, Tandai Dikirim",
      variant: "primary",
    };
  }

  if (action === "complete") {
    const pickup =
      order?.metode_kirim !== "Dikirim";

    return {
      title: pickup
        ? "Tandai sudah diambil?"
        : "Selesaikan pesanan?",
      description: pickup
        ? `Pesanan ${code} akan ditandai Selesai setelah material diambil oleh ${buyerName}.`
        : `Pesanan ${code} akan ditandai Selesai setelah material diterima pembeli.`,
      confirmLabel: pickup
        ? "Ya, Sudah Diambil"
        : "Ya, Selesaikan",
      variant: "primary",
    };
  }

  return null;
}
