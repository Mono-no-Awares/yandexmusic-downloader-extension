const SALT = 'XGRlBW9FXlekgbPrRHuSiA';

const ACCENT_MAP = {
  rose: { accent: '#ff2e55', soft: 'rgba(255, 46, 85, 0.14)', border: 'rgba(255, 46, 85, 0.35)', glow: 'rgba(255, 46, 85, 0.24)' },
  emerald: { accent: '#10b981', soft: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.35)', glow: 'rgba(16, 185, 129, 0.24)' },
  indigo: { accent: '#6366f1', soft: 'rgba(99, 102, 241, 0.14)', border: 'rgba(99, 102, 241, 0.35)', glow: 'rgba(99, 102, 241, 0.24)' },
  cyan: { accent: '#06b6d4', soft: 'rgba(6, 182, 212, 0.14)', border: 'rgba(6, 182, 212, 0.35)', glow: 'rgba(6, 182, 212, 0.24)' },
  amber: { accent: '#f59e0b', soft: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.35)', glow: 'rgba(245, 158, 11, 0.24)' },
  violet: { accent: '#a855f7', soft: 'rgba(168, 85, 247, 0.14)', border: 'rgba(168, 85, 247, 0.35)', glow: 'rgba(168, 85, 247, 0.24)' }
};

let activeContentLang = 'ru';

function applyContentAccent(colorKey) {
  const c = ACCENT_MAP[colorKey] || ACCENT_MAP.rose;
  const root = document.documentElement.style;
  root.setProperty('--ym-dl-accent', c.accent);
  root.setProperty('--ym-dl-accent-soft', c.soft);
  root.setProperty('--ym-dl-accent-border', c.border);
  root.setProperty('--ym-dl-accent-glow', c.glow);
}

try {
  chrome.storage.local.get(['accentColor', 'lang'], (res) => {
    if (res && res.accentColor) applyContentAccent(res.accentColor);
    if (res && res.lang) activeContentLang = res.lang === 'en' ? 'en' : 'ru';
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.accentColor) applyContentAccent(changes.accentColor.newValue);
    if (changes.lang) activeContentLang = changes.lang.newValue === 'en' ? 'en' : 'ru';
  });
} catch (e) {}

