const ACCENT_PRESETS = {
  rose: { accent: '#ff2e55', end: '#d9143c', hover: '#ff4769', soft: 'rgba(255, 46, 85, 0.14)', glow: '0 6px 20px rgba(255, 46, 85, 0.28)' },
  emerald: { accent: '#10b981', end: '#059669', hover: '#34d399', soft: 'rgba(16, 185, 129, 0.14)', glow: '0 6px 20px rgba(16, 185, 129, 0.28)' },
  indigo: { accent: '#6366f1', end: '#4f46e5', hover: '#818cf8', soft: 'rgba(99, 102, 241, 0.14)', glow: '0 6px 20px rgba(99, 102, 241, 0.28)' },
  cyan: { accent: '#06b6d4', end: '#0891b2', hover: '#22d3ee', soft: 'rgba(6, 182, 212, 0.14)', glow: '0 6px 20px rgba(6, 182, 212, 0.28)' },
  amber: { accent: '#f59e0b', end: '#d97706', hover: '#fbbf24', soft: 'rgba(245, 158, 11, 0.14)', glow: '0 6px 20px rgba(245, 158, 11, 0.28)' },
  violet: { accent: '#a855f7', end: '#9333ea', hover: '#c084fc', soft: 'rgba(168, 85, 247, 0.14)', glow: '0 6px 20px rgba(168, 85, 247, 0.28)' }
};

const I18N = {
  ru: {
    ready: 'Готово',
    currentTrack: 'Текущий трек',
    downloadTrack: 'Скачать трек',
    batchDownload: 'Пакетная загрузка',
    batchDesc: 'Скачивание открытого альбома или плейлиста.',
    scan: 'Найти',
    downloadAll: 'Скачать все',
    stop: 'Остановить',
    stopping: 'Остановка...',
    settingsTitle: 'Настройки',
    accentColor: 'Акцентный цвет',
    subfolderLabel: 'Подпапка в Загрузках',
    subfolderPlaceholder: 'Пусто: сразу в Загрузки',
    patternLabel: 'Шаблон имени',
    hqLabel: 'Приоритет 320 kbps (HQ)',
    oauthLabel: 'OAuth-доступ (полные треки)',
    oauthChecking: 'Проверка...',
    oauthConnected: 'Подключён',
    oauthDisconnected: 'Не подключён',
    connect: 'Подключить',
    refresh: 'Обновить',
    save: 'Сохранить',
    saved: 'Сохранено',
    credits: 'Сделал Mono no Aware',
    ymNotOpen: 'Яндекс Музыка не открыта',
    openYm: 'Откройте music.yandex.ru',
    trackNotFound: 'Трек не найден в плеере',
    startTrack: 'Запустите трек на вкладке',
    currentTrackFallback: 'Текущий трек',
    artistFallback: 'Исполнитель',
    trackReady: 'Трек готов к скачиванию',
    tabClosed: 'Вкладка закрыта',
    loading: 'Загрузка...',
    downloading: 'Скачивание...',
    sentToDownloads: 'Файл отправлен в Загрузки!',
    errorPrefix: 'Ошибка',
    failFallback: 'Сбой',
    searchingTracks: 'Поиск треков...',
    tracksNotFound: 'Треки не найдены',
    foundCount: 'Найдено',
    listEmpty: 'Список треков пуст',
    stoppedCount: 'Остановлено',
    downloadedWord: 'скачано',
    doneSummary: 'Завершено',
    errorsWord: 'ошибок',
    tracksUnit: 'треков',
    themeDark: 'Тема: Темная',
    themeLight: 'Тема: Светлая'
  },
  en: {
    ready: 'Ready',
    currentTrack: 'Current Track',
    downloadTrack: 'Download Track',
    batchDownload: 'Batch Download',
    batchDesc: 'Download all tracks from the open album or playlist.',
    scan: 'Scan',
    downloadAll: 'Download All',
    stop: 'Stop',
    stopping: 'Stopping...',
    settingsTitle: 'Settings',
    accentColor: 'Accent Color',
    subfolderLabel: 'Downloads Subfolder',
    subfolderPlaceholder: 'Empty: root Downloads folder',
    patternLabel: 'Filename Pattern',
    hqLabel: 'Prefer 320 kbps (HQ)',
    oauthLabel: 'OAuth Access (full tracks)',
    oauthChecking: 'Checking...',
    oauthConnected: 'Connected',
    oauthDisconnected: 'Not connected',
    connect: 'Connect',
    refresh: 'Refresh',
    save: 'Save',
    saved: 'Saved',
    credits: 'Made by Mono no Aware',
    ymNotOpen: 'Yandex Music is not open',
    openYm: 'Open music.yandex.ru',
    trackNotFound: 'No track detected in player',
    startTrack: 'Play a track on the tab',
    currentTrackFallback: 'Current Track',
    artistFallback: 'Artist',
    trackReady: 'Track ready to download',
    tabClosed: 'Tab was closed',
    loading: 'Loading...',
    downloading: 'Downloading...',
    sentToDownloads: 'Sent to Downloads!',
    errorPrefix: 'Error',
    failFallback: 'Failed',
    searchingTracks: 'Scanning tracks...',
    tracksNotFound: 'No tracks found',
    foundCount: 'Found',
    listEmpty: 'Track list is empty',
    stoppedCount: 'Stopped',
    downloadedWord: 'downloaded',
    doneSummary: 'Completed',
    errorsWord: 'errors',
    tracksUnit: 'tracks',
    themeDark: 'Theme: Dark',
    themeLight: 'Theme: Light'
  }
};

