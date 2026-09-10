/**
 * Custom Search Engine Engine Script - Fully Modernized Version
 * Integrated features: Instant Answers, Knowledge Graph, Calculator, Translator, 
 * Sitelinks, News & Video Injections, Scroll Restoration, and Settings Management.
 */

// ==========================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ==========================================
const CONFIG = {
  apiBase: "https://datasearch.searchdata.workers.dev",
  cdnBase: "https://cdn.searchdata.workers.dev",
  maxPages: 30,
  newsKeywords: ['chrome', 'youtube', 'twitter', 'google', 'microsoft', 'duckduckgo', 'sepak bola'],
  charMap: {
    'a': 'XyZ', 'b': 'LmN', 'c': 'PoQ', 'd': 'AbC', 'e': 'EfG', 'f': 'HiJ',
    'g': 'KlM', 'h': 'NoP', 'i': 'QrS', 'j': 'TuV', 'k': 'WxY', 'l': 'ZaB',
    'm': 'CdE', 'n': 'FgH', 'o': 'IjK', 'p': 'LmO', 'q': 'NpR', 'r': 'StU',
    's': 'VwX', 't': 'YzA', 'u': 'BcD', 'v': 'EfH', 'w': 'GhJ', 'x': 'KlO',
    'y': 'MnQ', 'z': 'PrT', '0': 'UoV', '1': 'WxZ', '2': 'AaB', '3': 'CcD',
    '4': 'EeF', '5': 'GgH', '6': 'IiJ', '7': 'KkL', '8': 'MmN', '9': 'OoP',
    ':': 'QqR', '/': 'SsT', '.': 'UuV', '-': 'WwX', '_': 'YyZ'
  }
};

const STATE = {
  windowWidth: (window.innerWidth > 0) ? window.innerWidth : screen.width,
  urlParams: new URLSearchParams(window.location.search),
  isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  sitelinksData: [],
  startIndex: 1
};

// Global query params
const Q = STATE.urlParams.get("q") ? STATE.urlParams.get("q").trim() : "";
const P = parseInt(STATE.urlParams.get("p"), 10) || 1;
const HL = STATE.urlParams.get("hl") || "";
const TBM = STATE.urlParams.get("tbm") || "";
const UF = STATE.urlParams.get("uf") || "";
const FV = STATE.urlParams.get("fv") || "";
const SF = STATE.urlParams.get("sf") || "";
const TH = STATE.urlParams.get("th") || "";

STATE.startIndex = P > 1 ? P : 1;

// Language Settings
function getSettings() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const parts = cookie.split('=');
    if (parts[0].trim() === 'settings') {
      try { return JSON.parse(parts[1]) || {}; } catch (e) { return {}; }
    }
  }
  return {};
}

const IS_ID = (getSettings().lang === "Indonesia" || HL === "id");
const SEARCH_LANG = IS_ID ? `&hl=id` : "";
const LOCAL_LANG = IS_ID ? "id-ID" : "en-US";

let searchParam = "";
searchParam += UF == 1 ? "&uf=1" : "";
searchParam += FV == 0 ? "&fv=0" : "";
searchParam += SF == 1 ? "&sf=1" : "";
searchParam += TH == 1 ? "&th=1" : "";

const I18N = {
  en: {
    news: "News result",
    more: "More search results",
    vidTitle: "Videos",
    related: "People also search for",
    placeholder: "Type to search...",
    correct: "Did you mean:",
    noresult: "No matching results",
    noSiteInfo: "There is no information on this page.",
    suggtext: "Search suggestion:",
    adlabel: "Ad",
    noresultsug: ["Try different keywords.", "Try more general keywords.", "Try fewer keywords."],
    tab: ["All", "Images", "Videos", "News", "Maps"]
  },
  id: {
    news: "Hasil berita <pre>Beta</pre>",
    more: "Hasil penelusuran lainnya",
    vidTitle: "Video",
    related: "Orang lain juga menelusuri",
    placeholder: "Ketik untuk mencari...",
    correct: "Apakah maksudmu:",
    noresult: "Tidak ditemukan hasil",
    noSiteInfo: "Tidak ada informasi mengenai halaman ini.",
    suggtext: "Saran pencarian:",
    adlabel: "Iklan",
    noresultsug: ["Coba kata kunci yang berbeda.", "Coba kata kunci yang lebih umum.", "Coba lebih sedikit kata kunci."],
    tab: ["Semua", "Gambar", "Video", "Berita", "Peta"]
  }
};

function langtext(key, index) {
  const dict = IS_ID ? I18N.id : I18N.en;
  if (index !== undefined) return dict[key][index];
  return dict[key];
}

// ==========================================
// 2. HELPER UTILITIES
// ==========================================
function escapeHTML(str) {
  return str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])) : '';
}