const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`;
const ICON_SPINNER = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const ICON_ERROR = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;

async function decryptEncRawAndDownload(directUrl, encKeyHex, filename) {
  const resp = await fetch(directUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const encryptedBuf = await resp.arrayBuffer();

  const keyBytes = new Uint8Array(encKeyHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CTR' }, false, ['decrypt']);
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: new Uint8Array(16), length: 64 },
    cryptoKey,
    encryptedBuf
  );

  const blob = new Blob([decryptedBuf], { type: 'audio/mpeg' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }, 15000);
}

function extensionForCodec(codec) {
  if (!codec) return 'mp3';
  const c = String(codec).toLowerCase();
  if (c.includes('flac')) return 'flac';
  if (c.includes('aac') || c.includes('mp4')) return 'm4a';
  return 'mp3';
}

function sanitizeFilename(name) {
  return (name || 'track')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDownloadInfoXml(xmlText) {
  const hostMatch = xmlText.match(/<host>(.*?)<\/host>/i);
  const pathMatch = xmlText.match(/<path>(.*?)<\/path>/i);
  const tsMatch = xmlText.match(/<ts>(.*?)<\/ts>/i);
  const sMatch = xmlText.match(/<s>(.*?)<\/s>/i);

  if (!hostMatch || !pathMatch || !tsMatch || !sMatch) {
    throw new Error('XML structure invalid');
  }

  return {
    host: hostMatch[1].trim(),
    path: pathMatch[1].trim(),
    ts: tsMatch[1].trim(),
    s: sMatch[1].trim()
  };
}

function ensurePageBridge() {
  if (document.documentElement.dataset.ymDlBridgeInjected) return;
  document.documentElement.dataset.ymDlBridgeInjected = '1';
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('content/page-bridge.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
}

ensurePageBridge();

let uidCounter = 1;
function queryReactFromDom(el) {
  if (!el || !el.setAttribute) return null;
  const uid = `ym-${uidCounter++}`;
  let result = null;
  const handler = (e) => {
    if (e.detail && e.detail.uid === uid) {
      result = e.detail.result || null;
    }
  };
  document.addEventListener('ym-dl-query-dom-result', handler);
  el.setAttribute('data-ym-dl-uid', uid);
  document.dispatchEvent(new CustomEvent('ym-dl-query-dom', { detail: { uid } }));
  el.removeAttribute('data-ym-dl-uid');
  document.removeEventListener('ym-dl-query-dom-result', handler);
  return result;
}

function getBridgeState() {
  let state = { currentTrackId: null, currentAlbumId: null, streams: {}, lastStream: null };
  const handler = (e) => {
    if (e.detail) state = e.detail;
  };
  document.addEventListener('ym-dl-get-state-result', handler);
  document.dispatchEvent(new CustomEvent('ym-dl-get-state'));
  document.removeEventListener('ym-dl-get-state-result', handler);
  return state;
}

function sendRuntimeMessage(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(resp || { success: false });
        }
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

async function searchTrackFallback(artist, title) {
  const query = `${artist ? artist + ' ' : ''}${title || ''}`.trim();
  if (!query) return null;

  const bgRes = await sendRuntimeMessage({
    action: 'SEARCH_TRACK',
    data: { query, origin: location.origin }
  });
  if (bgRes && bgRes.success && bgRes.track && bgRes.track.trackId) {
    return bgRes.track;
  }

  try {
    const q = encodeURIComponent(query);
    const sResp = await fetch(`${location.origin}/handlers/music-search.jsx?text=${q}&type=tracks`, {
      credentials: 'include'
    });
    if (sResp.ok) {
      const sData = await sResp.json();
      const item = sData && sData.tracks && sData.tracks.items && sData.tracks.items[0];
      if (item && item.id) {
        return {
          trackId: String(item.id),
          albumId: item.albums && item.albums[0] ? String(item.albums[0].id) : null
        };
      }
    }
  } catch (e) {}

  return null;
}

async function resolveDirectMp3(trackId, albumId, isCurrentTrack = false) {
  const bridge = getBridgeState();
  if (trackId && bridge.streams && bridge.streams[String(trackId)]) {
    const cached = bridge.streams[String(trackId)];
    if (cached && cached.directUrl) {
      return {
        directUrl: cached.directUrl,
        bitrate: cached.bitrate || 320,
        encKey: cached.encKey || null,
        codec: cached.codec || 'mp3'
      };
    }
  }
  if (isCurrentTrack && bridge.lastStream && bridge.lastStream.directUrl) {
    if (!trackId || !bridge.lastStream.trackId || String(bridge.lastStream.trackId) === String(trackId)) {
      return {
        directUrl: bridge.lastStream.directUrl,
        bitrate: bridge.lastStream.bitrate || 320,
        encKey: bridge.lastStream.encKey || null,
        codec: bridge.lastStream.codec || 'mp3'
      };
    }
  }

  if (!trackId || trackId === 'null' || trackId === 'undefined') {
    const audio = document.querySelector('audio');
    if (audio && audio.src && audio.src.startsWith('http')) {
      return { directUrl: audio.src, bitrate: 320 };
    }
    throw new Error('Не удалось определить ID трека');
  }

  if (!albumId || albumId === '0' || albumId === 'undefined') {
    const pM = location.pathname.match(/\/album\/(\d+)/);
    if (pM) albumId = pM[1];
  }

  const bgAuthRes = await sendRuntimeMessage({
    action: 'GET_DIRECT_URL',
    data: { trackId, albumId, origin: location.origin, authToken: bridge.authToken || null }
  });
  if (bgAuthRes && bgAuthRes.success && bgAuthRes.directUrl) {
    return { directUrl: bgAuthRes.directUrl, bitrate: bgAuthRes.bitrate || 320 };
  }

  const ts = Date.now();
  const aid = albumId && albumId !== '0' ? albumId : '0';
  const contexts = [
    'web-album_track-track-track-main',
    'web-user_playlists-playlist-track-saved',
    'web-own_playlists-playlist-track-main',
    'web-feed-feed-track-track',
    'web-search-track-track',
    'web-main-track-track'
  ];

  const pairs = [
    aid !== '0' ? `${trackId}:${aid}` : null,
    `${trackId}:0`,
    `${trackId}`
  ].filter(Boolean);

  let rawData = null;

  for (const hq of [1, 0]) {
    for (const ctx of contexts) {
      for (const p of pairs) {
        const u = `${location.origin}/api/v2.1/handlers/track/${p}/${ctx}/download/m?hq=${hq}&external-domain=music.yandex.ru&overembed=no&__t=${ts}`;
        try {
          const resp = await fetch(u, {
            headers: {
              'Accept': 'application/json',
              'X-Retpath-Y': location.href,
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
          });
          if (!resp.ok) continue;
          const json = await resp.json();
          if (json) {
            if (Array.isArray(json)) {
              const full = json.filter((it) => it && it.preview !== true);
              if (full.length > 0) {
                rawData = full;
                break;
              }
            } else if ((json.src || json.downloadInfoUrl || (json.host && json.path && json.ts && json.s)) && json.preview !== true) {
              rawData = [json];
              break;
            }
          }
        } catch (e) {}
      }
      if (rawData) break;
    }
    if (rawData) break;

    for (const infoEndpoint of [
      `${location.origin}/api/v2.1/handlers/track/${trackId}:${aid}/web-album-track/download-info`,
      `${location.origin}/api/v2.1/handlers/track/${trackId}/track-download-info`
    ]) {
      try {
        const resp = await fetch(infoEndpoint, {
          headers: { 'Accept': 'application/json', 'X-Retpath-Y': location.origin },
          credentials: 'include'
        });
        if (!resp.ok) continue;
        const json = await resp.json();
        if (Array.isArray(json)) {
          const full = json.filter((it) => it && it.preview !== true);
          if (full.length > 0) {
            rawData = full;
            break;
          }
        } else if (json && (json.src || json.downloadInfoUrl || (json.host && json.path && json.ts && json.s)) && json.preview !== true) {
          rawData = [json];
          break;
        }
      } catch (e) {}
    }
    if (rawData) break;
  }

  if (!rawData || !rawData.length) {
    const bgRes = await sendRuntimeMessage({
      action: 'GET_DIRECT_URL',
      data: { trackId, albumId, origin: location.origin, authToken: bridge.authToken || null }
    });
    if (bgRes && bgRes.success && bgRes.directUrl) {
      return { directUrl: bgRes.directUrl, bitrate: bgRes.bitrate || 320 };
    }

    const audio = document.querySelector('audio');
    if (audio && audio.src && audio.src.startsWith('http')) {
      return { directUrl: audio.src, bitrate: 320 };
    }
    const err = new Error((bgRes && bgRes.error) || 'Аудиопоток не найден');
    if (bgRes && bgRes.needsAuth) err.needsAuth = true;
    throw err;
  }

  const item = rawData[0];

  if (item.host && item.path && item.ts && item.s) {
    const cP = item.path.startsWith('/') ? item.path.slice(1) : item.path;
    const sign = md5(SALT + cP + item.s);
    return {
      directUrl: `https://${item.host}/get-mp3/${sign}/${item.ts}${item.path.startsWith('/') ? item.path : '/' + item.path}`,
      bitrate: item.bitrateInKbps || item.bitrate || 320
    };
  }

  const infoUrl = item.src || item.downloadInfoUrl;
  if (!infoUrl) throw new Error('Дескриптор отсутствует');

  const xmlResp = await fetch(infoUrl, { credentials: 'include' });
  if (!xmlResp.ok) throw new Error(`HTTP ${xmlResp.status}`);

  const xmlText = await xmlResp.text();
  const { host, path, ts: t, s } = parseDownloadInfoXml(xmlText);

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const hash = md5(SALT + cleanPath + s);
  const directUrl = `https://${host}/get-mp3/${hash}/${t}${path.startsWith('/') ? path : '/' + path}`;

  return { directUrl, bitrate: item.bitrateInKbps || item.bitrate || 320 };
}

