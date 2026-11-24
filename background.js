if (typeof md5 === 'undefined' && typeof importScripts === 'function') {
  try {
    importScripts('lib/md5.js');
  } catch (e) {}
}

const SALT = 'XGRlBW9FXlekgbPrRHuSiA';
const SIGN_KEY = 'p93jhgh689SBReK6ghtw62qc';
const YM_CLIENT_ID = '23cabbbdc6cd418abb4b39c32c41195d';
let memOAuthToken = null;
let pendingAuthTabId = null;

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = changeInfo.url || (tab && tab.url) || '';
  if (!url || !url.includes('access_token=')) return;
  const m = url.match(/[#&]access_token=([^&]+)/);
  if (m && m[1]) {
    const token = decodeURIComponent(m[1]);
    memOAuthToken = token;
    try {
      await chrome.storage.local.set({ cachedOAuthToken: token });
    } catch (e) {}
    if (pendingAuthTabId === tabId) {
      pendingAuthTabId = null;
      try {
        await chrome.tabs.remove(tabId);
      } catch (e) {}
    }
  }
});

async function openOAuthTab() {
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YM_CLIENT_ID}`;
  const tab = await chrome.tabs.create({ url: authUrl, active: true });
  pendingAuthTabId = tab.id;
  return tab.id;
}

async function resolveOAuthTokenFromSession(forceRefresh = false) {
  if (!forceRefresh && memOAuthToken) return memOAuthToken;
  if (!forceRefresh) {
    try {
      const stored = await chrome.storage.local.get(['cachedOAuthToken']);
      if (stored && stored.cachedOAuthToken) {
        memOAuthToken = stored.cachedOAuthToken;
        return memOAuthToken;
      }
    } catch (e) {}
  } else {
    memOAuthToken = null;
    try { await chrome.storage.local.remove(['cachedOAuthToken']); } catch (e) {}
  }

  try {
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YM_CLIENT_ID}`;
    const resp = await fetch(authUrl, { credentials: 'include', redirect: 'follow' });
    if (resp && resp.url) {
      const m = resp.url.match(/[#&]access_token=([^&]+)/);
      if (m && m[1]) {
        memOAuthToken = decodeURIComponent(m[1]);
        try { await chrome.storage.local.set({ cachedOAuthToken: memOAuthToken }); } catch (e) {}
        return memOAuthToken;
      }
    }
    const html = await resp.text();
    const mHtml = html.match(/access_token=([A-Za-z0-9_.-]{20,})/);
    if (mHtml && mHtml[1]) {
      memOAuthToken = mHtml[1];
      try { await chrome.storage.local.set({ cachedOAuthToken: memOAuthToken }); } catch (e) {}
      return memOAuthToken;
    }
  } catch (e) {}

  return null;
}

async function signGetFileInfo(paramsStr) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SIGN_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(paramsStr));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, '');
}

