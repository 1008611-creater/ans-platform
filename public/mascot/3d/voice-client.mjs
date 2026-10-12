/** Recover one approved voice request. Browser retries never invent a second generation. */
export class VoiceClient {
  constructor({ fetchImpl = fetch, storage = null, now = Date.now, cryptoImpl = crypto, pause = abortableDelay } = {}) {
    // Native browser fetch must not receive the VoiceClient instance as its receiver.
    this.fetchImpl = (...args) => fetchImpl(...args); this.storage = storage; this.now = now; this.crypto = cryptoImpl; this.pause = pause; this.keys = new Map();
  }
  async audio(context, { text, voice = 'Chloe' }, signal) {
    if (!context?.actor || !context?.policyVersion || !text || voice !== 'Chloe') throw new Error('Voice requires an authenticated free policy.');
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    const identity = JSON.stringify([context.actor, context.policyVersion, voice, text]);
    const digest = [...new Uint8Array(await this.crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity)))].map(n => n.toString(16).padStart(2, '0')).join('');
    const storageKey = 'ans:voice:' + digest;
    let saved = this.keys.get(digest);
    if (!saved) try { saved = JSON.parse(this.storage?.getItem(storageKey) || 'null'); } catch { /* Memory remains available in private mode. */ }
    const valid = saved && /^[a-f0-9-]{36}$/i.test(saved.key) && Number.isFinite(saved.created) && saved.created <= this.now();
    const record = valid ? saved : { key: this.crypto.randomUUID(), created: this.now() };
    this.keys.set(digest, record);
    try { this.storage?.setItem(storageKey, JSON.stringify(record)); } catch { /* Keep the same request in memory. */ }
    const read = () => this.fetchImpl('/api/mascot/tts/requests/' + encodeURIComponent(record.key) + '?audio=1', {
      headers: { 'x-ans-actor': context.actor }, signal, cache: 'no-store', redirect: 'error',
    });
    let response;
    try {
      response = await this.fetchImpl('/api/mascot/tts', {
        method: 'POST', signal, redirect: 'error', headers: { 'Content-Type': 'application/json', 'x-ans-actor': context.actor },
        body: JSON.stringify({ text, voice, policyVersion: context.policyVersion, idempotencyKey: record.key }),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      response = await read();
    }
    for (let attempt = 0; attempt < 20 && response.status === 202; attempt++) {
      await this.pause(2500, signal); response = await read();
    }
    if (response.status === 410 || response.status === 422) {
      const rejected = response.status === 422 ? await response.clone().json().catch(() => null) : null;
      if (response.status === 410 || rejected?.state === 'RELEASED') {
        // The original is known terminal; only a later user action may create a fresh request.
        this.keys.delete(digest); try { this.storage?.removeItem(storageKey); } catch { /* Private mode. */ }
      }
    }
    if (!response.ok || response.status !== 200 || response.headers.get('content-type')?.split(';')[0] !== 'audio/wav') {
      throw new Error('Voice unavailable; the original request is retained.');
    }
    const expiresAt = Date.parse(response.headers.get('x-ans-voice-expires') || '');
    if (!Number.isFinite(expiresAt) || expiresAt <= this.now()) throw new Error('Voice replay has expired.');
    return { blob: await response.blob(), expiresAt };
  }
}

export function abortableDelay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Stopped', 'AbortError'));
    const aborted = () => { clearTimeout(timer); reject(new DOMException('Stopped', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', aborted); resolve(); }, milliseconds);
    signal?.addEventListener('abort', aborted, { once: true });
  });
}