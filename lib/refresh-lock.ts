/** Browser-wide exclusion contains only coordination metadata, never tokens. */
export async function withRefreshLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined') return action();
  if (navigator.locks) return navigator.locks.request('gw-auth-refresh-v1', { signal: AbortSignal.timeout(15000) }, action);
  if (typeof indexedDB === 'undefined') throw new Error('REFRESH_COORDINATION_UNAVAILABLE');
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('gw-refresh-coordination-v1', 1);
    let finished=false;
    const timer = setTimeout(() => { finished=true; reject(new Error('REFRESH_COORDINATION_UNAVAILABLE')); }, 1500);
    request.onupgradeneeded = () => request.result.createObjectStore('leases', { keyPath: 'id' });
    request.onerror = request.onblocked = () => { finished=true;clearTimeout(timer); reject(new Error('REFRESH_COORDINATION_UNAVAILABLE')); };
    request.onsuccess = () => { if(finished){request.result.close();return}finished=true;clearTimeout(timer); resolve(request.result); };
  });
  const owner = crypto.randomUUID(), deadline = performance.now() + 15000;
  const lease = (release = false) => new Promise<boolean>((resolve, reject) => {
    const tx = database.transaction('leases', 'readwrite'), store = tx.objectStore('leases');
    let acquired = false;
    const request = store.get('refresh');
    request.onsuccess = () => {
      const row = request.result as { owner: string; until: number } | undefined;
      if (release) { if (row?.owner === owner) store.delete('refresh'); }
      else if (!row || row.until <= Date.now()) {
        store.put({ id: 'refresh', owner, until: Date.now() + 12000 }); acquired = true;
      }
    };
    tx.oncomplete = () => resolve(acquired);
    tx.onerror = tx.onabort = () => reject(new Error('REFRESH_COORDINATION_UNAVAILABLE'));
  });
  try {
    while (!(await lease())) {
      if (performance.now() >= deadline) throw new Error('REFRESH_COORDINATION_UNAVAILABLE');
      await new Promise(resolve => setTimeout(resolve, 80 + Math.floor(Math.random() * 80)));
    }
    try { return await action(); } finally { await lease(true); }
  } finally { database.close(); }
}