async function resolveViaGetFileInfo(trackId, preferHQ, token) {
  if (!token) return null;
  const ts = Math.floor(Date.now() / 1000);
  const quality = preferHQ ? 'hq' : 'nq';
  const codecs = 'mp3';
  const transports = 'raw';
  const rawStr = `${ts}${trackId}${quality}${codecs}${transports}`.replace(/,/g, '');
  const sign = await signGetFileInfo(rawStr);

  const url = `https://api.music.yandex.net/get-file-info?ts=${ts}&trackId=${trackId}&quality=${quality}&codecs=${codecs}&transports=${transports}&sign=${encodeURIComponent(sign)}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `OAuth ${token}`,
        'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/5.25.2'
      }
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const info = json && (json.result && json.result.downloadInfo ? json.result.downloadInfo : json.result || json);
    if (info && info.url && info.preview !== true) {
      return { directUrl: info.url, bitrate: info.bitrate || (preferHQ ? 320 : 192) };
    }
  } catch (e) {}
  return null;
}

const DEFAULT_SETTINGS = {
  theme: 'dark',
  subfolder: '',
  namingPattern: '{artist} - {title}',
  preferHQ: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['theme', 'subfolder', 'namingPattern', 'preferHQ']);
  await chrome.storage.local.set({ ...DEFAULT_SETTINGS, ...existing });
});

function sanitizeFilename(name) {
  return (name || 'track')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFilename(pattern, metadata, subfolder) {
  let filename = (pattern || DEFAULT_SETTINGS.namingPattern)
    .replace(/\{artist\}/gi, metadata.artist || 'Unknown Artist')
    .replace(/\{title\}/gi, metadata.title || 'Unknown Track')
    .replace(/\{album\}/gi, metadata.album || 'Unknown Album')
    .replace(/\{trackId\}/gi, metadata.trackId || '');

  filename = sanitizeFilename(filename) + '.mp3';

  if (subfolder && subfolder.trim()) {
    const cleanFolder = sanitizeFilename(subfolder.trim());
    return `${cleanFolder}/${filename}`;
  }

  return filename;
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

function pickBestDownloadInfo(items, preferHQ = true) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const fullOnly = items.filter((it) => it && it.preview !== true);
  if (fullOnly.length === 0) return null;

  const mp3Items = fullOnly.filter((it) => !it.codec || it.codec === 'mp3');
  const pool = mp3Items.length > 0 ? mp3Items : fullOnly;
  return pool.slice().sort((a, b) => {
    const ba = Number(a.bitrateInKbps || a.bitrate || 0);
    const bb = Number(b.bitrateInKbps || b.bitrate || 0);
    return preferHQ ? bb - ba : ba - bb;
  })[0];
}

async function resolveDirectMp3Url(trackId, albumId, preferHQ = true, pageOrigin = 'https://music.yandex.ru', authToken = null) {
  if (!trackId || trackId === 'null' || trackId === 'undefined') {
    throw new Error('Не удалось определить ID трека');
  }

  const origin = pageOrigin && pageOrigin.startsWith('http') ? pageOrigin : 'https://music.yandex.ru';
  let token = authToken || (await resolveOAuthTokenFromSession(false));

  if (token) {
    const gfi = await resolveViaGetFileInfo(trackId, preferHQ, token);
    if (gfi && gfi.directUrl) return gfi;
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

  const urls = [];
  if (token) {
    urls.push(`https://api.music.yandex.net/tracks/${trackId}/download-info`);
  }
  for (const hq of [preferHQ ? 1 : 0, preferHQ ? 0 : 1]) {
    for (const ctx of contexts) {
      for (const p of pairs) {
        urls.push(`${origin}/api/v2.1/handlers/track/${p}/${ctx}/download/m?hq=${hq}&external-domain=music.yandex.ru&overembed=no&__t=${ts}`);
      }
    }
    urls.push(`${origin}/api/v2.1/handlers/track/${trackId}:${aid}/web-album-track/download-info`);
    urls.push(`${origin}/api/v2.1/handlers/track/${trackId}/track-download-info`);
  }
  if (!token) {
    urls.push(`https://api.music.yandex.net/tracks/${trackId}/download-info`);
  }

  let rawResult = null;
  let sawPreviewOnly = false;
  for (const u of urls) {
    try {
      const headers = {
        'Accept': 'application/json',
        'X-Retpath-Y': origin,
        'X-Requested-With': 'XMLHttpRequest',
        'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/5.25.2'
      };
      if (token && u.includes('api.music.yandex.net')) {
        headers['Authorization'] = `OAuth ${token}`;
      }

      let resp = await fetch(u, { headers, credentials: 'include' });
      if (resp.status === 401 && token && u.includes('api.music.yandex.net')) {
        token = await resolveOAuthTokenFromSession(true);
        if (token) {
          headers['Authorization'] = `OAuth ${token}`;
          resp = await fetch(u, { headers, credentials: 'include' });
        }
      }
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!data) continue;

      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data.result) ? data.result : null);

      if (list && list.length > 0) {
        const picked = pickBestDownloadInfo(list, preferHQ);
        if (picked) {
          rawResult = [picked];
          break;
        }
        sawPreviewOnly = true;
      } else if (data.src || data.downloadInfoUrl || (data.host && data.path && data.ts && data.s)) {
        if (data.preview === true) {
          sawPreviewOnly = true;
          continue;
        }
        rawResult = [data];
        break;
      }
    } catch (err) {}
  }

  if (!rawResult || rawResult.length === 0) {
    const err = new Error(sawPreviewOnly ? 'Нужна авторизация OAuth для полного трека (иначе только 30 сек)' : 'Аудиопоток не найден');
    err.needsAuth = sawPreviewOnly;
    throw err;
  }

  const selected = rawResult[0];
  if (selected.host && selected.path && selected.ts && selected.s) {
    const cleanPath = selected.path.startsWith('/') ? selected.path.slice(1) : selected.path;
    const sign = md5(SALT + cleanPath + selected.s);
    const directUrl = `https://${selected.host}/get-mp3/${sign}/${selected.ts}${selected.path.startsWith('/') ? selected.path : '/' + selected.path}`;
    return { directUrl, bitrate: selected.bitrateInKbps || selected.bitrate || 320 };
  }

  const infoUrl = selected.src || selected.downloadInfoUrl;
  if (!infoUrl) throw new Error('Дескриптор отсутствует');

  const xmlResp = await fetch(infoUrl, { credentials: 'include' });
  if (!xmlResp.ok) throw new Error(`HTTP ${xmlResp.status}`);

  const xmlText = await xmlResp.text();
  const { host, path, ts: t, s } = parseDownloadInfoXml(xmlText);

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const sign = md5(SALT + cleanPath + s);
  const directUrl = `https://${host}/get-mp3/${sign}/${t}${path.startsWith('/') ? path : '/' + path}`;

  return { directUrl, bitrate: selected.bitrateInKbps || selected.bitrate || 320 };
}