function encodeURL(url) {
  return url.split('').map(char => CONFIG.charMap[char] || char).join('');
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function insertAfter(referenceNode, newNode) {
  if (referenceNode && referenceNode.parentNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }
}

function timeAgo(input) {
  const date = (input instanceof Date) ? input : new Date(input);
  const formatter = new Intl.RelativeTimeFormat(LOCAL_LANG);
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  for (let key in ranges) {
    if (ranges[key] < Math.abs(secondsElapsed)) {
      return formatter.format(Math.round(secondsElapsed / ranges[key]), key);
    }
  }
  return date.toLocaleDateString();
}

function dateconversion(val, shortMonth, skip) {
  let currentYear = new Date().getFullYear();
  let parsedDate = new Date(val);

  if (isNaN(parsedDate)) {
    let cleanedVal = String(val).replace(/(\d{2}:\d{2}.*)/, "").trim();
    parsedDate = new Date(cleanedVal);
    if (isNaN(parsedDate)) return "Invalid Date";
  }

  let year = parsedDate.getFullYear();
  let day = parsedDate.getDate();
  let month = parsedDate.toLocaleString(LOCAL_LANG, { month: shortMonth ? 'short' : 'long' });

  if (year === currentYear && !skip) {
    return timeAgo(parsedDate);
  } else {
    return `${day} ${month} ${year}`;
  }
}

function toDataURL(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.onload = function() {
    const reader = new FileReader();
    reader.onloadend = function() { callback(reader.result); };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

// Scroll Restoration
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem(`scrollPos:${location.href}`, window.scrollY);
});
function scrollRestore() {
  const scrollPos = sessionStorage.getItem(`scrollPos:${location.href}`);
  if (scrollPos !== null) window.scrollTo(0, parseInt(scrollPos, 10));
}

// Fetch Sitelinks Data
fetch('/sitelinks.js')
  .then(res => res.text())
  .then(code => {
    try {
      const match = code.match(/sitelinks\s*=\s*(\[[\s\S]*?\]);/);
      if (match) STATE.sitelinksData = JSON.parse(match[1]);
    } catch (e) {}
  }).catch(() => {});

function showLinks(url) {
  if (!STATE.sitelinksData.length) return '';
  const cleanUrl = url.replace(/^https?:\/\//, "");
  const foundSite = STATE.sitelinksData.find(s => s.site.replace(/^https?:\/\//, "") === cleanUrl);
  
  if (foundSite) {
    let hcq = '';
    const msb = foundSite.links;
    for (let i = 0; i < msb.length; i++) {
      const bac = msb[i];
      if (bac[2] && STATE.windowWidth > 780) {
        hcq += `<div class="wrlink"><a href="${bac[1]}" class="link">${bac[0]}</a><div class="snippet">${bac[2]}</div></div>`;
      } else {
        hcq += `<div class="wrlink"><a href="${bac[1]}" class="link">${bac[0]}</a><span class="BxJx"><div class="Xcjwr"></div></span></div>`;
      }
    }
    return `<div class="sitelinks">${hcq}</div>`;
  }
  return '';
}

// ==========================================
// 3. UI & DOM INITIALIZATION (CLEAN SHELL)
// ==========================================
function initSearchShell() {
  if (!Q || window.location.pathname.match(".html")) {
    window.location.href = "/";
    return;
  }

  if (getSettings().theme === "dark" || TH == 1) {
    document.body.classList.add("dark");
  }

  document.title = IS_ID ? `${Q} - Penelusuran` : `${Q} - Search`;
  document.documentElement.lang = IS_ID ? "id" : "en";

  const logodev = `<div class="xnan"><div class="logo" id="main-lgx"><a title="Kembali ke halaman utama." href="/x?=srltpg"><img id="logimg_Ux92" alt="Logo" title="Logo" src="/images/logo.png"></a></div></div>`;
  const inlineCSS = `.logo#main-lgx img{width:100px;height:45px;}.logo#main-lgx{display:flex;justify-content:center;background:#fff;padding-top:8px}@media (min-width:780px){.logo#main-lgx{position:absolute;top:6px;left:0;padding:8px 12px}@media (max-width:940.9px){.logo#main-lgx{visibility:hidden}}}.logo#main-lgx .s{position:relative}`;

  const queryEncoded = encodeURIComponent(Q).replace(/\%20/g, '+');

  document.body.innerHTML = `
    <div class="root" id="main-bx">
      <div class="kwuND KwbMG"><div class="cbKRN"></div></div>
      <div class="xzBdP"></div>
      <div class="hVhvp BbmqH">
        <div class="KArDf">
          ${logodev}
          <div class="header">
            <div class="search-box">
              <div class="search-field">
                <input type="search" id="sear_21829_input" value="${escapeHTML(Q)}" name="q" class="search-input" autocorrect="off" autocomplete="off" autocapitalize="off" placeholder="${langtext("placeholder")}">
                <div role="button" class="search-toggle inpbtun" id="xclarGh" title="Cari"></div>
                <div role="button" class="cleartext inpbtun" id="Chasprn" title="Hapus" style="display:none;"></div>
              </div>
            </div>
            <div class="search-menu">
              <div class="search-item ${!TBM ? 'selected' : ''}">
                <a href="/search?q=${queryEncoded}${SEARCH_LANG}${searchParam}" class="tab-wrapper" tab-id="all">
                  <div class="label"><svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 1C2.68629 1 0 3.68629 0 7C0 10.3137 2.68629 13 6 13C7.64669 13 9.13845 12.3366 10.2226 11.2626L14.7873 14.8403C15.1133 15.0959 15.5848 15.0387 15.8403 14.7127C16.0958 14.3867 16.0387 13.9153 15.7126 13.6597L11.1487 10.0826C11.6892 9.18164 12 8.12711 12 7C12 3.68629 9.31371 1 6 1ZM1.5 7C1.5 4.51472 3.51472 2.5 6 2.5C8.48528 2.5 10.5 4.51472 10.5 7C10.5 9.48528 8.48528 11.5 6 11.5C3.51472 11.5 1.5 9.48528 1.5 7Z"></path></svg><span>${langtext("tab", 0)}</span></div>
                </a>
              </div>
              <div class="search-item ${TBM === 'isch' ? 'selected' : ''}">
                <a href="/search?q=${queryEncoded}&tbm=isch${SEARCH_LANG}${searchParam}" class="tab-wrapper" tab-id="images">
                  <div class="label"><svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 1C1.45507 1 0 2.45507 0 4.25V11.75C0 13.5449 1.45507 15 3.25 15H12.75C14.5449 15 16 13.5449 16 11.75V10.2593C16.0001 10.2531 16.0001 10.2469 16 10.2407V4.25C16 2.45507 14.5449 1 12.75 1H3.25ZM14.5 8.43928V4.25C14.5 3.2835 13.7165 2.5 12.75 2.5H3.25C2.2835 2.5 1.5 3.2835 1.5 4.25V11.75C1.5 11.9563 1.5357 12.1543 1.60126 12.3381L5.96967 7.96967C6.26256 7.67678 6.73744 7.67678 7.03033 7.96967L8.00003 8.93937L10.9697 5.96967C11.2626 5.67678 11.7375 5.67678 12.0304 5.96967L14.5 8.43928ZM9.06069 10L10.0303 10.9697C10.3232 11.2626 10.3232 11.7374 10.0303 12.0303C9.73744 12.3232 9.26256 12.3232 8.96967 12.0303L6.5 9.56066L2.66192 13.3987C2.84572 13.4643 3.04369 13.5 3.25 13.5H12.75C13.7165 13.5 14.5 12.7165 14.5 11.75V10.5606L11.5001 7.56066L9.06069 10Z"></path></svg><span>${langtext("tab", 1)}</span></div>
                </a>
              </div>
              <div class="search-item ${TBM === 'vid' ? 'selected' : ''}">
                <a href="/search?q=${queryEncoded}&tbm=vid${SEARCH_LANG}${searchParam}" class="tab-wrapper" tab-id="videos">
                  <div class="label"><svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.4887 5.55027C15.3801 6.63605 15.3801 9.36446 13.4887 10.4502L6.23148 14.6164C4.34816 15.6976 2 14.338 2 12.1664L2 3.83407C2 1.66248 4.34816 0.302917 6.23148 1.38408L13.4887 5.55027ZM12.7419 9.14937C13.629 8.64011 13.629 7.36041 12.7419 6.85115L5.48468 2.68496C4.60135 2.17787 3.5 2.81554 3.5 3.83407L3.5 12.1664C3.5 13.185 4.60135 13.8226 5.48468 13.3156L12.7419 9.14937Z"></path></svg><span>${langtext("tab", 2)}</span></div>
                </a>
              </div>
              <div class="search-item ${TBM === 'nws' ? 'selected' : ''}">
                <a href="/search?q=${queryEncoded}&tbm=nws${SEARCH_LANG}${searchParam}" class="tab-wrapper" tab-id="news">
                  <div class="label"><svg width="16" height="16" viewBox="0 0 22 22" fill="#6e7780"><path d="M12 11h6v2h-6v-2zm-6 6h12v-2H6v2zm0-4h4V7H6v6zm16-7.22v12.44c0 1.54-1.34 2.78-3 2.78H5c-1.64 0-3-1.25-3-2.78V5.78C2 4.26 3.36 3 5 3h14c1.64 0 3 1.25 3 2.78zM19.99 12V5.78c0-.42-.46-.78-1-.78H5c-.54 0-1 .36-1 .78v12.44c0 .42.46.78 1 .78h14c.54 0 1-.36 1-.78V12zM12 9h6V7h-6v2"></path></svg><span>${langtext("tab", 3)}</span></div>
                </a>
              </div>
              <div class="search-item">
                <a href="/maps?q=${queryEncoded}" class="tab-wrapper" tab-id="maps">
                  <div class="label"><svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C6.81332 0 5.65328 0.351894 4.66658 1.01118C3.67989 1.67047 2.91085 2.60754 2.45673 3.7039C2.0026 4.80026 1.88378 6.00666 2.11529 7.17054C2.35179 8.35952 2.99591 9.39906 3.73051 10.2144C5.0603 11.6902 5.95884 13.0319 6.52237 13.9981C6.80408 14.4812 7.00183 14.87 7.1277 15.1343C7.19062 15.2665 7.23554 15.3675 7.26398 15.4334C7.27819 15.4664 7.28829 15.4907 7.29444 15.5057L7.30075 15.5212L7.30129 15.5226L7.30168 15.5236C7.41829 15.8212 7.71074 16.0123 8.03018 15.9994C8.34937 15.9865 8.62531 15.7729 8.71783 15.4673L8.71818 15.4662L8.72264 15.4522C8.72711 15.4384 8.73473 15.4154 8.74578 15.3837C8.76791 15.3202 8.80379 15.2219 8.85585 15.0927C8.95997 14.8342 9.12867 14.452 9.38109 13.9769C9.88586 13.0267 10.7253 11.7051 12.0529 10.2568C12.7338 9.51391 13.6375 8.41354 13.8847 7.17054C14.1162 6.00666 13.9974 4.80026 13.5433 3.7039C13.0892 2.60754 12.3201 1.67047 11.3334 1.01118C10.3467 0.351894 9.18669 0 8 0ZM8.05642 13.2731C8.01989 13.3419 7.98488 13.409 7.95134 13.4745C7.90893 13.3994 7.86453 13.322 7.81811 13.2425C7.20975 12.1993 6.25213 10.7721 4.84488 9.21027C4.23085 8.5288 3.75511 7.72573 3.58647 6.87791C3.41284 6.00499 3.50195 5.10019 3.84254 4.27792C4.18314 3.45566 4.75992 2.75285 5.49994 2.25839C6.23996 1.76392 7.10999 1.5 8 1.5C8.89002 1.5 9.76005 1.76392 10.5001 2.25839C11.2401 2.75285 11.8169 3.45566 12.1575 4.27793C12.4981 5.10019 12.5872 6.00499 12.4135 6.87791C12.2556 7.67171 11.6276 8.50093 10.9471 9.24321C9.52471 10.7949 8.61414 12.2233 8.05642 13.2731Z"></path></svg><span>${langtext("tab", 4)}</span></div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="QZjVU hWOQY">
          <div class="result-wrapper">
            <div class="main-result"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="overlay_uX2"><input style="display:none" id="Dteck"><iframe style="display:none" src="/webchunk"></iframe></div>
    <style>${inlineCSS}</style>`;

  injectCSSByTab();
  setupUIEvents();
}

function injectCSSByTab() {
  const cssMap = { vid: "/m2095.css", isch: "/i2025.css", nws: "/e8495.css" };
  const targetCSS = cssMap[TBM] || "/e8495.css";
  
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = targetCSS;
  document.head.appendChild(link);

  if (TBM === "isch") {
    const script = document.createElement("script");
    script.src = "/imgtest.js";
    document.querySelector(".main-result").innerHTML = `<div class="show-wrapper"><div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div></div>`;
    document.body.appendChild(script);
  } else if (TBM !== "vid" && TBM !== "nws") {
    document.querySelector(".main-result").innerHTML = `<div class="UoZrQ result"></div>`;
  }
}

function setupUIEvents() {
  const searchInput = document.querySelector(".search-input");
  const cleartext = document.querySelector(".cleartext");
  const searchToggle = document.querySelector(".search-toggle");

  if (STATE.windowWidth < 780) {
    document.querySelectorAll(".label svg").forEach(elm => elm.remove());
  }

  searchInput.addEventListener('input', () => {
    cleartext.style.display = searchInput.value ? 'block' : 'none';
  });

  cleartext.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    cleartext.style.display = 'none';
  });

  searchInput.addEventListener('keyup', (e) => {
    if (e.keyCode === 13 || e.key === "Enter") searchToggle.click();
  });

  searchToggle.addEventListener('click', () => {
    const searchdata = TBM ? `&tbm=${TBM}` : "";
    if (searchInput.value.trim()) {
      const targetUrl = `/search?q=${encodeURIComponent(searchInput.value).replace(/\%20/g, '+')}${searchdata}${SEARCH_LANG}${searchParam}`;
      window.location.href = targetUrl;
    }
  });

  if (getSettings().newtab === true) {
    setTimeout(() => {
      document.querySelectorAll(".main-result a").forEach(elm => elm.target = "_blank");
    }, 1000);
  }
}

// ==========================================
// 4. INSTANT ANSWERS & WIDGETS (LINE 0)
// ==========================================
const Widgets = {
  checkAndRender() {
    const qLower = Q.toLowerCase();
    const container = document.querySelector(".main-result .result");
    if (!container) return;

    const d = new Date();
    const clock = () => {
      let h = d.getHours(), m = d.getMinutes();
      return `${h < 10 ? '0' + h : h}.${m < 10 ? '0' + m : m}`;
    };

    // 1. Clock Widget
    if (/\b(jam|waktu|time|clock)\b/.test(qLower) && qLower.length < 15 && (qLower.split(" ").length - 4)) {
      const tz = d.toString().match(/([A-Z]+[\+-][0-9]+.*)/);
      const tzStr = tz ? tz[1] : '';
      container.insertAdjacentHTML('afterbegin', `
        <div class="tab-result pddf eb8xCva">
          <div class="big-title">${clock()}</div>
          <div class="snippet-info">${d.toLocaleDateString(LOCAL_LANG, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${tzStr}</div>
        </div>`);
    } 
    // 2. Date Widget
    else if (/\b(tanggal|date)\b/.test(qLower) && qLower.length < 15 && (qLower.split(" ").length - 4)) {
      container.insertAdjacentHTML('afterbegin', `
        <div class="tab-result pddf eb8xCva">
          <div class="big-title">${d.toLocaleDateString(LOCAL_LANG, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>`);
    } 
    // 3. Calculator Widget
    else if ((/\b(kalkulator|calculator)\b/.test(qLower) && (qLower.split(" ").length - 2)) || /calculator\s+online|kalkulator\s+online/.test(qLower)) {
      container.insertAdjacentHTML('afterbegin', `
        <div class="calculator">
          <input type="text" inputmode="none" class="display" />
          <div class="buttons">
            <button class="operator" data-value="AC">AC</button>
            <button class="operator" data-value="DEL">DEL</button>
            <button class="operator" data-value="%">%</button>
            <button class="operator" data-value=" ÷ ">÷</button>
            <button data-value="7">7</button><button data-value="8">8</button><button data-value="9">9</button>
            <button class="operator" data-value=" × ">×</button>
            <button data-value="4">4</button><button data-value="5">5</button><button data-value="6">6</button>
            <button class="operator" data-value=" - ">-</button>
            <button data-value="1">1</button><button data-value="2">2</button><button data-value="3">3</button>
            <button class="operator" data-value=" + ">+</button>
            <button data-value="0">0</button><button data-value="00">00</button><button data-value=".">.</button>
            <button class="operator" data-value="=" th="true">=</button>
          </div>
        </div>`);
      this.initCalculator();
    } 
    // 4. Translator Widget
    else if (/\b(translate|terjemah|terjemahan)\b/.test(qLower)) {
      container.insertAdjacentHTML('afterbegin', `
        <div class="trnsl">
          <div class="wrpl">
            <ul class="controls">
              <li class="row from"><div class="icons"><i id="from" class="fas fa-volume-up"></i><i id="from" class="fas fa-copy"></i></div><select></select></li>
              <li class="exchange"><i class="fas fa-exchange-alt"></i></li>
              <li class="row to"><select></select><div class="icons"><i id="to" class="fas fa-volume-up"></i><i id="to" class="fas fa-copy"></i></div></li>
            </ul>
            <div class="text-input">
              <textarea spellcheck="false" class="from-text" placeholder="Enter text"></textarea>
              <textarea spellcheck="false" readonly disabled class="to-text" placeholder="Translation"></textarea>
            </div>
          </div>
        </div>`);
      this.initTranslator();
    }
  },

  initCalculator() {
    setTimeout(() => {
      const calcBox = document.querySelector(".calculator");
      if (!calcBox) return;
      const display = calcBox.querySelector(".display");
      const buttons = calcBox.querySelectorAll("button");
      const specialChars = ["%", "*", "/", "-", "+", "="];
      let output = "";

      const calculate = (btnValue) => {
        display.focus();
        if (btnValue === "=" && output !== "") {
          output = eval(output.replace("%", "/100").replace(/×/g, "*").replace(/÷/g, "/"));
        } else if (btnValue === "AC") {
          output = "";
        } else if (btnValue === "DEL") {
          output = output.toString().slice(0, -1);
        } else {
          if (output === "" && specialChars.includes(btnValue)) return;
          output += btnValue;
        }
        display.value = output;
        display.blur();
      };
      buttons.forEach(btn => btn.addEventListener("click", e => calculate(e.target.dataset.value)));
    }, 300);
  },

  initTranslator() {
    const countries = { af: "Afrikaans", sq: "Albanian", am: "Amharic", ar: "Arabic", hy: "Armenian", as: "Assamese", ay: "Aymara", az: "Azerbaijani", bm: "Bambara", eu: "Basque", be: "Belarusian", bn: "Bengali", bho: "Bhojpuri", bs: "Bosnian", bg: "Bulgarian", ca: "Catalan", ceb: "Cebuano", co: "Corsican", hr: "Croatian", cs: "Czech", da: "Danish", nl: "Dutch", en: "English", eo: "Esperanto", et: "Estonian", ee: "Ewe", fil: "Filipino", fi: "Finnish", fr: "French", fy: "Frisian", ga: "Irish", gl: "Galician", de: "German", el: "Greek", gu: "Gujarati", ha: "Hausa", he: "Hebrew", hi: "Hindi", hu: "Hungarian", is: "Icelandic", ig: "Igbo", id: "Indonesian", it: "Italian", ja: "Japanese", jw: "Javanese", kn: "Kannada", kk: "Kazakh", km: "Khmer", ko: "Korean", ky: "Kyrgyz", lo: "Lao", lv: "Latvian", lt: "Lithuanian", lu: "Lushootseed", mk: "Macedonian", mg: "Malagasy", ms: "Malay", ml: "Malayalam", mt: "Maltese", mr: "Marathi", mn: "Mongolian", my: "Burmese", ne: "Nepali", no: "Norwegian", pa: "Punjabi", pl: "Polish", pt: "Portuguese", ro: "Romanian", ru: "Russian", sa: "Sanskrit", si: "Sinhala", sk: "Slovak", sl: "Slovenian", so: "Somali", es: "Spanish", su: "Sundanese", sw: "Swahili", sv: "Swedish", ta: "Tamil", te: "Telugu", th: "Thai", tr: "Turkish", uk: "Ukrainian", ur: "Urdu", uz: "Uzbek", vi: "Vietnamese", xh: "Xhosa", yo: "Yoruba", zu: "Zulu" };
    setTimeout(() => {
      const container = document.querySelector(".trnsl");
      if (!container) return;
      const fromText = container.querySelector(".from-text");
      const toText = container.querySelector(".to-text");
      const exchange = container.querySelector(".exchange");
      const selectTags = container.querySelectorAll("select");
      const icons = container.querySelectorAll(".row i");
      let isTranslating = false;

      const translate = (force) => {
        let text = fromText.value.trim();
        let fromLang = selectTags[0].value;
        let toLang = selectTags[1].value;
        if (!text) return;

        toText.setAttribute("placeholder", "Translating...");
        if (!toText.value || force || toText.value.match(fromText.value)) {
          if (force) {
            toText.value = "Translating...";
            isTranslating = true;
            exchange.classList.add("off");
          }
        }
        
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURI(text)}`;
        fetch(url).then(r => r.json()).then(data => {
          let out = "";
          for (let i = 0; i < data[0].length; i++) out += data[0][i][0];
          setTimeout(() => {
            toText.value = out;
            exchange.classList.remove("off");
            isTranslating = false;
          }, 120);
        });
      };

      selectTags.forEach((tag, id) => {
        for (let country in countries) {
          let selected = id === 0 ? (country === "en" ? "selected" : "") : (country === "id" ? "selected" : "");
          tag.insertAdjacentHTML("beforeend", `<option ${selected} value="${country}">${countries[country]}</option>`);
        }
        tag.addEventListener("change", () => translate());
      });

      if (IS_ID) { selectTags[0].value = "id"; selectTags[1].value = "en"; }

      exchange.addEventListener("click", () => {
        if ((fromText.value && !toText.value) || isTranslating) return;
        let tempLang = selectTags[0].value;
        fromText.value = toText.value;
        selectTags[0].value = selectTags[1].value;
        selectTags[1].value = tempLang;
        translate(true);
      });

      let timer;
      fromText.addEventListener("input", () => {
        clearTimeout(timer);
        if (fromText.value) timer = setTimeout(translate, 500);
        else toText.value = "";
      });

      icons.forEach(icon => {
        icon.addEventListener("click", ({ target }) => {
          if (!fromText.value || !toText.value) return;
          if (target.classList.contains("fa-copy")) {
            navigator.clipboard.writeText(target.id === "from" ? fromText.value : toText.value);
          } else {
            let utterance = new SpeechSynthesisUtterance(target.id === "from" ? fromText.value : toText.value);
            utterance.lang = target.id === "from" ? selectTags[0].value : selectTags[1].value;
            speechSynthesis.speak(utterance);
          }
        });
      });
    }, 100);
  }
};

// ==========================================
// 5. KNOWLEDGE GRAPH / SIDEBAR (LINE 1 / INJECT)
// ==========================================
function fetchInstantAnswer() {
  if (STATE.startIndex !== 1) return;
  
  const mapQuery = {
    "yahoo": "yahoo!",
    "notch": "markus persson",
    "microsoft team": "microsoft teams",
    "bing": "microsoft bing",
    "bard": "google bard",
    "apple": "apple inc",
    "ronaldo": "cristiano ronaldo",
    "messi": "lionel messi"
  };
  
  const qval = mapQuery[Q.toLowerCase()] || Q;

  fetch(`${CONFIG.apiBase}/?q=${encodeURIComponent(qval)}`)
    .then(res => res.json())
    .then(res => {
      if (!res || !res.snippet || res.snippet.length <= 100) return;

      const tabres = document.querySelectorAll(".tab-result");
      const instanswer = document.createElement("div");
      instanswer.classList.add("VtuHV", "instant-answer");

      if (STATE.windowWidth > 780) {
        let sidebar = document.querySelector(".sidebar-panel");
        if (!sidebar) {
          sidebar = document.createElement("div");
          sidebar.classList.add("sidebar-panel");
          document.querySelector(".result-wrapper").appendChild(sidebar);
        }
        sidebar.appendChild(instanswer);
      } else if (tabres[2]) {
        insertAfter(tabres[2], instanswer);
      } else {
        document.querySelector(".main-result .result")?.appendChild(instanswer);
      }

      const cleanSnippet = res.snippet.replace(/\<\/?pre.*?\/?\>/g, "").replace(/\<\/?code.*?\/?\>/g, "").slice(0, 220);
      instanswer.innerHTML = `<div class="title">${res.title}</div><div class="about"><span class="snippet">${cleanSnippet}... </span><a href="${res.sourceUrl}" class="wikipedia" title="Wikipedia">${res.source}</a></div><div class="infobox"></div>`;

      if (res.image) {
        const img = new Image();
        img.onload = () => {
          const borderStyle = res.type ? `style="border:1px solid #999999"` : "";
          instanswer.insertAdjacentHTML("afterbegin", `<img src="${res.image}" ${borderStyle} align="right" class="logo" alt="${res.Heading}">`);
        };
        img.src = res.image;
      }

      if (res.infobox) {
        const infoboxElm = instanswer.querySelector(".infobox");
        for (let i = 0; i < res.infobox.length && i < 3; i++) {
          if (res.infobox[i].value && res.infobox[i].value.trim()) {
            infoboxElm.innerHTML += `<span id="text_info"><b>${res.infobox[i].label}:</b> ${res.infobox[i].value}</span>`;
          }
        }
      }
    }).catch(() => {});
}

// ==========================================
// 6. INJECTED MODULES (NEWS & VIDEOS)
// ==========================================
function fetchHeaderNews(data) {
  if (!data.items || data.items.length <= 3) return;
  const tabres = document.querySelectorAll(".tab-result");
  const nwsres = document.createElement("div");
  nwsres.classList.add("m6gAk", "VtuHV", "news-result");
  nwsres.innerHTML = `<div class="title">${langtext("news")}</div><div class="news-list"></div>`;
  
  const targetIndex = (STATE.windowWidth > 780) ? 2 : 3;
  if (tabres[targetIndex]) {
    insertAfter(tabres[targetIndex], nwsres);
  } else {
    document.querySelector(".main-result .result")?.appendChild(nwsres);
  }

  data.items.forEach(item => {
    if (item.pagemap?.cse_thumbnail?.[0]?.src) {
      const thumbnailimg = item.pagemap.cse_thumbnail[0].src;
      const publisher = item.pagemap.metatags?.[0]?.['og:site_name'] || item.displayLink;

      toDataURL(thumbnailimg, (dataUrl) => {
        const newsTab = document.createElement("div");
        newsTab.classList.add("news-tab");
        newsTab.innerHTML = `<a href="${item.link}"><img src='${dataUrl}' class='thumbnail'><div class="title">${item.title}</div><div class="flexwrap"><img class="favicon" src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${item.link}&size=64"><div class="link">${publisher}</div></div></a>`;
        document.querySelector(".news-result .news-list")?.appendChild(newsTab);
      });
    }
  });
}

