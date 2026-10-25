/* =========================================================
   ENTERTAINMENT HUB — Sports + TV Stations extension
   Drop this file in AFTER js/entertainment-upload.js
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. INJECT CSS ---------- */
  const css = `
    .ent-sports-toolbar, .ent-tv-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;}
    .ent-sports-search, .ent-tv-search{position:relative;flex:1 1 220px;}
    .ent-sports-search i, .ent-tv-search i{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#7a86a0;font-size:.85rem;}
    .ent-sports-search input, .ent-tv-search input{width:100%;padding:10px 12px 10px 34px;border-radius:10px;border:1px solid #2b3346;background:#0e1421;color:#e9eefb;font-size:.85rem;outline:none;font-family:inherit;}
    .ent-sports-search input:focus, .ent-tv-search input:focus{border-color:#6c5ce7;box-shadow:0 0 0 3px rgba(108,92,231,.2);}
    .ent-sports-count{font-size:.8rem;color:#8b97ad;font-weight:600;white-space:nowrap;}
    .ent-sports-count strong{color:#e9eefb;}
    .ent-tv-add-btn{padding:10px 16px;border-radius:10px;border:1px solid transparent;background:linear-gradient(135deg,#6c5ce7,#8b7bff);color:#fff;font-weight:700;font-size:.82rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-family:inherit;box-shadow:0 6px 16px rgba(108,92,231,.35);transition:.16s;}
    .ent-tv-add-btn:hover{filter:brightness(1.1);transform:translateY(-1px);}
    .ent-sports-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
    .ent-sport-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:16px 10px;border-radius:14px;border:1px solid #232c3f;background:linear-gradient(180deg,#151b28,#121828);color:#e9eefb;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:600;text-align:center;transition:.16s;min-height:96px;position:relative;overflow:hidden;}
    .ent-sport-tile::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(108,92,231,.18),transparent 55%);opacity:0;transition:opacity .18s;pointer-events:none;}
    .ent-sport-tile:hover{transform:translateY(-3px);border-color:#6c5ce7;background:linear-gradient(180deg,#1b2333,#141b2b);box-shadow:0 12px 26px rgba(0,0,0,.4);}
    .ent-sport-tile:hover::after{opacity:1;}
    .ent-sport-tile:active{transform:translateY(-1px);}
    .ent-sport-tile:focus-visible{outline:2px solid #00d2ff;outline-offset:2px;}
    .ent-sport-emoji{font-size:1.7rem;line-height:1;filter:drop-shadow(0 3px 8px rgba(108,92,231,.4));}
    .ent-sport-name{line-height:1.25;}
    .ent-tv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;}
    .ent-tv-card{position:relative;display:flex;align-items:center;gap:10px;padding:12px 13px;border-radius:13px;border:1px solid #232c3f;background:linear-gradient(180deg,#151b28,#121828);color:#e9eefb;cursor:pointer;font-family:inherit;font-size:.83rem;font-weight:600;text-align:left;transition:.16s;overflow:hidden;}
    .ent-tv-card:hover{transform:translateY(-3px);border-color:#00d2ff;background:linear-gradient(180deg,#1b2333,#141b2b);box-shadow:0 12px 26px rgba(0,0,0,.4);}
    .ent-tv-card:active{transform:translateY(-1px);}
    .ent-tv-card:focus-visible{outline:2px solid #00d2ff;outline-offset:2px;}
    .ent-tv-emoji{font-size:1.35rem;line-height:1;width:30px;text-align:center;flex-shrink:0;}
    .ent-tv-label{line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;}
    .ent-tv-tag{position:absolute;top:6px;right:7px;font-size:.56rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;padding:2px 6px;border-radius:6px;background:rgba(108,92,231,.22);color:#b6a9ff;border:1px solid rgba(108,92,231,.4);}
    .ent-tv-tag.live{background:rgba(239,68,68,.18);color:#ff9b9b;border-color:rgba(239,68,68,.4);}
    .ent-tv-tag.vod{background:rgba(34,197,94,.16);color:#86efac;border-color:rgba(34,197,94,.36);}
    .ent-tv-tag.app{background:rgba(245,158,11,.16);color:#fcd34d;border-color:rgba(245,158,11,.38);}
    .ent-tv-card.custom{border-style:dashed;}
    .ent-tv-remove{position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(239,68,68,.85);color:#fff;font-size:.7rem;font-weight:800;cursor:pointer;display:none;align-items:center;justify-content:center;line-height:1;padding:0;}
    .ent-tv-card.custom:hover .ent-tv-remove{display:flex;}
    .ent-tv-remove:hover{background:#ef4444;}
    /* Add-station modal */
    .ent-addtv-modal{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,7,13,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
    .ent-addtv-modal[hidden]{display:none;}
    .ent-addtv-container{width:100%;max-width:440px;max-height:88vh;overflow-y:auto;background:linear-gradient(180deg,#161d2c,#111725);border:1px solid #2e3a52;border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,.5);animation:entPop .22s cubic-bezier(.2,.8,.3,1);}
    @keyframes entPop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
    .ent-addtv-header{display:flex;align-items:center;gap:10px;padding:16px 20px 14px;border-bottom:1px solid #232c3f;position:sticky;top:0;background:linear-gradient(180deg,#161d2c,#151b29);border-radius:20px 20px 0 0;z-index:2;}
    .ent-addtv-title{display:flex;align-items:center;gap:10px;font-weight:750;font-size:1rem;}
    .ent-addtv-title i{color:#6c5ce7;font-size:1.1rem;}
    .ent-addtv-header .window-close-btn{margin-left:auto;}
    .ent-addtv-body{padding:18px 20px 8px;}
    .ent-addtv-field{margin-bottom:14px;}
    .ent-addtv-field label{display:block;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8b97ad;margin-bottom:6px;}
    .ent-addtv-field input, .ent-addtv-field select{width:100%;padding:11px 13px;border-radius:11px;border:1px solid #232c3f;background:#0e1421;color:#e9eefb;font-size:.88rem;font-family:inherit;outline:none;transition:.16s;}
    .ent-addtv-field input:focus, .ent-addtv-field select:focus{border-color:#6c5ce7;box-shadow:0 0 0 3px rgba(108,92,231,.2);}
    .ent-emoji-picker{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
    .ent-emoji-picker button{width:32px;height:32px;border-radius:8px;border:1px solid #232c3f;background:#151b28;cursor:pointer;font-size:.95rem;display:grid;place-items:center;padding:0;transition:.15s;}
    .ent-emoji-picker button:hover{border-color:#6c5ce7;transform:translateY(-2px);}
    .ent-emoji-picker button.active{border-color:#00d2ff;background:rgba(0,210,255,.12);}
    .ent-addtv-actions{display:flex;gap:10px;padding:8px 20px 20px;}
    .ent-tv-submit, .ent-tv-cancel{flex:1;padding:12px 16px;border-radius:12px;border:1px solid transparent;font-family:inherit;font-size:.86rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:.16s;}
    .ent-tv-submit{background:linear-gradient(135deg,#6c5ce7,#8b7bff);color:#fff;box-shadow:0 8px 20px rgba(108,92,231,.35);}
    .ent-tv-submit:hover{filter:brightness(1.1);transform:translateY(-1px);}
    .ent-tv-cancel{background:#151b28;border-color:#232c3f;color:#e9eefb;}
    .ent-tv-cancel:hover{background:#222c40;}
    .ent-addtv-status{margin-top:6px;font-size:.8rem;padding:8px 12px;border-radius:9px;background:rgba(108,92,231,.12);color:#b6a9ff;border:1px solid rgba(108,92,231,.3);}
    .ent-addtv-status.err{background:rgba(239,68,68,.12);color:#ff9b9b;border-color:rgba(239,68,68,.35);}
    @media (max-width:560px){
      .ent-sports-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));}
      .ent-sport-tile{min-height:86px;padding:12px 8px;font-size:.76rem;}
      .ent-sport-emoji{font-size:1.45rem;}
      .ent-tv-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));}
    }
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- 2. DATA ---------- */
  const SPORTS = [
    { id:"football",        name:"Football / Soccer",  emoji:"⚽" },
    { id:"american-football", name:"American Football", emoji:"🏈" },
    { id:"basketball",      name:"Basketball",          emoji:"🏀" },
    { id:"baseball",        name:"Baseball",            emoji:"⚾" },
    { id:"cricket",         name:"Cricket",             emoji:"🏏" },
    { id:"tennis",          name:"Tennis",              emoji:"🎾" },
    { id:"golf",            name:"Golf",                emoji:"⛳" },
    { id:"ice-hockey",      name:"Ice Hockey",          emoji:"🏒" },
    { id:"rugby",           name:"Rugby",               emoji:"🏉" },
    { id:"boxing",          name:"Boxing",              emoji:"🥊" },
    { id:"mma-ufc",         name:"MMA / UFC",           emoji:"🥋" },
    { id:"formula-1",       name:"Formula 1",           emoji:"🏎️" },
    { id:"motorsport",      name:"Motorsport / MotoGP", emoji:"🏍️" },
    { id:"cycling",         name:"Cycling",             emoji:"🚴" },
    { id:"athletics",       name:"Athletics",           emoji:"🏃" },
    { id:"volleyball",      name:"Volleyball",          emoji:"🏐" },
    { id:"beach-volleyball",name:"Beach Volleyball",    emoji:"🏖️" },
    { id:"badminton",       name:"Badminton",           emoji:"🏸" },
    { id:"table-tennis",    name:"Table Tennis",        emoji:"🏓" },
    { id:"swimming",        name:"Swimming",            emoji:"🏊" },
    { id:"wrestling",       name:"Wrestling",           emoji:"🤼" },
    { id:"esports",         name:"Esports",             emoji:"🎮" },
    { id:"horse-racing",    name:"Horse Racing",        emoji:"🐎" },
    { id:"darts",           name:"Darts",               emoji:"🎯" },
    { id:"snooker",         name:"Snooker / Billiards", emoji:"🎱" },
    { id:"handball",        name:"Handball",            emoji:"🤾" },
    { id:"netball",         name:"Netball",             emoji:"🥅" },
    { id:"skiing",          name:"Skiing",              emoji:"⛷️" },
    { id:"snowboarding",    name:"Snowboarding",        emoji:"🏂" },
    { id:"surfing",         name:"Surfing",             emoji:"🏄" },
    { id:"skateboarding",   name:"Skateboarding",       emoji:"🛹" },
    { id:"gymnastics",      name:"Gymnastics",          emoji:"🤸" },
    { id:"rowing",          name:"Rowing",              emoji:"🚣" },
    { id:"sailing",         name:"Sailing",             emoji:"⛵" },
    { id:"archery",         name:"Archery",             emoji:"🏹" },
    { id:"shooting",        name:"Shooting",            emoji:"🎯" },
    { id:"judo",            name:"Judo",                emoji:"🥋" },
    { id:"taekwondo",       name:"Taekwondo",           emoji:"🥋" },
    { id:"karate",          name:"Karate",              emoji:"🥋" },
    { id:"weightlifting",   name:"Weightlifting",       emoji:"🏋️" },
    { id:"pickleball",      name:"Pickleball",          emoji:"🎾" },
    { id:"squash",          name:"Squash",              emoji:"🎾" },
    { id:"water-polo",      name:"Water Polo",          emoji:"🤽" },
    { id:"triathlon",       name:"Triathlon",           emoji:"🏅" },
    { id:"climbing",        name:"Sport Climbing",      emoji:"🧗" },
    { id:"equestrian",      name:"Equestrian",          emoji:"🐴" },
    { id:"fencing",         name:"Fencing",             emoji:"🤺" },
    { id:"curling",         name:"Curling",             emoji:"🥌" },
    { id:"softball",        name:"Softball",            emoji:"🥎" },
    { id:"lacrosse",        name:"Lacrosse",            emoji:"🥍" },
    { id:"bowling",         name:"Bowling",             emoji:"🎳" }
  ];

  const TV_STATIONS = [
    { id:"netflix",     name:"Netflix",            emoji:"🎬", type:"streaming" },
    { id:"moviebox",    name:"MovieBox",           emoji:"🎥", type:"streaming" },
    { id:"prime",       name:"Amazon Prime Video", emoji:"📦", type:"streaming" },
    { id:"disney",      name:"Disney+",            emoji:"🏰", type:"streaming" },
    { id:"hulu",        name:"Hulu",               emoji:"📺", type:"streaming" },
    { id:"max",         name:"Max / HBO",          emoji:"🎞️", type:"streaming" },
    { id:"apple-tv",    name:"Apple TV+",          emoji:"🍎", type:"streaming" },
    { id:"paramount",   name:"Paramount+",         emoji:"⭐", type:"streaming" },
    { id:"peacock",     name:"Peacock",            emoji:"🦚", type:"streaming" },
    { id:"youtube",     name:"YouTube",            emoji:"▶️", type:"streaming" },
    { id:"showmax",     name:"Showmax",            emoji:"🎭", type:"streaming" },
    { id:"zee5",        name:"ZEE5",               emoji:"🇮🇳", type:"streaming" },
    { id:"hotstar",     name:"Hotstar",            emoji:"⚡", type:"streaming" },
    { id:"espn",        name:"ESPN",               emoji:"🏟️", type:"live" },
    { id:"sky-sports",  name:"Sky Sports",         emoji:"📡", type:"live" },
    { id:"dazn",        name:"DAZN",               emoji:"🥊", type:"live" },
    { id:"bein",        name:"beIN Sports",        emoji:"🌍", type:"live" },
    { id:"canal-plus",  name:"Canal+",             emoji:"➕", type:"live" },
    { id:"supersport",  name:"SuperSport",         emoji:"🦁", type:"live" },
    { id:"tubi",        name:"Tubi",               emoji:"🎬", type:"streaming" },
    { id:"pluto",       name:"Pluto TV",           emoji:"🛰️", type:"streaming" },
    { id:"plex",        name:"Plex",               emoji:"🎛️", type:"streaming" },
    { id:"kodi",        name:"Kodi",               emoji:"🧩", type:"app" },
    { id:"crunchyroll", name:"Crunchyroll",        emoji:"🍥", type:"streaming" },
    { id:"vimeo",       name:"Vimeo",              emoji:"🎦", type:"streaming" },
    { id:"twitch",      name:"Twitch",             emoji:"🟣", type:"live" }
  ];

  const EMOJI_CHOICES = [
    "📺","🎬","🎥","🍿","📡","🛰️","▶️","⭐","🎭","🎞️",
    "🍎","🦚","📦","🏰","⚡","➕","🎛️","🧩","🍥","🟣",
    "🔥","💎","🌍","🚀","🎵","📻","🏆","🎮"
  ];

  const STORAGE_KEY = "entertainmentHub.customTVStations.v1";

  /* ---------- 3. HELPERS ---------- */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

  const typeLabel = (t) => ({live:"Live",vod:"VOD",app:"App",streaming:"Stream"}[t] || "");
  const typeClass = (t) => ({live:"live",vod:"vod",app:"app"}[t] || "");

  function loadCustom(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }
  function saveCustom(arr){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
    catch(e){ console.warn("Could not save custom stations", e); }
  }

  /* ---------- 4. STATE ---------- */
  let customStations = loadCustom();
  let sportsQuery = "";
  let tvQuery = "";
  let selectedEmoji = "📺";

  /* ---------- 5. RENDER: SPORTS ---------- */
  const sportsGrid  = document.getElementById("grid-sports");
  const emptySports = document.getElementById("empty-sports");
  const sportsCount = document.getElementById("sportsVisibleCount");
  const sportsSearch = document.getElementById("sportsSearchInput");

  function renderSports(){
    const q = sportsQuery.toLowerCase();
    const filtered = SPORTS.filter(s => s.name.toLowerCase().includes(q));

    sportsGrid.innerHTML = filtered.map(s => `
      <button class="ent-sport-tile" type="button" data-sport-id="${s.id}" title="${esc(s.name)}">
        <span class="ent-sport-emoji">${s.emoji}</span>
        <span class="ent-sport-name">${esc(s.name)}</span>
      </button>
    `).join("");

    if(sportsCount) sportsCount.textContent = filtered.length;
    if(emptySports) emptySports.hidden = filtered.length > 0;
  }

  if(sportsSearch){
    sportsSearch.addEventListener("input", () => {
      sportsQuery = sportsSearch.value.trim();
      renderSports();
    });
  }

  if(sportsGrid){
    sportsGrid.addEventListener("click", (e) => {
      const tile = e.target.closest("[data-sport-id]");
      if(!tile) return;
      const sport = SPORTS.find(s => s.id === tile.dataset.sportId);
      if(sport && window.toast) window.toast("🏆 Opening " + sport.name + "…");
      else if(sport) alert("Opening " + sport.name);
    });
  }

  /* ---------- 6. RENDER: TV STATIONS ---------- */
  const tvGrid     = document.getElementById("grid-tvstations");
  const emptyTv    = document.getElementById("empty-tvstations");
  const tvSearch   = document.getElementById("tvSearchInput");

  function renderTv(){
    const q = tvQuery.toLowerCase();
    const builtIn = TV_STATIONS.filter(s => s.name.toLowerCase().includes(q));
    const custom  = customStations.filter(s => s.name.toLowerCase().includes(q));

    const html = [
      ...builtIn.map(s => `
        <button class="ent-tv-card" type="button" data-tv-id="${s.id}" data-kind="builtin">
          <span class="ent-tv-emoji">${esc(s.emoji)}</span>
          <span class="ent-tv-label">${esc(s.name)}</span>
          ${s.type ? `<span class="ent-tv-tag ${typeClass(s.type)}">${typeLabel(s.type)}</span>` : ""}
        </button>
      `),
      ...custom.map(s => `
        <button class="ent-tv-card custom" type="button" data-tv-id="${s.id}" data-kind="custom">
          <span class="ent-tv-emoji">${esc(s.emoji || "📺")}</span>
          <span class="ent-tv-label">${esc(s.name)}</span>
          ${s.type ? `<span class="ent-tv-tag ${typeClass(s.type)}">${typeLabel(s.type)}</span>` : ""}
          <span class="ent-tv-remove" data-remove-id="${s.id}" title="Remove">✕</span>
        </button>
      `)
    ].join("");

    tvGrid.innerHTML = html;
    if(emptyTv) emptyTv.hidden = (builtIn.length + custom.length) > 0;

    const badge = document.getElementById("countTvStations");
    if(badge) badge.textContent = builtIn.length + custom.length;
  }

  if(tvSearch){
    tvSearch.addEventListener("input", () => {
      tvQuery = tvSearch.value.trim();
      renderTv();
    });
  }

  if(tvGrid){
    tvGrid.addEventListener("click", (e) => {
      // Remove custom station
      const removeBtn = e.target.closest("[data-remove-id]");
      if(removeBtn){
        e.stopPropagation();
        const id = removeBtn.dataset.removeId;
        customStations = customStations.filter(s => s.id !== id);
        saveCustom(customStations);
        renderTv();
        if(window.toast) window.toast("🗑 Station removed");
        return;
      }

      // Open station
      const card = e.target.closest("[data-tv-id]");
      if(!card) return;
      const kind = card.dataset.kind;
      const id = card.dataset.tvId;
      const station = kind === "builtin"
        ? TV_STATIONS.find(s => s.id === id)
        : customStations.find(s => s.id === id);
      if(!station) return;

      if(station.url){
        window.open(station.url, "_blank", "noopener");
      } else if(window.toast){
        window.toast("▶ Opening " + station.name);
      }
    });
  }

  /* ---------- 7. ADD TV STATION MODAL ---------- */
  const addTvModal = document.getElementById("entAddTvModal");
  const addTvForm  = document.getElementById("entAddTvForm");
  const tvNameEl   = document.getElementById("tvName");
  const tvTypeEl   = document.getElementById("tvType");
  const tvUrlEl    = document.getElementById("tvUrl");
  const tvEmojiEl  = document.getElementById("tvEmoji");
  const emojiPick  = document.getElementById("entEmojiPicker");
  const addTvStat  = document.getElementById("entAddTvStatus");

  function buildEmojiPicker(){
    if(!emojiPick) return;
    emojiPick.innerHTML = EMOJI_CHOICES.map(e =>
      `<button type="button" data-emoji="${e}">${e}</button>`
    ).join("");
  }

  if(emojiPick){
    emojiPick.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-emoji]");
      if(!b) return;
      selectedEmoji = b.dataset.emoji;
      tvEmojiEl.value = selectedEmoji;
      emojiPick.querySelectorAll("button").forEach(x =>
        x.classList.toggle("active", x.dataset.emoji === selectedEmoji)
      );
    });
  }

  if(tvEmojiEl){
    tvEmojiEl.addEventListener("input", () => {
      selectedEmoji = tvEmojiEl.value.trim() || "📺";
      emojiPick && emojiPick.querySelectorAll("button").forEach(x =>
        x.classList.toggle("active", x.dataset.emoji === selectedEmoji)
      );
    });
  }

  function openAddTv(){
    if(!addTvModal) return;
    addTvForm.reset();
    selectedEmoji = "📺";
    tvEmojiEl.value = "📺";
    if(addTvStat){ addTvStat.hidden = true; addTvStat.classList.remove("err"); }
    emojiPick && emojiPick.querySelectorAll("button").forEach(x => x.classList.remove("active"));
    addTvModal.hidden = false;
    setTimeout(() => tvNameEl && tvNameEl.focus(), 60);
  }

  function closeAddTv(){
    if(addTvModal) addTvModal.hidden = true;
  }

  if(addTvForm){
    addTvForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (tvNameEl.value || "").trim();
      if(!name){
        if(addTvStat){ addTvStat.hidden = false; addTvStat.classList.add("err"); addTvStat.textContent = "⚠ Please enter a station name."; }
        tvNameEl.focus();
        return;
      }

      const exists =
        TV_STATIONS.some(s => s.name.toLowerCase() === name.toLowerCase()) ||
        customStations.some(s => s.name.toLowerCase() === name.toLowerCase());

      if(exists){
        if(addTvStat){ addTvStat.hidden = false; addTvStat.classList.add("err"); addTvStat.textContent = "⚠ “" + name + "” is already in the list."; }
        return;
      }

      customStations.push({
        id: "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7),
        name: name,
        emoji: (tvEmojiEl.value.trim() || "📺").slice(0,4),
        type: tvTypeEl.value || "streaming",
        url: (tvUrlEl.value || "").trim(),
        custom: true,
        addedAt: Date.now()
      });
      saveCustom(customStations);
      renderTv();
      closeAddTv();
      if(window.toast) window.toast("✅ “" + name + "” added");
    });
  }

  // Delegate "open/close add TV" actions
  document.addEventListener("click", (e) => {
    const openBtn  = e.target.closest('[data-action="openAddTVStation"]');
    const closeBtn = e.target.closest('[data-action="closeAddTVStation"]');
    if(openBtn){ e.preventDefault(); openAddTv(); return; }
    if(closeBtn){ e.preventDefault(); closeAddTv(); return; }
    if(e.target === addTvModal) closeAddTv();
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && addTvModal && !addTvModal.hidden) closeAddTv();
  });

  /* ---------- 8. TAB SWITCHING (ensure new tabs work) ---------- */
  const tabsRoot = document.querySelector("#entertainmentModal .ent-tabs");
  const panelsRoot = document.querySelector("#entertainmentModal .ent-content");

  function activateTab(name){
    if(!tabsRoot || !panelsRoot) return;
    tabsRoot.querySelectorAll(".ent-tab").forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panelsRoot.querySelectorAll(".ent-panel").forEach(p => {
      p.classList.toggle("active", p.dataset.panel === name);
    });
  }

  if(tabsRoot){
    tabsRoot.addEventListener("click", (e) => {
      const tab = e.target.closest(".ent-tab");
      if(!tab) return;
      activateTab(tab.dataset.tab);
    });
  }

  /* ---------- 9. INITIAL RENDER ---------- */
  function init(){
    buildEmojiPicker();
    renderSports();
    renderTv();

    // Set the sports tab count to total sports
    const sportsBadge = document.getElementById("countSports");
    if(sportsBadge) sportsBadge.textContent = SPORTS.length;
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  window.EntHubSportsTV = { SPORTS, TV_STATIONS, customStations, renderSports, renderTv };
})();