async function triggerDirectDownload(directUrl, filename) {
  try {
    const resp = await fetch(directUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(blobUrl);
    }, 15000);
  } catch (err) {
    const a = document.createElement('a');
    a.href = directUrl;
    a.download = filename;
    a.target = '_blank';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 2000);
  }
}

async function executeTrackDownload(trackData, buttonEl) {
  if (!trackData || (!trackData.trackId && !trackData.title && !trackData.isCurrent)) return;

  let originalSvg = '';
  if (buttonEl) {
    originalSvg = buttonEl.innerHTML;
    buttonEl.classList.add('is-loading');
    buttonEl.innerHTML = ICON_SPINNER;
    buttonEl.title = 'Подготовка...';
  }

  try {
    if (!trackData.trackId && trackData.title) {
      const found = await searchTrackFallback(trackData.artist, trackData.title);
      if (found) {
        trackData.trackId = found.trackId;
        if (!trackData.albumId && found.albumId) trackData.albumId = found.albumId;
      }
    }

    const { directUrl, bitrate, encKey, codec } = await resolveDirectMp3(
      trackData.trackId,
      trackData.albumId,
      Boolean(trackData.isCurrent)
    );
    const ext = extensionForCodec(codec);
    const filename = sanitizeFilename(`${trackData.artist || 'Artist'} - ${trackData.title || 'Track'}`) + `.${ext}`;

    if (encKey) {
      await decryptEncRawAndDownload(directUrl, encKey, filename);
    } else {
      const bgDownload = await sendRuntimeMessage({
        action: 'DOWNLOAD_TRACK',
        data: {
          trackId: trackData.trackId,
          albumId: trackData.albumId,
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          directUrl,
          bitrate,
          origin: location.origin
        }
      });

      if (!bgDownload || !bgDownload.success) {
        await triggerDirectDownload(directUrl, filename);
      }
    }

    if (buttonEl) {
      buttonEl.classList.remove('is-loading');
      buttonEl.classList.add('is-success');
      buttonEl.innerHTML = ICON_CHECK;
      buttonEl.title = `${bitrate} kbps`;

      setTimeout(() => {
        buttonEl.classList.remove('is-success');
        buttonEl.innerHTML = originalSvg;
        buttonEl.title = 'Скачать';
      }, 2000);
    }
  } catch (err) {
    if (buttonEl) {
      buttonEl.classList.remove('is-loading');
      buttonEl.classList.add('is-error');
      buttonEl.innerHTML = ICON_ERROR;
      buttonEl.title = err.message;

      setTimeout(() => {
        buttonEl.classList.remove('is-error');
        buttonEl.innerHTML = originalSvg;
        buttonEl.title = 'Скачать';
      }, 2500);
    }
    if (err && err.needsAuth) {
      if (confirm('Яндекс отдаёт только 30-сек превью без OAuth-токена.\nОткрыть страницу авторизации Яндекс (окно закроется само после подтверждения)?')) {
        sendRuntimeMessage({ action: 'OPEN_AUTH_TAB' });
      }
    } else {
      alert(`Ошибка: ${err.message}`);
    }
  }
}