function fetchHeaderVideos(res) {
  if (!res.items || res.items.length <= 4) return;
  let videonya = "";
  for (let i = 0; i < res.items.length && i < 4; i++) {
    videonya += `<div class="vidbung">
      <div class="tab-tb"><a href="https://youtube.com/watch?v=${res.items[i].id.videoId}"><div class="viditem">
        <div class="thumbnail">
          <img src="${res.items[i].snippet.thumbnails.medium.url}">
          <div class="XTiWK"><span class="NwGDz">
            <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle fill="#fff" cx="12" cy="12" r="6.2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5"></path></svg>
          </span></div>
        </div>
        <div class="sampingnye">
          <div class="joedoel">${res.items[i].snippet.title}</div>
          <div class="soember">YouTube<span class="dot"></span><div class="chnama">${res.items[i].snippet.channelTitle}</div></div>
          <div class="tanggal">${dateconversion(res.items[i].snippet.publishTime)}</div>
        </div>
      </div></a></div>
    </div>`;
  }

  const tabres = document.querySelectorAll(".Kj7VF");
  const hnvde = document.createElement("div");
  hnvde.classList.add("VtuHV", "tab-result", "Dxcgd");
  hnvde.innerHTML = `<div class="title Jhtm">${langtext("vidTitle")}</div><div class="PbNgks">${videonya}</div>`;

  if (tabres[0] && Q.split(" ").length < 3) {
    insertAfter(tabres[0], hnvde);
  } else {
    document.querySelector(".main-result .result")?.insertAdjacentHTML("afterbegin", `<div class="tab-result Dxcgd eb8xCva">${hnvde.innerHTML}</div>`);
  }
}

