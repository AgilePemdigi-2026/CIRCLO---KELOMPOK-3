// Penyimpanan sementara di browser: draf form (localStorage) dan hasil klasifikasi (sessionStorage).
const DRAFT_KEY = 'circlo:upload-draft';
const RESULT_KEY = 'circlo:classification';

function read(store, key) {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // kuota penuh atau storage diblokir
  }
}

export const loadDraft = () => (typeof window === 'undefined' ? null : read(window.localStorage, DRAFT_KEY));
export const saveDraft = (draft) => write(window.localStorage, DRAFT_KEY, draft);
export const clearDraft = () => window.localStorage.removeItem(DRAFT_KEY);

export const loadResult = () => (typeof window === 'undefined' ? null : read(window.sessionStorage, RESULT_KEY));
export const saveResult = (payload) => write(window.sessionStorage, RESULT_KEY, payload);
export const clearResult = () => window.sessionStorage.removeItem(RESULT_KEY);
