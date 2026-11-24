(function () {
  if (window.__ymDlBridgeInstalled) return;
  window.__ymDlBridgeInstalled = true;

  const state = {
    currentTrackId: null,
    currentAlbumId: null,
    authToken: null,
    streamsByTrackId: new Map(),
    lastStream: null
  };

  function captureAuthHeader(val) {
    if (!val || typeof val !== 'string') return;
    const m = val.match(/^(?:OAuth|Bearer)\s+([^\s]+)/i);
    if (m && m[1] && m[1].length > 10) {
      state.authToken = m[1];
    }
  }

  function scanHeadersForAuth(headers) {
    if (!headers) return;
    try {
      if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        captureAuthHeader(headers.get('Authorization') || headers.get('authorization'));
      } else if (Array.isArray(headers)) {
        for (const pair of headers) {
          if (pair && pair[0] && String(pair[0]).toLowerCase() === 'authorization') {
            captureAuthHeader(pair[1]);
          }
        }
      } else if (typeof headers === 'object') {
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === 'authorization') {
            captureAuthHeader(headers[k]);
          }
        }
      }
    } catch (e) {}
  }

  function scanStorageForToken() {
    if (state.authToken) return state.authToken;
    const storages = [];
    try { storages.push(localStorage); } catch (e) {}
    try { storages.push(sessionStorage); } catch (e) {}

    for (const store of storages) {
      try {
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          const val = store.getItem(key);
          if (!val) continue;

          const m = val.match(/\b(?:y0_[A-Za-z0-9_-]{20,}|AQAD[A-Za-z0-9_-]{20,}|AQAA[A-Za-z0-9_-]{20,})/);
          if (m) {
            state.authToken = m[0];
            return state.authToken;
          }

          if (val.startsWith('{') || val.startsWith('[')) {
            const jsonToken = val.match(/"(?:access_token|oauth_token|oauthToken|token)"\s*:\s*"([A-Za-z0-9_.-]{24,})"/);
            if (jsonToken && jsonToken[1]) {
              state.authToken = jsonToken[1];
              return state.authToken;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function recordStream(trackId, directUrl, bitrate, encKey = null, codec = 'mp3') {
    const entry = {
      trackId: trackId ? String(trackId) : null,
      directUrl,
      bitrate: bitrate || 320,
      encKey: encKey || null,
      codec: codec || 'mp3',
      ts: Date.now()
    };
    state.lastStream = entry;
    if (trackId) {
      state.streamsByTrackId.set(String(trackId), entry);
    }
  }

  function extractIdsFromUrl(url) {
    if (!url || typeof url !== 'string') return {};
    let trackId = null;
    let albumId = null;

    const mHandler = url.match(/\/handlers\/track\/(\d+)(?::(\d+))?/);
    if (mHandler) {
      trackId = mHandler[1];
      if (mHandler[2] && mHandler[2] !== '0') albumId = mHandler[2];
    }

    const mTracks = url.match(/\/tracks\/(\d+)\//);
    if (!trackId && mTracks) {
      trackId = mTracks[1];
    }

    try {
      const parsed = new URL(url, location.origin);
      const qTrackId = parsed.searchParams.get('trackId') || parsed.searchParams.get('track-id');
      if (!trackId && qTrackId && /^\d+$/.test(qTrackId)) {
        trackId = qTrackId;
      }
    } catch (e) {}

    return { trackId, albumId };
  }

  function inspectUrlAndResponse(url, text) {
    if (!url || typeof url !== 'string') return;

    const { trackId, albumId } = extractIdsFromUrl(url);
    if (trackId) {
      state.currentTrackId = trackId;
      if (albumId) state.currentAlbumId = albumId;
    }

    if (!text || typeof text !== 'string') return;

    if (url.includes('get-file-info') || url.includes('download-info') || url.includes('/download/m')) {
      try {
        const json = JSON.parse(text);
        const info = json && (json.result && json.result.downloadInfo ? json.result.downloadInfo : json.result || json);
        const streamUrl = info && (info.url || (Array.isArray(info.urls) && info.urls[0]));
        const isEncRaw = info && info.transport === 'encraw' && typeof info.key === 'string' && /^[0-9a-fA-F]{32}$/.test(info.key);
        if (
          info &&
          streamUrl &&
          typeof streamUrl === 'string' &&
          streamUrl.startsWith('http') &&
          !info.preview &&
          (info.transport !== 'encraw' || isEncRaw)
        ) {
          recordStream(
            trackId || state.currentTrackId,
            streamUrl,
            info.bitrate || 320,
            isEncRaw ? info.key : null,
            info.codec || 'mp3'
          );
        }
      } catch (e) {}
    }
  }

  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (init && init.headers) scanHeadersForAuth(init.headers);
      if (typeof Request !== 'undefined' && input instanceof Request) scanHeadersForAuth(input.headers);

      const resp = await origFetch.apply(this, arguments);
      try {
        if (
          url.includes('get-file-info') ||
          url.includes('download-info') ||
          url.includes('/download/m') ||
          url.includes('/handlers/track/')
        ) {
          if (resp && resp.ok && typeof resp.clone === 'function') {
            resp.clone().text().then((t) => inspectUrlAndResponse(url, t)).catch(() => {});
          }
        }
      } catch (e) {}
      return resp;
    };
  }

  const origOpen = XMLHttpRequest.prototype.open;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ymDlUrl = typeof url === 'string' ? url : '';
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (name && String(name).toLowerCase() === 'authorization') {
      captureAuthHeader(value);
    }
    return origSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    const url = this.__ymDlUrl || '';
    if (
      url.includes('get-file-info') ||
      url.includes('download-info') ||
      url.includes('/download/m') ||
      url.includes('/handlers/track/')
    ) {
      this.addEventListener('load', function () {
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            inspectUrlAndResponse(url, this.responseText);
          }
        } catch (e) {}
      });
    }
    return origSend.apply(this, arguments);
  };

  function pickTrackFromObject(obj, depth = 0, seen = new Set()) {
    if (!obj || typeof obj !== 'object' || depth > 5 || seen.has(obj)) return null;
    seen.add(obj);

    const candidate = obj.track || obj.entity || obj.data || obj;
    if (candidate && typeof candidate === 'object') {
      const rawId = candidate.id || candidate.trackId;
      if (rawId && /^\d+$/.test(String(rawId)) && (candidate.title || candidate.artists || candidate.albums || candidate.durationMs)) {
        const albumId = candidate.albums && candidate.albums[0] && candidate.albums[0].id
          ? String(candidate.albums[0].id)
          : (candidate.albumId ? String(candidate.albumId) : null);
        const artist = Array.isArray(candidate.artists)
          ? candidate.artists.map((a) => a && a.name).filter(Boolean).join(', ')
          : (candidate.artist || '');
        return {
          trackId: String(rawId),
          albumId,
          title: candidate.title || '',
          artist
        };
      }
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < Math.min(obj.length, 6); i++) {
        const res = pickTrackFromObject(obj[i], depth + 1, seen);
        if (res) return res;
      }
      return null;
    }

    const priorityKeys = ['track', 'entity', 'props', 'memoizedProps', 'children', 'item', 'data', 'trackData'];
    for (const key of priorityKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] && typeof obj[key] === 'object') {
        const res = pickTrackFromObject(obj[key], depth + 1, seen);
        if (res) return res;
      }
    }
    return null;
  }

  function extractFromReactNode(el) {
    let cur = el;
    for (let step = 0; step < 6 && cur; step++) {
      const keys = Object.keys(cur);
      for (const k of keys) {
        if (k.startsWith('__reactProps$') || k.startsWith('__reactFiber$')) {
          const val = cur[k];
          if (k.startsWith('__reactFiber$')) {
            let fiber = val;
            for (let f = 0; f < 8 && fiber; f++) {
              const found = pickTrackFromObject(fiber.memoizedProps, 0);
              if (found) return found;
              fiber = fiber.return;
            }
          } else {
            const found = pickTrackFromObject(val, 0);
            if (found) return found;
          }
        }
      }
      cur = cur.parentElement;
    }
    return null;
  }

  document.addEventListener('ym-dl-query-dom', (e) => {
    const detail = e.detail || {};
    const uid = detail.uid;
    if (!uid) return;
    const el = document.querySelector(`[data-ym-dl-uid="${uid}"]`);
    const result = el ? extractFromReactNode(el) : null;
    document.dispatchEvent(new CustomEvent('ym-dl-query-dom-result', {
      detail: { uid, result }
    }));
  });

  document.addEventListener('ym-dl-get-state', () => {
    const now = Date.now();
    const streams = {};
    for (const [tid, entry] of state.streamsByTrackId.entries()) {
      if (now - entry.ts < 45000) {
        streams[tid] = entry;
      }
    }
    const lastStream = state.lastStream && (now - state.lastStream.ts < 45000)
      ? state.lastStream
      : null;
    document.dispatchEvent(new CustomEvent('ym-dl-get-state-result', {
      detail: {
        currentTrackId: state.currentTrackId,
        currentAlbumId: state.currentAlbumId,
        authToken: state.authToken || scanStorageForToken(),
        streams,
        lastStream
      }
    }));
  });
})();