// ==========================================
// 7. MAIN DATA FETCHING & RENDERING STREAM
// ==========================================
function submitSearch() {
  const basa = IS_ID ? `&gl=${HL}&lr=lang_id&hl=id` : "";

  if (TBM === "vid") {
    fetch(`${CONFIG.apiBase}/api?q=${encodeURIComponent(Q)}&tbm=vid&maxResults=100`)
      .then(r => r.json()).then(renderVideoResults).catch(noresult);
  } else if (TBM === "nws") {
    fetch(`${CONFIG.apiBase}/api?q=${encodeURIComponent(Q)}${basa}&tbm=nws`)
      .then(r => r.json()).then(renderNewsResults).catch(noresult);
  } else if (TBM !== "isch") {
    fetch(`${CONFIG.apiBase}/api?q=${encodeURIComponent(Q)}${basa}&page=${STATE.startIndex}`)
      .then(r => r.json()).then(renderWebResults).catch((err) => { alert(err.message); noresult(); });
  }
}

function renderWebResults(res) {
  const isPageOne = (STATE.startIndex === 1);
  const resultContainer = document.querySelector(".main-result .result");

  if (!res.items || res.items.length === 0) {
    if (isPageOne) noresult();
    return;
  }

  // 1. Result Stats Bar
  if (STATE.windowWidth > 700 && isPageOne) {
    const rsltsta = IS_ID 
      ? `Sekitar ${res.searchInformation.formattedTotalResults} hasil (${res.searchInformation.formattedSearchTime} detik)` 
      : `Approximately ${res.searchInformation.formattedTotalResults} result (${res.searchInformation.formattedSearchTime} seconds)`;
    document.querySelector(".main-result").insertAdjacentHTML('afterbegin', `<div class="WsXZp"><div class="result-stats">${rsltsta}</div></div>`);
  }

  // 2. Spelling Correction
  if (res.spelling && isPageOne) {
    resultContainer.insertAdjacentHTML('beforeend', `
      <div class="corrected-word tab-result eb8xCva">
        <div class="snippet">${langtext("correct")} <a class="spelling" href="/search?q=${encodeURIComponent(res.spelling.correctedQuery).replace(/\%20/g, '+')}${SEARCH_LANG}">${res.spelling.correctedQuery}</a><span>?</span></div>
      </div>`);
  }

  // 3. Line 0 Instant Answers Widgets
  if (isPageOne) Widgets.checkAndRender();

  // 4. Injected Ads / Promotions
  if (res.promotions && isPageOne) {
    res.promotions.forEach((promo, i) => {
      resultContainer.insertAdjacentHTML('beforeend', `
        <div class="tab-result eb8xCva">
          <div class="tab-link" data-number="${i}">
            <a href="${promo.link}">
              <div class="top"><div class="link">${promo.displayLink}</div><div class="ads">${langtext("adlabel")}</div></div>
              <div class="title">${promo.title}</div>
            </a>
          </div>
          <div class="btm-snpt"><div class="snippet">${promo.bodyLines[0].title}</div></div>
        </div>`);
    });
  }

  // 5. Special Event / Release Card (Top Injected)
  res.items.forEach((item) => {
    if (item?.pagemap?.event?.[0]?.summary) {
      resultContainer.insertAdjacentHTML('afterbegin', `
        <div class="VtuHV Kj7VF tab-result eb8xCva" style="padding:16px;display:flex;justify-content:space-between">
          <div style="display:flex;flex-direction:column;justify-content:space-between">
            <div style="color:black" class="title">${item.pagemap.event[0].summary}</div>
            <div style="font-size:14px">Release:<br>${dateconversion(item.pagemap.event[0].dtstart, false, true)} (${dateconversion(item.pagemap.event[0].dtstart)})</div>
          </div>
          <div class="thumbnail" style="width:80px;height:80px;object-fit:cover">
            <img style="width:100%; height:100%" alt="${item.pagemap.event[0].summary}" src="${item?.pagemap?.metatags?.[0]?.['og:image']}">
          </div>
        </div>`);
    }
  });

  // 6. Main Web Results List (Line 2+)
  res.items.forEach((item, i) => {
    const originurl = new URL(item.link);
    let urlparam = (originurl.pathname.length > 1) ? originurl.pathname.replaceAll("/", " › ") : "";
    urlparam = urlparam.endsWith(" › ") ? urlparam.slice(0, -3) : urlparam;
    urlparam = originurl.origin + urlparam;

    const hasPri = (item?.pagemap?.offer?.[0]?.price && item.pagemap.offer[0].price !== "0") 
      ? `<div class="snippet"><span style="padding-top:2px">Price: ${item.pagemap.offer[0].price}</span></div>` : '';

    const displayUrl = item.displayLink;
    const siteName = item?.pagemap?.metatags?.[0]?.['og:site_name'] ?? displayUrl;
    const fdta = `tab-num="${i}" data-test="awokwok" data-ved="0" isMobile="${STATE.isMobile}" data-sx="maacaa-cihh"`;

    const snippet = (item?.pagemap?.question?.[0]?.text) 
      ? `${dateconversion(item.pagemap.question[0].datecreated, true)} - ${escapeHTML(item.pagemap.question[0].text)}` 
      : escapeHTML(item.snippet);

    let hasAns = "";
    if (item?.pagemap?.answer) {
      let bth = "";
      const validQuest = item.pagemap.question && item.pagemap.question.length > 1 && item.pagemap.question.length === item.pagemap.answer.length;
      const sc = (item.pagemap.answer.length > 1) ? `max-width:250px` : '';
      
      item.pagemap.answer.forEach((ans, index) => {
        bth += `<div class="snippet bgg" style="display:block;${sc}">
          ${(validQuest) ? `<span style="font-weight:500;margin-bottom:6px;color:#292828;">${item.pagemap.question[index].name}</span>` : ''}
          <span style="-webkit-line-clamp:4;" class="rawr">${escapeHTML(ans.text)}</span>
          ${(ans.upvotecount !== undefined) ? `<br><span style="font-size:12px;color:#474747;font-weight:500;">${ans.upvotecount} ${IS_ID ? "Suara" : "Votes"}</span>` : ''}
        </div>`;
      });
      if (bth) hasAns = `<div class="btm-snpt scl">${bth}</div>`;
    }

    const itemHTML = `
      <div class="VtuHV Kj7VF tab-result eb8xCva" ${fdta}>
        <div class="CeWka NbkAw">
          <div class="tab-link" data-number="${i}">
            <a href="${item.link}">
              <div class="top">
                <div class="favicon"><img src="${CONFIG.apiBase}/img/${encodeURL(originurl.hostname)}"></div>
                <div class="link-rw">
                  <div class="link">${escapeHTML(siteName)}</div>
                  <div class="link k">https://${item.displayLink}</div>
                </div>
              </div>
              <div class="title">${escapeHTML(item.title)}</div>
            </a>
          </div>
          <div class="btm-snpt">
            <div class="snippet rawr"><span>${snippet || langtext("noSiteInfo")}</span></div>
            ${hasPri}
            ${showLinks(item.link)}
          </div>
          ${hasAns}
        </div>
      </div>`;

    resultContainer.insertAdjacentHTML('beforeend', itemHTML);
  });

  // Favicon Settings check
  if (getSettings().favicon === false || FV == 0) {
    document.querySelectorAll(".favicon").forEach(elm => elm.remove());
  }

  // 7. Pagination Controls
  if (res.queries?.nextPage && isPageOne) {
    document.querySelector(".main-result").insertAdjacentHTML('beforeend', `<div class="show-wrapper"><div class="mXsk8"></div><button class="more">${langtext("more")}</button></div>`);
  }

  // 8. Trigger Sub-Injections
  if (isPageOne) {
    if (res.items.length > 9) fetchInstantAnswer();

    if (!res.spelling && /\b\w+\s+video(?:s)?\b/i.test(Q)) {
      fetch(`${CONFIG.apiBase}/api?q=${encodeURIComponent(Q)}&tbm=vid&maxResults=6`)
        .then(r => r.json()).then(fetchHeaderVideos).catch(() => {});
    }

    if (CONFIG.newsKeywords.includes(Q.toLowerCase())) {
      fetch(`${CONFIG.apiBase}/api?q=${encodeURIComponent(Q)}&hl=id&tbm=nws`)
        .then(r => r.json()).then(fetchHeaderNews).catch(() => {});
    }

    fetchRelatedSearches();
    showFooter();
  }

  updatePaginationState(res);
  scrollRestore();
}

