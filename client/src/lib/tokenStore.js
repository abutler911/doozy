/**
 * Mirror the auth token into IndexedDB so the service worker can make
 * authenticated API calls from notification action buttons (service workers
 * can't read localStorage). Everything here fails soft: if IndexedDB is
 * unavailable the app still works — notification actions just won't
 * authenticate.
 */

const DB_NAME = "doozy";
const STORE = "kv";
const KEY = "token";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToken(token) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      if (token) tx.objectStore(STORE).put(token, KEY);
      else tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* no-op */
  }
}

export async function readToken() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      rq.onsuccess = () => resolve(rq.result || "");
      rq.onerror = () => reject(rq.error);
    });
  } catch {
    return "";
  }
}