async function searchTrackMetadata(query, pageOrigin = 'https://music.yandex.ru') {
  const q = encodeURIComponent(query);
  const origin = pageOrigin && pageOrigin.startsWith('http') ? pageOrigin : 'https://music.yandex.ru';
  const endpoints = [
    `https://api.music.yandex.net/search?text=${q}&type=track&page=0`,
    `${origin}/handlers/music-search.jsx?text=${q}&type=tracks`
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-Retpath-Y': origin },
        credentials: 'include'
      });
      if (!resp.ok) continue;
      const json = await resp.json();
      const item =
        (json && json.result && json.result.tracks && json.result.tracks.results && json.result.tracks.results[0]) ||
        (json && json.tracks && json.tracks.items && json.tracks.items[0]);
      if (item && item.id) {
        return {
          trackId: String(item.id),
          albumId: item.albums && item.albums[0] && item.albums[0].id ? String(item.albums[0].id) : null
        };
      }
    } catch (e) {}
  }
  return null;
}

async function handleDownloadTrack(data) {
  const { trackId, albumId, title, artist, album, directUrl: preResolvedUrl, bitrate: preBitrate, origin, authToken } = data;
  if (!preResolvedUrl && !trackId) throw new Error('Не удалось определить ID трека');

  const settings = await chrome.storage.local.get(['subfolder', 'namingPattern', 'preferHQ']);
  const resolved = preResolvedUrl
    ? { directUrl: preResolvedUrl, bitrate: preBitrate || 320 }
    : await resolveDirectMp3Url(trackId, albumId, settings.preferHQ !== false, origin, authToken);
  const { directUrl, bitrate } = resolved;

  const targetFilename = formatFilename(
    settings.namingPattern || DEFAULT_SETTINGS.namingPattern,
    { artist, title, album, trackId },
    settings.subfolder || ''
  );

  return new Promise((resolve) => {
    try {
      chrome.downloads.download(
        {
          url: directUrl,
          filename: targetFilename,
          saveAs: false,
          conflictAction: 'uniquify'
        },
        downloadId => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, directUrl, filename: targetFilename, bitrate, error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: true, downloadId, filename: targetFilename, bitrate, directUrl });
          }
        }
      );
    } catch (err) {
      resolve({ success: false, directUrl, filename: targetFilename, bitrate, error: err.message });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_TRACK') {
    handleDownloadTrack(request.data)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'GET_DIRECT_URL') {
    chrome.storage.local.get(['preferHQ']).then((settings) => {
      return resolveDirectMp3Url(
        request.data.trackId,
        request.data.albumId,
        settings.preferHQ !== false,
        request.data.origin,
        request.data.authToken
      );
    })
      .then(res => sendResponse({ success: true, ...res }))
      .catch(err => sendResponse({ success: false, error: err.message, needsAuth: Boolean(err.needsAuth) }));
    return true;
  }

  if (request.action === 'OPEN_AUTH_TAB') {
    openOAuthTab()
      .then((tabId) => sendResponse({ success: true, tabId }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'GET_AUTH_STATUS') {
    resolveOAuthTokenFromSession(false)
      .then((token) => sendResponse({ authorized: Boolean(token) }))
      .catch(() => sendResponse({ authorized: false }));
    return true;
  }

  if (request.action === 'SEARCH_TRACK') {
    searchTrackMetadata(request.data.query, request.data.origin)
      .then(res => sendResponse({ success: true, track: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'PING') {
    sendResponse({ status: 'ok', version: '1.0.1' });
    return false;
  }
});