function renderNewsResults(res) {
  const mainResult = document.querySelector(".main-result");
  try {
    res.items.forEach(item => {
      const publisher = item.pagemap?.metatags?.[0]?.['og:site_name'] || item.displayLink;
      const publishTimeSources = [
        item?.pagemap?.metatags?.[0]?.['article:published_time'],
        item?.pagemap?.newsarticle?.[0]?.datepublished,
        item?.pagemap?.newsarticle?.[0]?.datemodified
      ];
      const publishtime = publishTimeSources.find(time => time) ? dateconversion(publishTimeSources.find(time => time)) : "Published";
      const newssnippet = (STATE.windowWidth > 780) ? `<div class="snippet">${escapeHTML(item.snippet)}</div>` : "";
      const thumbimg = (item.pagemap?.cse_thumbnail) ? `<img class="thumb" src="${item.pagemap.cse_thumbnail[0].src}">` : "";

      mainResult.insertAdjacentHTML('beforeend', `
        <div class="tab-result nwst">
          <div class="snwt">
            <a href="${item.link}">
              ${thumbimg}
              <div class="top">
                <img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${item.link}&size=64" class="favicon">
                <div class="link">${escapeHTML(publisher)}</div>
              </div>
              <div class="title">${escapeHTML(item.title.slice(0, 70))}</div>
              ${newssnippet}
              <div class="publishtime">${publishtime}</div>
            </a>
          </div>
        </div>`);
    });
    if (STATE.startIndex === 1) showFooter();
  } catch (err) {
    if (!res.items) noresult();
  }
}

