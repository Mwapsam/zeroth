/* =========================================================
   ENTERTAINMENT MEDIA — IndexedDB storage + playback
   + Custom volume controls (mute, slider, keyboard)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. CONFIG ---------- */
  const DB_NAME    = "ZBS_EntertainmentDB";
  const DB_VERSION = 1;
  const STORE_META = "media_meta";
  const STORE_BLOB = "media_blobs";
  const ADMIN_KEY  = "zbs-admin-2026";
  const MAX_BYTES  = 100 * 1024 * 1024;

  const TYPES = ["cartoons", "music", "movies"];
  const VOLUME_KEY = "ZBS_ent_volume";      // remembered volume
  const MUTED_KEY  = "ZBS_ent_muted";       // remembered mute state

  /* ---------- 2. IndexedDB wrapper ---------- */
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_META)) {
          const store = db.createObjectStore(STORE_META, { keyPath: "id" });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_BLOB)) {
          db.createObjectStore(STORE_BLOB, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
    return dbPromise;
  }

  async function idbPut(storeName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => reject(tx.error);
    });
  }

  async function idbGet(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbGetAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbDelete(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => reject(tx.error);
    });
  }

  /* ---------- 3. State ---------- */
  let mediaCache = { cartoons: [], music: [], movies: [] };
  let activeUploadMode = "user";
  let pendingFile      = null;
  let currentObjectURL = null;

  /* ---------- 4. Helpers ---------- */
  const $  = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function humanSize(bytes) {
    if (!bytes) return "0 B";
    const u = ["B","KB","MB","GB"];
    let i = 0, n = bytes;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + " " + u[i];
  }

  function toast(msg, isError) {
    if (typeof window.toast === "function") {
      try { window.toast(msg); return; } catch (e) {}
    }
    const t = $("toast");
    if (t) {
      t.textContent = msg;
      t.hidden = false;
      t.classList.toggle("error", !!isError);
      setTimeout(() => { t.hidden = true; }, 2600);
    } else {
      console.log(msg);
    }
  }

  /* ---------- 5. Load all media ---------- */
  async function loadAll() {
    try {
      const all = await idbGetAll(STORE_META);
      mediaCache = { cartoons: [], music: [], movies: [] };
      all.forEach(item => {
        if (mediaCache[item.type]) mediaCache[item.type].push(item);
      });
      TYPES.forEach(t => {
        mediaCache[t].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      });
    } catch (e) {
      console.error("Failed to load media:", e);
      toast("⚠ Could not load library", true);
    }
  }

  /* ---------- 6. Render grids ---------- */
  function renderAll() { TYPES.forEach(renderGrid); }

  function renderGrid(type) {
    const grid  = $("grid-" + type);
    const empty = $("empty-" + type);
    const count = $("count" + type.charAt(0).toUpperCase() + type.slice(1));
    if (!grid) return;

    const items = mediaCache[type] || [];
    if (count) count.textContent = items.length;

    const q = (($("entSearchInput") && $("entSearchInput").value) || "").trim().toLowerCase();
    const filtered = q
      ? items.filter(it =>
          (it.title  || "").toLowerCase().includes(q) ||
          (it.artist || "").toLowerCase().includes(q))
      : items;

    if (!filtered.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    grid.innerHTML = filtered.map(it => {
      const badge = it.mime && it.mime.startsWith("video") ? "🎬" : "🎵";
      const cover = it.cover
        ? `<img class="ent-media-thumb" src="${esc(it.cover)}" alt="" loading="lazy" />`
        : `<div class="ent-media-thumb ent-media-thumb-placeholder">${badge}</div>`;

      return `
        <article class="ent-media-card" data-media-id="${esc(it.id)}" data-media-type="${esc(it.type)}">
          ${cover}
          <div class="ent-media-info">
            <span class="ent-media-title">${esc(it.title || "Untitled")}</span>
            ${it.artist ? `<span class="ent-media-artist">${esc(it.artist)}</span>` : ""}
            <span class="ent-media-meta">${badge} ${humanSize(it.size)}</span>
          </div>
          <button class="ent-media-play" data-play-id="${esc(it.id)}" aria-label="Play">▶</button>
          <button class="ent-media-delete" data-delete-id="${esc(it.id)}" aria-label="Delete" title="Delete">✕</button>
        </article>`;
    }).join("");
  }

  /* ---------- 7. Inject CSS ---------- */
  const css = `
    .ent-media-card{position:relative;display:flex;flex-direction:column;background:linear-gradient(180deg,#151b28,#121828);border:1px solid #232c3f;border-radius:14px;overflow:hidden;transition:.16s;cursor:pointer;}
    .ent-media-card:hover{transform:translateY(-3px);border-color:#6c5ce7;box-shadow:0 12px 26px rgba(0,0,0,.4);}
    .ent-media-thumb{width:100%;aspect-ratio:16/10;object-fit:cover;background:#0e1421;display:block;}
    .ent-media-thumb-placeholder{display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#4d586c;}
    .ent-media-info{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px;}
    .ent-media-title{font-size:.85rem;font-weight:700;color:#e9eefb;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
    .ent-media-artist{font-size:.72rem;color:#8b97ad;}
    .ent-media-meta{font-size:.68rem;color:#5f6b81;margin-top:2px;}
    .ent-media-play{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(108,92,231,.92);color:#fff;font-size:.85rem;cursor:pointer;display:grid;place-items:center;line-height:1;box-shadow:0 4px 14px rgba(108,92,231,.55);transition:.15s;}
    .ent-media-play:hover{background:#8b7bff;transform:scale(1.08);}
    .ent-media-delete{position:absolute;top:8px;left:8px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(239,68,68,.9);color:#fff;font-size:.72rem;font-weight:800;cursor:pointer;display:none;place-items:center;line-height:1;padding:0;}
    .ent-media-card:hover .ent-media-delete{display:grid;}
    .ent-media-delete:hover{background:#ef4444;}

    /* ---------- Player modal ---------- */
    .ent-player-overlay{position:fixed;inset:0;z-index:600;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,4,9,.88);backdrop-filter:blur(8px);}
    .ent-player-overlay.open{display:flex;animation:entFade .18s ease;}
    @keyframes entFade{from{opacity:0}to{opacity:1}}
    .ent-player-box{width:100%;max-width:900px;max-height:92vh;background:linear-gradient(180deg,#161d2c,#111725);border:1px solid #2e3a52;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.7);display:flex;flex-direction:column;}
    .ent-player-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #232c3f;}
    .ent-player-head h3{margin:0;font-size:1rem;font-weight:750;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .ent-player-head .ent-player-sub{font-size:.72rem;color:#8b97ad;font-weight:500;}
    .ent-player-close{width:32px;height:32px;border-radius:9px;border:1px solid #232c3f;background:#151b28;color:#8b97ad;font-size:1rem;cursor:pointer;display:grid;place-items:center;line-height:1;}
    .ent-player-close:hover{background:#243049;color:#fff;}
    .ent-player-stage{background:#000;display:flex;align-items:center;justify-content:center;min-height:260px;max-height:60vh;overflow:hidden;}
    .ent-player-stage video,
    .ent-player-stage audio{width:100%;max-height:60vh;display:block;background:#000;}
    .ent-player-stage audio{width:90%;margin:36px auto;}

    /* ---------- Custom control bar ---------- */
    .ent-player-controls{display:flex;align-items:center;gap:14px;padding:12px 18px;background:#0f1521;border-top:1px solid #232c3f;flex-wrap:wrap;}
    .ent-vol-btn{width:38px;height:38px;border-radius:10px;border:1px solid #232c3f;background:#151b28;color:#e9eefb;font-size:1rem;cursor:pointer;display:grid;place-items:center;line-height:1;transition:.15s;flex-shrink:0;}
    .ent-vol-btn:hover{background:#243049;border-color:#6c5ce7;color:#fff;}
    .ent-vol-btn:active{transform:scale(.95);}
    .ent-vol-btn.muted{color:#ef4444;border-color:#ef4444;}
    .ent-vol-wrap{display:flex;align-items:center;gap:10px;flex:1;min-width:180px;}
    .ent-vol-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:999px;background:#232c3f;outline:none;cursor:pointer;transition:.15s;}
    .ent-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:#6c5ce7;cursor:pointer;box-shadow:0 2px 8px rgba(108,92,231,.6);transition:.15s;}
    .ent-vol-slider::-webkit-slider-thumb:hover{background:#8b7bff;transform:scale(1.15);}
    .ent-vol-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#6c5ce7;cursor:pointer;border:0;box-shadow:0 2px 8px rgba(108,92,231,.6);}
    .ent-vol-slider::-moz-range-thumb:hover{background:#8b7bff;transform:scale(1.15);}
    .ent-vol-slider::-moz-range-track{height:6px;border-radius:999px;background:#232c3f;border:0;}
    .ent-vol-pct{font-size:.78rem;font-weight:700;color:#8b97ad;min-width:38px;text-align:right;font-variant-numeric:tabular-nums;}
    .ent-vol-pct.full{color:#22c55e;}
    .ent-vol-pct.zero{color:#ef4444;}
    .ent-player-info{padding:10px 18px 12px;font-size:.76rem;color:#5f6b81;border-top:1px solid #232c3f;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}

    /* Keyboard hint pills */
    .ent-kbd{display:inline-flex;align-items:center;gap:4px;background:#0e1421;border:1px solid #232c3f;padding:2px 7px;border-radius:6px;font-size:.7rem;color:#8b97ad;font-weight:600;margin-left:4px;}
    .ent-kbd b{color:#e9eefb;font-weight:800;}

    @media (max-width:560px){
      .ent-player-controls{gap:10px;padding:10px 14px;}
      .ent-vol-btn{width:34px;height:34px;font-size:.9rem;}
      .ent-vol-pct{font-size:.72rem;min-width:34px;}
    }
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- 8. Player modal (with volume bar) ---------- */
  const playerEl = document.createElement("div");
  playerEl.className = "ent-player-overlay";
  playerEl.id = "entPlayerOverlay";
  playerEl.innerHTML = `
    <div class="ent-player-box" role="dialog" aria-modal="true">
      <div class="ent-player-head">
        <div style="flex:1;min-width:0;">
          <h3 id="entPlayerTitle">Now Playing</h3>
          <div class="ent-player-sub" id="entPlayerSub"></div>
        </div>
        <button class="ent-player-close" id="entPlayerClose" aria-label="Close player">✕</button>
      </div>

      <div class="ent-player-stage" id="entPlayerStage"></div>

      <!-- ===== VOLUME CONTROL BAR ===== -->
      <div class="ent-player-controls">
        <button class="ent-vol-btn" id="entVolBtn" aria-label="Mute / Unmute" title="Mute / Unmute (M)">
          <span id="entVolIcon">🔊</span>
        </button>
        <div class="ent-vol-wrap">
          <input type="range" class="ent-vol-slider" id="entVolSlider" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
          <span class="ent-vol-pct" id="entVolPct">100%</span>
        </div>
      </div>

      <div class="ent-player-info">
        <span id="entPlayerInfo"></span>
        <span>
          <b>M</b> mute <span class="ent-kbd">↑↓ volume</span>
          <span class="ent-kbd">ESC close</span>
        </span>
      </div>
    </div>`;
  document.body.appendChild(playerEl);

  /* ---------- 9. Volume persistence ---------- */
  function loadVolume() {
    try {
      const v = parseFloat(localStorage.getItem(VOLUME_KEY));
      const m = localStorage.getItem(MUTED_KEY) === "1";
      if (isNaN(v) || v < 0 || v > 1) return { volume: 1, muted: false };
      return { volume: v, muted: m };
    } catch (e) {
      return { volume: 1, muted: false };
    }
  }

  function saveVolume(volume, muted) {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
      localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    } catch (e) {}
  }

  let savedVol = loadVolume();
  let lastVolume = savedVol.volume > 0 ? savedVol.volume : 1;
  let isMuted = savedVol.muted;

  /* ---------- 10. Volume UI ---------- */
  const volBtn    = $("entVolBtn");
  const volIcon   = $("entVolIcon");
  const volSlider = $("entVolSlider");
  const volPct    = $("entVolPct");

  function currentMedia() {
    return $("entPlayerMedia");
  }

  function iconForVolume(v, muted) {
    if (muted || v === 0) return "🔇";
    if (v < 0.34)         return "🔈";
    if (v < 0.67)         return "🔉";
    return "🔊";
  }

  function applyVolumeUI(volume, muted) {
    const effective = muted ? 0 : volume;

    if (volSlider) volSlider.value = String(effective);
    if (volPct) {
      volPct.textContent = Math.round(effective * 100) + "%";
      volPct.classList.toggle("zero", effective === 0);
      volPct.classList.toggle("full", effective === 1);
    }
    if (volIcon) volIcon.textContent = iconForVolume(volume, muted);
    if (volBtn)  volBtn.classList.toggle("muted", muted || volume === 0);
  }

  function applyVolumeToMedia() {
    const m = currentMedia();
    if (!m) return;
    m.volume = isMuted ? 0 : lastVolume;
    m.muted  = isMuted;
  }

  // Initial UI
  applyVolumeUI(lastVolume, isMuted);

  /* ---------- 11. Volume interactions ---------- */
  if (volBtn) {
    volBtn.addEventListener("click", () => {
      isMuted = !isMuted;
      applyVolumeToMedia();
      applyVolumeUI(lastVolume, isMuted);
      saveVolume(lastVolume, isMuted);
    });
  }

  if (volSlider) {
    volSlider.addEventListener("input", () => {
      const v = parseFloat(volSlider.value);
      lastVolume = v;
      isMuted = v === 0;
      applyVolumeToMedia();
      applyVolumeUI(lastVolume, isMuted);
      saveVolume(lastVolume, isMuted);
    });

    // double-click slider to reset to 100%
    volSlider.addEventListener("dblclick", () => {
      lastVolume = 1;
      isMuted = false;
      applyVolumeToMedia();
      applyVolumeUI(1, false);
      saveVolume(1, false);
    });
  }

  /* ---------- 12. Player open / close ---------- */
  function closePlayer() {
    playerEl.classList.remove("open");
    const stage = $("entPlayerStage");
    if (stage) stage.innerHTML = "";
    if (currentObjectURL) {
      URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = null;
    }
    document.body.style.overflow = "";
  }

  playerEl.addEventListener("click", (e) => {
    if (e.target === playerEl) closePlayer();
  });
  $("entPlayerClose").addEventListener("click", closePlayer);

  /* ---------- 13. Keyboard shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    // Only when player is open
    if (!playerEl.classList.contains("open")) return;

    // Ignore when typing in an input
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

    if (e.key === "Escape") {
      closePlayer();
      return;
    }

    if (e.key === "m" || e.key === "M") {
      isMuted = !isMuted;
      applyVolumeToMedia();
      applyVolumeUI(lastVolume, isMuted);
      saveVolume(lastVolume, isMuted);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      lastVolume = Math.min(1, Math.round((lastVolume + 0.05) * 100) / 100);
      isMuted = false;
      applyVolumeToMedia();
      applyVolumeUI(lastVolume, false);
      saveVolume(lastVolume, false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      lastVolume = Math.max(0, Math.round((lastVolume - 0.05) * 100) / 100);
      if (lastVolume === 0) isMuted = true;
      applyVolumeToMedia();
      applyVolumeUI(lastVolume, isMuted);
      saveVolume(lastVolume, isMuted);
      return;
    }
  });

  /* ---------- 14. Play media ---------- */
  async function playMedia(id) {
    try {
      const meta = await idbGet(STORE_META, id);
      const blobRec = await idbGet(STORE_BLOB, id);
      if (!meta || !blobRec || !blobRec.blob) {
        toast("⚠ File not found — re-upload this item", true);
        return;
      }

      if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = URL.createObjectURL(blobRec.blob);

      const stage = $("entPlayerStage");
      const mime = meta.mime || blobRec.blob.type || "";
      const isAudio = mime.startsWith("audio");

      stage.innerHTML = isAudio
        ? `<audio id="entPlayerMedia" controls autoplay src="${currentObjectURL}"></audio>`
        : `<video id="entPlayerMedia" controls autoplay playsinline src="${currentObjectURL}"></video>`;

      // Attach volume as soon as the element exists
      const m = $("entPlayerMedia");
      if (m) {
        m.volume = isMuted ? 0 : lastVolume;
        m.muted  = isMuted;
        // Keep custom slider in sync if the user uses native controls
        m.addEventListener("volumechange", () => {
          if (m.muted) {
            isMuted = true;
            applyVolumeUI(lastVolume, true);
          } else {
            isMuted = false;
            lastVolume = m.volume;
            applyVolumeUI(m.volume, false);
            saveVolume(m.volume, false);
          }
        });
      }

      $("entPlayerTitle").textContent = meta.title || "Untitled";
      $("entPlayerSub").textContent   = meta.artist || "";
      $("entPlayerInfo").textContent  = humanSize(meta.size) + (mime ? " · " + mime : "");

      playerEl.classList.add("open");
      document.body.style.overflow = "hidden";
    } catch (e) {
      console.error("Playback failed:", e);
      toast("⚠ Playback failed", true);
    }
  }

  /* ---------- 15. Grid click delegation ---------- */
  document.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-delete-id]");
    if (del) {
      e.stopPropagation();
      const id = del.getAttribute("data-delete-id");
      if (!confirm("Delete this item permanently?")) return;
      try {
        await idbDelete(STORE_META, id);
        await idbDelete(STORE_BLOB, id);
        await loadAll();
        renderAll();
        toast("🗑 Deleted");
      } catch (err) {
        toast("⚠ Delete failed", true);
      }
      return;
    }

    const card = e.target.closest("[data-media-id]");
    if (card) {
      playMedia(card.getAttribute("data-media-id"));
    }
  });

  /* ---------- 16. Search filter ---------- */
  const searchInput = $("entSearchInput");
  if (searchInput) searchInput.addEventListener("input", renderAll);

  /* ---------- 17. Upload modal plumbing ---------- */
  function openUploadModal(mode) {
    activeUploadMode = mode === "admin" ? "admin" : "user";
    const modal = $("entUploadModal");
    if (!modal) return;

    const adminGroup = $("adminKeyGroup");
    const uploadTitleEl = $("uploadTitle");
    const uploadIconEl  = $("uploadIcon");

    if (adminGroup) adminGroup.hidden = activeUploadMode !== "admin";
    if (uploadTitleEl) uploadTitleEl.textContent = activeUploadMode === "admin"
      ? "Upload Content (Admin)"
      : "Upload Content";
    if (uploadIconEl) uploadIconEl.className = activeUploadMode === "admin"
      ? "fas fa-lock"
      : "fas fa-cloud-upload-alt";

    const form = $("uploadForm");
    if (form) form.reset();
    pendingFile = null;
    updateFilePreview(null);
    resetProgress();
    const status = $("uploadStatus");
    if (status) status.hidden = true;

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeUploadModal() {
    const modal = $("entUploadModal");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- 18. File input + drag-drop ---------- */
  const dropZone = $("fileDropZone");
  const fileInput = $("uploadFile");

  function updateFilePreview(file) {
    const preview = $("filePreview");
    const nameEl  = $("fileName");
    const sizeEl  = $("fileSize");
    const iconEl  = $("fileIcon");
    if (!preview) return;

    if (!file) { preview.hidden = true; return; }
    preview.hidden = false;
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = humanSize(file.size);
    if (iconEl) {
      const t = file.type || "";
      iconEl.className = t.startsWith("video") ? "fas fa-video"
        : t.startsWith("audio") ? "fas fa-music"
        : t.startsWith("image") ? "fas fa-image"
        : "fas fa-file";
    }
  }

  function setPendingFile(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast("⚠ File too big (max 100 MB)", true);
      return;
    }
    pendingFile = file;
    updateFilePreview(file);
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) setPendingFile(f);
    });
  }

  if (dropZone) {
    dropZone.addEventListener("click", (e) => {
      if (e.target.closest("input")) return;
      if (fileInput) fileInput.click();
    });
    ["dragenter","dragover"].forEach(ev =>
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.add("drag-over");
      })
    );
    ["dragleave","drop"].forEach(ev =>
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove("drag-over");
      })
    );
    dropZone.addEventListener("drop", (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) setPendingFile(f);
    });
  }

  const removeBtn = $("fileRemoveBtn");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      pendingFile = null;
      if (fileInput) fileInput.value = "";
      updateFilePreview(null);
    });
  }

  /* ---------- 19. Progress UI ---------- */
  function resetProgress() {
    const wrap = $("uploadProgress");
    const bar  = $("uploadProgressBar");
    const txt  = $("uploadProgressText");
    if (wrap) wrap.hidden = true;
    if (bar)  bar.style.width = "0%";
    if (txt)  txt.textContent = "0%";
  }

  function setProgress(pct) {
    const wrap = $("uploadProgress");
    const bar  = $("uploadProgressBar");
    const txt  = $("uploadProgressText");
    if (wrap) wrap.hidden = false;
    if (bar)  bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
    if (txt)  txt.textContent = Math.round(pct) + "%";
  }

  function fileToDataURL(file) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = () => resolve("");
      r.readAsDataURL(file);
    });
  }

  /* ---------- 20. Upload submit ---------- */
  const uploadForm = $("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const statusEl = $("uploadStatus");
      const showStatus = (msg, isErr) => {
        if (!statusEl) return;
        statusEl.hidden = false;
        statusEl.textContent = msg;
        statusEl.classList.toggle("error", !!isErr);
        statusEl.classList.toggle("success", !isErr);
      };

      const type    = ($("uploadType") || {}).value || "cartoons";
      const title   = (($("uploadTitleInput") || {}).value || "").trim();
      const artist  = (($("uploadArtist") || {}).value || "").trim();
      const desc    = (($("uploadDescription") || {}).value || "").trim();
      const rights  = ($("uploadRights") || {}).checked;

      if (!pendingFile) { showStatus("⚠ Please choose a media file.", true); return; }
      if (!title)       { showStatus("⚠ Title is required.", true); return; }
      if (!rights)      { showStatus("⚠ Please confirm you own the rights.", true); return; }

      if (activeUploadMode === "admin") {
        const key = (($("uploadAdminKey") || {}).value || "").trim();
        if (key !== ADMIN_KEY) { showStatus("⚠ Invalid admin key.", true); return; }
      }

      const submitBtn = $("uploadSubmitBtn");
      const oldLabel  = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "⏳ Uploading…"; }

      try {
        showStatus("Saving file to device…", false);
        setProgress(15);

        const id = "media-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
        const mime = pendingFile.type || "application/octet-stream";

        const coverFile = ($("uploadCover") && $("uploadCover").files && $("uploadCover").files[0]) || null;
        let cover = "";
        if (coverFile && coverFile.size < 500 * 1024) {
          cover = await fileToDataURL(coverFile);
        }
        setProgress(45);

        await idbPut(STORE_BLOB, { id, blob: pendingFile });
        setProgress(80);

        await idbPut(STORE_META, {
          id, type, title, artist, desc, mime,
          size: pendingFile.size,
          cover,
          admin: activeUploadMode === "admin",
          createdAt: Date.now()
        });

        setProgress(100);
        showStatus("✅ Uploaded successfully.", false);

        await loadAll();
        renderAll();

        pendingFile = null;
        if (fileInput) fileInput.value = "";
        updateFilePreview(null);
        if ($("uploadCover")) $("uploadCover").value = "";

        setTimeout(() => {
          closeUploadModal();
          resetProgress();
          if (statusEl) statusEl.hidden = true;
        }, 700);

      } catch (err) {
        console.error("Upload failed:", err);
        showStatus("⚠ Upload failed: " + (err && err.message ? err.message : "unknown error"), true);
        resetProgress();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = oldLabel;
        }
      }
    });
  }

  /* ---------- 21. Action handlers ---------- */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");

    if (action === "openFrontendUpload") { e.preventDefault(); openUploadModal("user"); return; }
    if (action === "openBackendUpload")  { e.preventDefault(); openUploadModal("admin"); return; }
    if (action === "closeUploadModal")   { e.preventDefault(); closeUploadModal(); return; }
    if (action === "closeEntertainment") { closePlayer(); }
  });

  /* ---------- 22. Tab re-render ---------- */
  const tabsRoot = document.querySelector("#entertainmentModal .ent-tabs");
  if (tabsRoot) {
    tabsRoot.addEventListener("click", (e) => {
      const tab = e.target.closest(".ent-tab");
      if (!tab) return;
      const name = tab.getAttribute("data-tab");
      if (name === "cartoons" || name === "music" || name === "movies") {
        renderGrid(name);
      }
    });
  }

  /* ---------- 23. Init ---------- */
  async function init() {
    try {
      await loadAll();
      renderAll();
    } catch (e) {
      console.error("Entertainment init failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ZBSEntertainment = {
    openUploadModal,
    playMedia,
    loadAll,
    renderAll,
    getCache: () => mediaCache,
    getVolume: () => ({ volume: lastVolume, muted: isMuted })
  };
})();