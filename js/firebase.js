// Firebase bağlantısı. Bu anahtarlar gizli değildir (Firebase web uygulamaları
// için herkese açık olmaları normaldir); güvenliği database.rules.json sağlar.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDatabase, ref, onValue, get, set, update, push, remove, query, limitToLast, orderByChild,
  serverTimestamp, onDisconnect
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCOAmbaMQw6YLxXFPlFKgk1AJGHx-1BBrs',
  authDomain: 'besiktas-meydan-takip.firebaseapp.com',
  databaseURL: 'https://besiktas-meydan-takip-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'besiktas-meydan-takip',
  storageBucket: 'besiktas-meydan-takip.firebasestorage.app'
};

export const ADMIN_EPOSTA = 'osmanfarukterzi@gmail.com';

// Önizleme modu: sadece canlı site dışındaki adreslerde (Vercel deneme adresleri)
// "?onizleme" ile açılır. Girişsiz görüntüler ve veritabanına HİÇBİR ŞEY yazmaz.
export const ONIZLEME = typeof location !== 'undefined'
  && location.hostname !== 'sokak-takip.vercel.app'
  && new URLSearchParams(location.search).has('onizleme');
const yazmaYok = (ne) => { console.info('[Meydan önizleme] yazılmadı:', ne); return Promise.resolve(); };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export async function googleIleGiris() {
  const saglayici = new GoogleAuthProvider();
  saglayici.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, saglayici);
  } catch (e) {
    // Bazı telefon tarayıcıları açılır pencereyi engeller; yönlendirme ile dene.
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      await signInWithRedirect(auth, saglayici);
    } else if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export const cikisYap = () => signOut(auth);
export const oturumDinle = (fn) => onAuthStateChanged(auth, fn);

/** Bir yolu canlı dinler; dinlemeyi bırakan fonksiyonu döndürür. */
export function dinle(yol, fn, { son } = {}) {
  const r = son ? query(ref(db, yol), orderByChild('zaman'), limitToLast(son)) : ref(db, yol);
  return onValue(r, (snap) => fn(snap.val()), (hata) => {
    console.warn('[Meydan] okunamadı:', yol, hata && hata.code);
    fn(null);
  });
}

export const oku = async (yol) => (await get(ref(db, yol))).val();
export const yaz = (yol, deger) => (ONIZLEME ? yazmaYok({ [yol]: deger }) : set(ref(db, yol), deger));
export const toplu = (degisiklikler) => (ONIZLEME ? yazmaYok(degisiklikler) : update(ref(db), degisiklikler));
export const sil = (yol) => (ONIZLEME ? yazmaYok({ [yol]: null }) : remove(ref(db, yol)));
export const yeniAnahtar = (yol) => push(ref(db, yol)).key;
export const SUNUCU_ZAMANI = serverTimestamp;

export function cevrimiciOl(uid, bilgi) {
  if (ONIZLEME) return yazmaYok('cevrimici');
  const r = ref(db, `cevrimici/${uid}`);
  onDisconnect(r).remove();
  return set(r, { ...bilgi, zaman: serverTimestamp() });
}

export const cevrimiciBirak = (uid) => (ONIZLEME ? yazmaYok('cevrimici') : remove(ref(db, `cevrimici/${uid}`)));