function renderVideoResults(res) {
  const mainResult = document.querySelector(".main-result");
  try {
    if (!res.items || res.items.length === 0) throw new Error("empty");
    res.items.forEach(item => {
      mainResult.insertAdjacentHTML('beforeend', `
        <div class="video-result">
          <a href="https://youtube.com/watch?v=${item.id.videoId}" data-number="1">
            <img src="${item.snippet.thumbnails.medium.url}" class="thumbnail">
            <div class="title">${escapeHTML(item.snippet.title)}</div>
            <div class="source">
              <div class="info">${timeAgo(item.snippet.publishTime)}</div>
              <div class="info"><img src="images/youtube.png" class="favicon"><div>${escapeHTML(item.snippet.channelTitle)}</div></div>
            </div>
          </a>
        </div>`);
    });
    if (STATE.startIndex === 1) showFooter();
  } catch (err) {
    document.querySelector(".result-wrapper")?.classList.add("CBpUsa");
    noresult();
  }
}

function fetchRelatedSearches() {
  fetch(`${CONFIG.apiBase}/suggest?q=${encodeURIComponent(Q)}`)
    .then(r => r.json())
    .then(res => {
      let rltn = "";
      const inputText = res.query.trim().toLowerCase();
      let count = 0;

      for (let i = 0; i < res.suggestions.length && count < 6; i++) {
        const suggestion = res.suggestions[i].trim();
        if (suggestion.toLowerCase() !== inputText) {
          rltn += `<a href="/search?q=${encodeURIComponent(suggestion)}" class="related">${capitalize(suggestion)}</a>`;
          count++;
        }
      }

      if (!rltn || count <= 4) return;

      const rltb = document.createElement("div");
      rltb.classList.add("related-search", "VtuHV");
      rltb.innerHTML = `<div class="YjKdl"><div class="title">${langtext("related")}</div></div><div class="search-list">${rltn}</div>`;

      document.querySelector(".main-result .result")?.appendChild(rltb);
      scrollRestore();
    }).catch(() => {});
}