function applyAccentColor(colorKey) {
  const preset = ACCENT_PRESETS[colorKey] || ACCENT_PRESETS.rose;
  const root = document.documentElement.style;
  root.setProperty('--accent', preset.accent);
  root.setProperty('--accent-end', preset.end);
  root.setProperty('--accent-hover', preset.hover);
  root.setProperty('--accent-soft', preset.soft);
  root.setProperty('--accent-glow', preset.glow);
}

document.addEventListener('DOMContentLoaded', async () => {
  const langToggle = document.getElementById('langToggle');
  const themeToggle = document.getElementById('themeToggle');
  const settingsToggle = document.getElementById('settingsToggle');
  const btnBackToMain = document.getElementById('btnBackToMain');
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');

  const trackCover = document.getElementById('trackCover');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const bitrateBadge = document.getElementById('bitrateBadge');
  const btnDownloadCurrent = document.getElementById('btnDownloadCurrent');

  const playlistCountBadge = document.getElementById('playlistCountBadge');
  const btnScanPlaylist = document.getElementById('btnScanPlaylist');
  const btnDownloadBatch = document.getElementById('btnDownloadBatch');
  const batchBtnText = document.getElementById('batchBtnText');
  const batchProgressContainer = document.getElementById('batchProgressContainer');
  const batchProgressBar = document.getElementById('batchProgressBar');
  const batchProgressText = document.getElementById('batchProgressText');
  const batchProgressPercent = document.getElementById('batchProgressPercent');

  const colorSwatches = document.getElementById('colorSwatches');
  const settingSubfolder = document.getElementById('settingSubfolder');
  const settingPattern = document.getElementById('settingPattern');
  const settingHQ = document.getElementById('settingHQ');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const oauthStatusText = document.getElementById('oauthStatusText');
  const btnOAuthConnect = document.getElementById('btnOAuthConnect');
  const footerStatus = document.getElementById('footerStatus');

  let currentTrackData = null;
  let detectedPlaylist = [];
  let isBatchDownloading = false;
  let cancelBatchRequested = false;
  let activeLang = 'ru';
  let activeColor = 'rose';
  let isAuthorized = false;

  const t = (key) => (I18N[activeLang] && I18N[activeLang][key]) || I18N.ru[key] || key;

  function applyLanguage(lang) {
    activeLang = lang === 'en' ? 'en' : 'ru';
    document.documentElement.lang = activeLang;
    langToggle.textContent = activeLang.toUpperCase();

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    settingSubfolder.placeholder = t('subfolderPlaceholder');
    playlistCountBadge.textContent = `${detectedPlaylist.length} ${t('tracksUnit')}`;
    if (oauthStatusText) {
      oauthStatusText.textContent = isAuthorized ? t('oauthConnected') : t('oauthDisconnected');
    }
    if (btnOAuthConnect) {
      btnOAuthConnect.textContent = isAuthorized ? t('refresh') : t('connect');
    }
    if (!isBatchDownloading) {
      batchBtnText.textContent = t('downloadAll');
    }
    if (footerStatus.textContent === I18N.ru.ready || footerStatus.textContent === I18N.en.ready) {
      footerStatus.textContent = t('ready');
    }
  }

  function setStatus(msg, duration = 3000) {
    footerStatus.textContent = msg;
    if (duration > 0) {
      setTimeout(() => {
        if (footerStatus.textContent === msg) {
          footerStatus.textContent = t('ready');
        }
      }, duration);
    }
  }

  function setActiveSwatch(colorKey) {
    activeColor = ACCENT_PRESETS[colorKey] ? colorKey : 'rose';
    applyAccentColor(activeColor);
    colorSwatches.querySelectorAll('.swatch').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.color === activeColor);
    });
  }

  colorSwatches.addEventListener('click', async (e) => {
    const btn = e.target.closest('.swatch');
    if (!btn) return;
    const color = btn.dataset.color;
    setActiveSwatch(color);
    await chrome.storage.local.set({ accentColor: color });
  });

  langToggle.addEventListener('click', async () => {
    const next = activeLang === 'ru' ? 'en' : 'ru';
    applyLanguage(next);
    await chrome.storage.local.set({ lang: next });
    await fetchCurrentTrack();
  });

  themeToggle.addEventListener('click', async () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    await chrome.storage.local.set({ theme: next });
    setStatus(next === 'dark' ? t('themeDark') : t('themeLight'));
  });

  settingsToggle.addEventListener('click', () => {
    mainView.classList.remove('active');
    settingsView.classList.add('active');
  });

  btnBackToMain.addEventListener('click', () => {
    settingsView.classList.remove('active');
    mainView.classList.add('active');
  });

  async function loadSettings() {
    const settings = await chrome.storage.local.get(['theme', 'lang', 'accentColor', 'subfolder', 'namingPattern', 'preferHQ']);
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    setActiveSwatch(settings.accentColor || 'rose');
    applyLanguage(settings.lang || 'ru');

    if (settings.subfolder !== undefined) settingSubfolder.value = settings.subfolder;
    if (settings.namingPattern !== undefined) settingPattern.value = settings.namingPattern;
    if (settings.preferHQ !== undefined) settingHQ.checked = settings.preferHQ;

    chrome.runtime.sendMessage({ action: 'GET_AUTH_STATUS' }, (resp) => {
      isAuthorized = Boolean(resp && resp.authorized);
      if (oauthStatusText) oauthStatusText.textContent = isAuthorized ? t('oauthConnected') : t('oauthDisconnected');
      if (btnOAuthConnect) btnOAuthConnect.textContent = isAuthorized ? t('refresh') : t('connect');
    });
  }

  if (btnOAuthConnect) {
    btnOAuthConnect.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_AUTH_TAB' });
    });
  }

  btnSaveSettings.addEventListener('click', async () => {
    const subfolder = settingSubfolder.value.trim();
    const namingPattern = settingPattern.value;
    const preferHQ = settingHQ.checked;

    await chrome.storage.local.set({ subfolder, namingPattern, preferHQ, accentColor: activeColor, lang: activeLang });
    setStatus(t('saved'));
    settingsView.classList.remove('active');
    mainView.classList.add('active');
  });

  async function getActiveYmTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes('music.yandex.')) {
      return tab;
    }
    return null;
  }

  async function fetchCurrentTrack() {
    const tab = await getActiveYmTab();
    if (!tab) {
      trackTitle.textContent = t('ymNotOpen');
      trackArtist.textContent = t('openYm');
      btnDownloadCurrent.disabled = true;
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_CURRENT_TRACK_INFO' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.track) {
          trackTitle.textContent = t('trackNotFound');
          trackArtist.textContent = t('startTrack');
          btnDownloadCurrent.disabled = true;
          return;
        }

        const track = response.track;
        currentTrackData = track;
        trackTitle.textContent = track.title || t('currentTrackFallback');
        trackArtist.textContent = track.artist || t('artistFallback');
        if (track.cover) {
          trackCover.src = track.cover;
        }
        bitrateBadge.textContent = '320 kbps HQ';
        btnDownloadCurrent.disabled = false;
        setStatus(t('trackReady'));
      });
    } catch (e) {}
  }

  btnDownloadCurrent.addEventListener('click', async () => {
    const tab = await getActiveYmTab();
    if (!tab) {
      setStatus(t('tabClosed'));
      return;
    }

    btnDownloadCurrent.disabled = true;
    const labelEl = btnDownloadCurrent.querySelector('.btn-text');
    labelEl.textContent = t('loading');
    setStatus(t('downloading'));

    chrome.tabs.sendMessage(tab.id, { action: 'DOWNLOAD_CURRENT_IN_PAGE', data: currentTrackData }, (response) => {
      btnDownloadCurrent.disabled = false;
      labelEl.textContent = t('downloadTrack');

      if (chrome.runtime.lastError) {
        setStatus(`${t('errorPrefix')}: ${chrome.runtime.lastError.message}`, 4000);
      } else if (response && response.success) {
        setStatus(t('sentToDownloads'), 4000);
      } else {
        setStatus(`${t('errorPrefix')}: ${(response && response.error) || t('failFallback')}`, 4000);
      }
    });
  });

  async function scanPlaylist() {
    const tab = await getActiveYmTab();
    if (!tab) return;

    setStatus(t('searchingTracks'));
    btnScanPlaylist.disabled = true;

    chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_PLAYLIST_TRACKS' }, (response) => {
      btnScanPlaylist.disabled = false;
      if (chrome.runtime.lastError || !response || !response.tracks) {
        setStatus(t('tracksNotFound'));
        return;
      }

      detectedPlaylist = response.tracks;
      playlistCountBadge.textContent = `${detectedPlaylist.length} ${t('tracksUnit')}`;

      if (detectedPlaylist.length > 0) {
        btnDownloadBatch.disabled = false;
        setStatus(`${t('foundCount')}: ${detectedPlaylist.length}`);
      } else {
        btnDownloadBatch.disabled = true;
        setStatus(t('listEmpty'));
      }
    });
  }

  btnScanPlaylist.addEventListener('click', scanPlaylist);

  btnDownloadBatch.addEventListener('click', async () => {
    if (isBatchDownloading) {
      cancelBatchRequested = true;
      batchBtnText.textContent = t('stopping');
      return;
    }

    if (!detectedPlaylist || detectedPlaylist.length === 0) return;
    const tab = await getActiveYmTab();
    if (!tab) return;

    isBatchDownloading = true;
    cancelBatchRequested = false;
    btnScanPlaylist.disabled = true;
    batchBtnText.textContent = t('stop');
    batchProgressContainer.classList.remove('hidden');

    const total = detectedPlaylist.length;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < total; i++) {
      if (cancelBatchRequested) {
        setStatus(`${t('stoppedCount')} (${completed} ${t('downloadedWord')})`);
        break;
      }

      const track = detectedPlaylist[i];
      batchProgressText.textContent = `${i + 1} / ${total} - ${track.title || ''}`;
      const pct = Math.round(((i + 1) / total) * 100);
      batchProgressBar.style.width = `${pct}%`;
      batchProgressPercent.textContent = `${pct}%`;

      await new Promise(resolve => {
        chrome.tabs.sendMessage(tab.id, { action: 'DOWNLOAD_CURRENT_IN_PAGE', data: track }, (resp) => {
          if (resp && resp.success) completed++;
          else failed++;
          resolve();
        });
      });

      await new Promise(r => setTimeout(r, 650));
    }

    isBatchDownloading = false;
    cancelBatchRequested = false;
    btnScanPlaylist.disabled = false;
    btnDownloadBatch.disabled = false;
    batchBtnText.textContent = t('downloadAll');

    setStatus(`${t('doneSummary')}: ${completed} ${t('downloadedWord')}${failed > 0 ? `, ${t('errorsWord')}: ${failed}` : ''}`, 5000);
  });

  await loadSettings();
  await fetchCurrentTrack();
  await scanPlaylist();
});
