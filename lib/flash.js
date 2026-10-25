// Pesan sekali tampil yang dibawa ke halaman tujuan setelah redirect (mis. "Material uploaded successfully").
// Skenario SRS menuntut pesan terlihat DAN alamat halaman sudah benar, jadi redirect dilakukan langsung
// dan pesannya ditampilkan di halaman tujuan oleh komponen Navbar.
const KEY = 'circlo:flash';

export function setFlash(flash) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flash));
  } catch {
    /* abaikan */
  }
}

export function takeFlash() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
