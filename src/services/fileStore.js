// Tiny IndexedDB wrapper for uploaded PDF files (kept out of localStorage,
// which is only ~5 MB and would overflow with even a few PDFs).
// Frontend-only: files live in this browser, like the rest of the question bank.

const DB_NAME = "school-files";
const STORE = "files";

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async (mode, action) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const putFile = (id, blob) => run("readwrite", (store) => store.put(blob, id));
export const getFile = (id) => run("readonly", (store) => store.get(id));
export const deleteFile = (id) => run("readwrite", (store) => store.delete(id)).catch(() => {});