function extractTrackInfoFromRow(row) {
  let trackId = null;
  let albumId = null;

  const links = row.querySelectorAll('a');
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const mC = href.match(/\/album\/(\d+)\/track\/(\d+)/);
    if (mC) {
      albumId = mC[1];
      trackId = mC[2];
      break;
    }
    const mT = href.match(/\/track\/(\d+)/);
    if (mT && !trackId) trackId = mT[1];
    const mA = href.match(/\/album\/(\d+)/);
    if (mA && !albumId) albumId = mA[1];
  }

  if (!trackId) {
    const itemId = row.getAttribute('data-item-id') || (row.dataset && row.dataset.itemId);
    if (itemId) {
      const parts = itemId.split(':');
      trackId = parts[0];
      if (parts[1]) albumId = parts[1];
    }
  }

  if (!trackId) {
    const dataB = row.getAttribute('data-b') || (row.dataset && row.dataset.b);
    if (dataB) {
      try {
        const p = JSON.parse(dataB);
        if (p.id) trackId = String(p.id);
        if (p.albumId) albumId = String(p.albumId);
      } catch (e) {}
    }
  }

  if (!trackId) {
    const reactInfo = queryReactFromDom(row);
    if (reactInfo && reactInfo.trackId) {
      trackId = reactInfo.trackId;
      if (!albumId && reactInfo.albumId) albumId = reactInfo.albumId;
    }
  }

  let title = '';
  const titleEl = row.querySelector('[class*="title"], [class*="Title"], .d-track__name, [data-qa="track-title"]');
  if (titleEl) title = titleEl.textContent.trim();

  let artist = '';
  const artistLink = row.querySelector('a[href*="/artist/"], [class*="artist"], [class*="Artist"], .d-track__meta');
  if (artistLink) artist = artistLink.textContent.trim();

  return { trackId, albumId, title, artist };
}