// ==========================================
// 8. PAGINATION & FOOTER CONTROLS
// ==========================================
function updatePaginationState(res) {
  const showWrapper = document.querySelector(".show-wrapper");
  if (!showWrapper) return;

  if (STATE.startIndex >= CONFIG.maxPages || !res.queries?.nextPage) {
    showWrapper.remove();
    if (res.items && res.items.length > 9) {
      document.querySelector(".main-result").insertAdjacentHTML('beforeend', `
        <div class="tab-result eb8xCva" style="padding-top: 16px;">
          <div class="btm-snpt"><div class="snippet" style="font-size:16px;">Maaf. Untuk sementara waktu, kami perlu membatasi hasil pencarian yang muncul :p</div></div>
        </div>`);
    }
  } else {
    showWrapper.innerHTML = `<div class="mXsk8"></div><button class="more">${langtext("more")}</button>`;
  }
}

function loadMoreResults() {
  if (STATE.startIndex < CONFIG.maxPages && navigator.onLine) {
    const showWrapper = document.querySelector(".show-wrapper");
    if (showWrapper) {
      showWrapper.innerHTML = `<div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div>`;
    }
    STATE.startIndex += 10;
    setTimeout(submitSearch, 500);
  }
}

document.addEventListener('click', (e) => {
  if (e.target.matches('.show-wrapper .more')) {
    loadMoreResults();
  }
});

function noresult() {
  let nosugtext = "";
  for (let i = 0; i < 3; i++) {
    nosugtext += `<li>${langtext("noresultsug", i)}</li>`;
  }
  document.querySelector(".main-result").innerHTML += `
    <div class="tab-result Nrltf eb8xCva">
      <div class="title-black">${langtext("noresult")}</div>
      <div class="suggestion">${langtext("suggtext")}</div>
      <div>${nosugtext}</div>
    </div>`;
}

function showFooter() {
  if (document.querySelector(".footer")) return;
  document.querySelector(".QZjVU")?.insertAdjacentHTML('beforeend', `
    <section class="footer">
      <ul class="list">
        <li><a href="/settings">Settings</a></li>
        <li><a href="/">Privacy</a></li>
        <li><a href="/search?q=translate">Translate</a></li>
      </ul>
      <div class="copyright">©Copyright 2023</div>
    </section>`);
}

// ==========================================
// 9. ENTRY POINT
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  initSearchShell();
  submitSearch();
});
