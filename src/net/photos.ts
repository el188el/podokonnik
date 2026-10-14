// Фото настоящих растений: хранятся только на этом устройстве (IndexedDB),
// в сохранение игры попадают лишь id и дата снимка.

const DB = 'podokonnik-photos';
const STORE = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((ok, fail) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

export const savePhoto = (id: string, blob: Blob) => run('readwrite', (s) => s.put(blob, id));
export const loadPhoto = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id)).catch(() => undefined);
export const deletePhoto = (id: string) => run('readwrite', (s) => s.delete(id)).catch(() => undefined);

/** Уменьшить снимок до 900 px по длинной стороне — чтобы не забивать память. */
export async function compress(file: Blob, max = 900): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('toBlob'))), 'image/jpeg', 0.82));
}