async function extractCurrentPlayingTrack() {
  let title = '';
  let artist = '';
  let album = '';
  let cover = '';
  let trackId = null;
  let albumId = null;

  const bridge = getBridgeState();
  if (bridge.currentTrackId) {
    trackId = bridge.currentTrackId;
    albumId = bridge.currentAlbumId || null;
  }

  if (navigator.mediaSession && navigator.mediaSession.metadata) {
    const m = navigator.mediaSession.metadata;
    title = m.title || '';
    artist = m.artist || '';
    album = m.album || '';
    if (m.artwork && m.artwork.length) {
      cover = m.artwork[m.artwork.length - 1].src || '';
    }
  }

  if (!title) {
    const titleEl = document.querySelector('[data-qa="player-track-name"], [class*="Track_title"], [class*="track__title"], [class*="Meta_title"], .track__title');
    if (titleEl) title = titleEl.textContent.trim();
  }

  if (!artist) {
    const artistEl = document.querySelector('[data-qa="player-track-artists"], [class*="Track_artists"], [class*="track__artists"], [class*="Meta_artist"], .track__artists');
    if (artistEl) artist = artistEl.textContent.trim();
  }

  if (!cover) {
    const imgEl = document.querySelector('.bar img, [class*="PlayerBar"] img, [class*="Bar_"] img, footer img');
    if (imgEl) cover = imgEl.src;
  }

  const playingRow = document.querySelector('[class*="playing"], [class*="isPlaying"], .d-track_playing, [data-playing="true"]');
  if (playingRow) {
    const info = extractTrackInfoFromRow(playingRow);
    if (info.trackId && !trackId) {
      trackId = info.trackId;
      albumId = info.albumId || albumId;
    }
    if (!title) title = info.title;
    if (!artist) artist = info.artist;
  }

  if (!trackId) {
    const playerEl = document.querySelector('[class*="PlayerBar"], [class*="Bar_"], .bar, footer');
    if (playerEl) {
      const reactInfo = queryReactFromDom(playerEl);
      if (reactInfo && reactInfo.trackId) {
        trackId = reactInfo.trackId;
        albumId = reactInfo.albumId || albumId;
        if (!title && reactInfo.title) title = reactInfo.title;
        if (!artist && reactInfo.artist) artist = reactInfo.artist;
      }
    }
  }

  if (!trackId) {
    const links = document.querySelectorAll('.bar a, [class*="PlayerBar"] a, [class*="Bar_"] a, footer a, [class*="player"] a');
    for (const a of links) {
      const h = a.getAttribute('href') || '';
      const mC = h.match(/\/album\/(\d+)\/track\/(\d+)/);
      if (mC) {
        albumId = mC[1];
        trackId = mC[2];
        break;
      }
      const mT = h.match(/\/track\/(\d+)/);
      if (mT && !trackId) trackId = mT[1];
      const mA = h.match(/\/album\/(\d+)/);
      if (mA && !albumId) albumId = mA[1];
    }
  }

  if (!trackId && title) {
    const found = await searchTrackFallback(artist, title);
    if (found) {
      trackId = found.trackId;
      if (!albumId && found.albumId) albumId = found.albumId;
    }
  }

  if (!title && !trackId) return null;

  return { trackId, albumId, title, artist, album, cover, isCurrent: true };
}

function createBtn(onClick, customClass = '') {
  const btn = document.createElement('button');
  btn.className = `ym-dl-btn ${customClass}`;
  btn.type = 'button';
  btn.title = 'Скачать';
  btn.innerHTML = ICON_DOWNLOAD;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick(btn);
  });
  return btn;
}

function injectRowButtons() {
  const rows = document.querySelectorAll(
    '.d-track, [data-qa="track-item"], [class*="CommonTrack_root"], [class*="TrackItem_root"]'
  );

  for (const row of rows) {
    if (row.querySelector('.ym-dl-btn')) continue;

    const info = extractTrackInfoFromRow(row);
    if (!info.trackId && !info.title) continue;

    const actionsContainer =
      row.querySelector('.d-track__actions') ||
      row.querySelector('.d-track__end') ||
      row.querySelector('[class*="actions"]') ||
      row.querySelector('[class*="TrackItem_actions"]') ||
      row.querySelector('[class*="CommonTrack_actions"]') ||
      row;

    const btn = createBtn((b) => {
      executeTrackDownload(info, b);
    });

    if (actionsContainer === row) {
      row.appendChild(btn);
    } else {
      actionsContainer.prepend(btn);
    }
  }
}

function injectPlayerBarButton() {
  if (document.querySelector('.ym-dl-btn-player')) return;

  const barActions =
    document.querySelector('.bar__actions') ||
    document.querySelector('.player-controls__actions') ||
    document.querySelector('[class*="PlayerBar_actions"]') ||
    document.querySelector('[class*="Controls_right"]') ||
    document.querySelector('.player-controls') ||
    document.querySelector('.bar__content');

  if (!barActions) return;

  const playerBtn = createBtn(async (b) => {
    const current = await extractCurrentPlayingTrack();
    if (current) {
      executeTrackDownload(current, b);
    }
  }, 'ym-dl-btn-player');

  barActions.appendChild(playerBtn);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_CURRENT_TRACK_INFO') {
    extractCurrentPlayingTrack().then(track => sendResponse({ track }));
    return true;
  }

  if (request.action === 'DOWNLOAD_CURRENT_IN_PAGE') {
    const trackPromise = request.data ? Promise.resolve(request.data) : extractCurrentPlayingTrack();
    trackPromise.then(track => {
      if (track) {
        return executeTrackDownload(track, null).then(() => sendResponse({ success: true }));
      }
      sendResponse({ success: false, error: 'Трек не найден' });
    }).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'GET_PAGE_PLAYLIST_TRACKS') {
    const tracks = [];
    const seen = new Set();
    const rows = document.querySelectorAll(
      '.d-track, [data-qa="track-item"], [class*="CommonTrack_root"], [class*="TrackItem_root"]'
    );
    for (const row of rows) {
      const info = extractTrackInfoFromRow(row);
      const key = info.trackId || info.title;
      if (key && !seen.has(key)) {
        seen.add(key);
        tracks.push(info);
      }
    }
    sendResponse({ tracks });
    return false;
  }
});

let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    injectRowButtons();
    injectPlayerBarButton();
  }, 150);
});

injectRowButtons();
injectPlayerBarButton();

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});
