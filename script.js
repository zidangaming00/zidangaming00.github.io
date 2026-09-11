/**
 * SEARCH ENGINE CORE - Refactored & Modernized
 */

// ==========================================
// 1. STATE & CONFIGURATION
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const Config = {
    q: (urlParams.get("q") || "").trim(),
    p: urlParams.get("p"),
    hl: urlParams.get("hl"),
    uf: urlParams.get("uf"),
    fv: urlParams.get("fv"),
    sf: urlParams.get("sf"),
    th: urlParams.get("th"),
    tbm: urlParams.get("tbm"),
    rested: false,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    windowWidth: window.innerWidth > 0 ? window.innerWidth : screen.width,
    startIndex: urlParams.get("p") > 1 ? parseInt(urlParams.get("p")) : 1,
    maxIndex: 30,
    sitelinksData: []
};

// Mengambil pengaturan dari Cookies
const settings = typeof getData === 'function' ? getData() : {};
const isIdLang = settings.lang === "id" || Config.hl === "id"; // pastikan mencocokkan "id" jika di cookie.js defaultnya "en"

const searchLangParam = isIdLang ? `&hl=${Config.hl}` : "";
const localLang = isIdLang ? "id-ID" : "en-US";

const isFaviconDisabled = Config.fv == 0 || settings.fv === 0 || settings.fv === false || settings.favicon === false || Config.fv === "0";

let searchParam = "";
searchParam += Config.uf == 1 ? "&uf=1" : "";
searchParam += isFaviconDisabled ? "&fv=0" : ""; // <-- Tambahkan baris ini
searchParam += Config.sf == 1 ? "&sf=1" : "";
searchParam += Config.th == 1 ? "&th=1" : "";


// ==========================================
// 2. DICTIONARY & LANGUAGE
// ==========================================
const LANG_DICT = {
    en: {
        news: "News result", more: "More search results", vidTitle: "Videos",
        related: "People also search for", placeholder: "Type to search...",
        correct: "Did you mean:", noresult: "No matching results",
        noSiteInfo: "There is no information on this page.", suggtext: "Search suggestion:", adlabel: "Ad",
        noresultsug: ["Try different keywords.", "Try more general keywords.", "Try fewer keywords."],
        tab: ["All", "Images", "Videos", "News", "Maps"],
    },
    id: {
        news: "Hasil berita <pre>Beta</pre>", more: "Hasil penelusuran lainnya", vidTitle: "Video",
        related: "Orang lain juga menelusuri", placeholder: "Ketik untuk mencari...",
        correct: "Apakah maksudmu:", noresult: "Tidak ditemukan hasil",
        noSiteInfo: "Tidak ada informasi mengenai halaman ini.", suggtext: "Saran pencarian:", adlabel: "Iklan",
        noresultsug: ["Coba kata kunci yang berbeda.", "Coba kata kunci yang lebih umum.", "Coba lebih sedikit kata kunci."],
        tab: ["Semua", "Gambar", "Video", "Berita", "Peta"],
    }
};

const getText = (key, index = null) => {
    const lang = isIdLang ? 'id' : 'en';
    return index !== null ? LANG_DICT[lang][key][index] : LANG_DICT[lang][key];
};


// ==========================================
// 3. UTILITIES
// ==========================================
const Utils = {
    capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
    escapeHTML: (str) => str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : "",
    insertAfter: (referenceNode, newNode) => referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling),
    
    timeAgo: (input) => {
        const date = input instanceof Date ? input : new Date(input);
        const formatter = new Intl.RelativeTimeFormat(localLang);
        const ranges = { years: 31536000, months: 2592000, weeks: 604800, days: 86400, hours: 3600, minutes: 60, seconds: 1 };
        const secondsElapsed = (date.getTime() - Date.now()) / 1000;
        
        for (let key in ranges) {
            if (ranges[key] < Math.abs(secondsElapsed)) {
                return formatter.format(Math.round(secondsElapsed / ranges[key]), key);
            }
        }
        return "Just now";
    },

    dateConversion: (val, shortMonth = false, skip = false) => {
        let parsedDate = new Date(val);
        if (isNaN(parsedDate)) {
            parsedDate = new Date(val.replace(/(\d{2}:\d{2}.*)/, "").trim());
            if (isNaN(parsedDate)) return "Invalid Date";
        }
        let year = parsedDate.getFullYear();
        let currentYear = new Date().getFullYear();
        let day = parsedDate.getDate();
        let month = parsedDate.toLocaleString(localLang, { month: shortMonth ? 'short' : 'long' });

        return (year === currentYear && !skip) ? Utils.timeAgo(parsedDate) : `${day} ${month} ${year}`;
    },

};


// ==========================================
// 4. API FETCHING
// ==========================================
const API = {
    baseUrl: 'https://datasearch.searchdata.workers.dev',
    
    fetchWeb: async (query, page) => {
        const langFilter = isIdLang ? `&gl=${Config.hl}&lr=lang_id&hl=id` : "";
        const res = await fetch(`${API.baseUrl}/api?q=${query}${langFilter}&page=${page}`);
        return res.json();
    },
    
    fetchVideo: async (query, limit = 100) => {
        const res = await fetch(`${API.baseUrl}/api?q=${query}&tbm=vid&maxResults=${limit}`);
        return res.json();
    },

    fetchNews: async (query) => {
        const langFilter = isIdLang ? `&gl=${Config.hl}&lr=lang_id&hl=id` : "";
        const res = await fetch(`${API.baseUrl}/api?q=${query}${langFilter}&tbm=nws`);
        return res.json();
    },

    fetchInstantAnswer: async (query) => {
        const res = await fetch(`${API.baseUrl}/?q=${query}`);
        return res.json();
    },
    
    fetchSuggestions: async (query) => {
        const res = await fetch(`${API.baseUrl}/suggest?q=${query}`);
        return res.json();
    }
};


// ==========================================
// 5. WIDGETS & INSTANT ANSWERS
// ==========================================
const Widgets = {
    renderInstantCard: (res) => {
        if (!res.snippet || res.snippet.length <= 100) return;
        const container = document.createElement("div");
        container.className = "instant-answer";

        let imageHtml = '';
        if (res.image) {
            imageHtml = `<img src="${res.image}" class="logo" alt="${res.title}" ${res.type ? 'style="border:1px solid #999"' : ''}>`;
        }

        let infoboxHtml = '';
        if (res.infobox && res.infobox.length > 0) {
            const items = res.infobox.slice(0, 2).map(info => {
                if (!info.value.trim()) return '';
                return `
                    <div class="infobox-item">
                        <div class="infobox-item__label">${info.label}</div>
                        <div class="infobox-item__value">${info.value}</div>
                    </div>
                `;
            }).join("");
            if (items) {
                infoboxHtml = `<div class="infobox">${items}</div>`;
            }
        }

        container.innerHTML = `
            <div class="title">${res.title}</div>
            ${imageHtml}
            <div class="summary-box">
                <div class="instant-answer__section-title">Ringkasan</div>
                <div class="summary-text">
                    <span class="snippet">${res.snippet.replace(/\<\/?(pre|code).*?\/?\>/g, "").slice(0, 220)}... </span>
                    <a href="${res.sourceUrl}" class="wikipedia">${res.source} ›</a>
                </div>
            </div>
            ${infoboxHtml}
        `;

        const wrapper = Config.windowWidth > 780 ? document.querySelector(".sidebar-panel") || (() => {
            const side = document.createElement("div"); side.className = "sidebar-panel";
            document.querySelector(".result-wrapper").appendChild(side);
            return side;
        })() : document.querySelectorAll(".result-card")[2];

        if (Config.windowWidth > 780) {
            wrapper.appendChild(container);
        } else {
            if (wrapper) {
                Utils.insertAfter(wrapper, container);
            } else {
                document.querySelector(".main-result").appendChild(container);
            }
        }
    },

    renderWidgets: () => {
        const query = Config.q.toLowerCase();
        const mainResult = document.querySelector(".main-result .results-list");
        if (!mainResult) return;
        
        const isTime = /jam|waktu|time|clock/.test(query) && query.length < 15 && query.split(" ").length < 4;
        const isDate = /tanggal|date/.test(query) && query.length < 15 && query.split(" ").length < 4;
        const isCalc = (/kalkulator|calculator/.test(query) && query.split(" ").length <= 2) || (/calculator\s+online|kalkulator\s+online/.test(query) && query.split(" ").length <= 3);
        const isTranslate = /translate|terjemah|terjemahan/.test(query);
        const d = new Date();

        if (isTime) {
            const timeStr = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
            const dateStr = `${d.toLocaleDateString(localLang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${d.toString().match(/([A-Z]+[\+-][0-9]+.*)/)[1]}`;
            mainResult.insertAdjacentHTML('beforeend', `<div class="result-card result-card--flat result-card--empty"><div class="big-title">${timeStr}</div><div class="snippet-info">${dateStr}</div></div>`);
        } 
        else if (isDate) {
            mainResult.insertAdjacentHTML('beforeend', `<div class="result-card result-card--flat result-card--empty"><div class="big-title">${d.toLocaleDateString(localLang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>`);
        } 
        else if (isCalc) {
            mainResult.insertAdjacentHTML('beforeend', `
                <div class="calculator">
                    <input type="text" inputmode="none" class="display" />
                    <div class="buttons">
                        <button class="operator" data-value="AC">AC</button><button class="operator" data-value="DEL">DEL</button>
                        <button class="operator" data-value="%">%</button><button class="operator" data-value=" ÷ ">÷</button>
                        <button data-value="7">7</button><button data-value="8">8</button><button data-value="9">9</button><button class="operator" data-value=" × ">×</button>
                        <button data-value="4">4</button><button data-value="5">5</button><button data-value="6">6</button><button class="operator" data-value=" - ">-</button>
                        <button data-value="1">1</button><button data-value="2">2</button><button data-value="3">3</button><button class="operator" data-value=" + ">+</button>
                        <button data-value="0">0</button><button data-value="00">00</button><button data-value=".">.</button><button class="operator" data-value="=" th="true">=</button>
                    </div>
                </div>`);
            Widgets.initCalculator();
        } 
        else if (isTranslate) {
            mainResult.insertAdjacentHTML('beforeend', `
                <div class="trnsl"><div class="wrpl"><ul class="controls">
                    <li class="row from"><div class="icons"><i class="fas fa-volume-up"></i><i class="fas fa-copy"></i></div><select></select></li>
                    <li class="exchange"><i class="fas fa-exchange-alt"></i></li>
                    <li class="row to"><select></select><div class="icons"><i class="fas fa-volume-up"></i><i class="fas fa-copy"></i></div></li>
                </ul>
                <div class="text-input"><textarea spellcheck="false" class="from-text" placeholder="Enter text"></textarea><textarea spellcheck="false" readonly disabled class="to-text" placeholder="Translation"></textarea></div></div></div>
            `);
            Widgets.initTranslator();
        }
    },

checkVideoWidget: async () => {
    const slot = document.getElementById("dynamic-video-widget-slot");
    if (!slot) return;
    try {
        const data = await API.fetchVideo(Config.q, 4);
        if (!data.items || !data.items.length) {
            slot.remove();
            return;
        }

        let videonya = "";
        let limit = Math.min(data.items.length, 4);
        for (let i = 0; i < limit; i++) {
            let item = data.items[i];
            let videoId = item.id.videoId || item.id;
            let title = Utils.escapeHTML(item.snippet.title);
            let thumb = item.snippet.thumbnails.medium.url;
            let channel = Utils.escapeHTML(item.snippet.channelTitle);
            let dateStr = Utils.dateConversion(item.snippet.publishTime);

            videonya += `
                <div class="video-widget-item">
                    <a href="https://youtube.com/watch?v=${videoId}">
                        <div class="video-widget-item__row">
                            <div class="thumbnail">
                                <img src="${thumb}">
                                <div class="video-widget-item__play">
                                    <span class="play-icon">
                                        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                            <circle fill="#fff" cx="12" cy="12" r="6.2"/>
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5"></path>
                                        </svg>
                                    </span>
                                </div>
                            </div>
                            <div class="video-widget-item__text">
                                <div class="video-widget-item__title">${title}</div>
                                <div class="video-widget-item__meta">YouTube<span class="dot"></span><div class="video-widget-item__channel">${channel}</div></div>
                                <div class="video-widget-item__date">${dateStr}</div>
                            </div>
                        </div>
                    </a>
                </div>`;
        }

        slot.className = "result-card video-widget result-card--flat";
        slot.innerHTML = `<div class="title video-widget__title">${getText("vidTitle")}</div><div class="video-widget__list">${videonya}</div>`;
    } catch (err) {
        slot.remove();
        console.log("Gagal memuat widget video:", err);
    }
},


    initCalculator: () => {
        const calculatorBox = document.querySelector(".calculator");
        if (!calculatorBox) return;
        const display = calculatorBox.querySelector(".display");
        let output = "";
        
        calculatorBox.querySelectorAll("button").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const val = e.target.dataset.value;
                if (val === "=" && output !== "") {
                    try { output = eval(output.replace("%", "/100").replace(/×/g, "*").replace(/÷/g, "/")); } catch { output = "Error"; }
                } else if (val === "AC") {
                    output = "";
                } else if (val === "DEL") {
                    output = output.toString().slice(0, -1);
                } else {
                    if (output === "" && ["%", "*", "/", "-", "+", "="].includes(val)) return;
                    output += val;
                }
                display.value = output;
                display.blur();
            });
        });
    },

    initTranslator: () => {
        // Daftar negara disingkat untuk keterbacaan, tambahkan sesuai aslinya jika perlu
        const countries = { en: "English", id: "Indonesian", es: "Spanish", fr: "French", de: "German", ja: "Japanese", ko: "Korean", zh: "Chinese" }; 
        const container = document.querySelector(".trnsl");
        if (!container) return;

        const fromText = container.querySelector(".from-text"), toText = container.querySelector(".to-text");
        const exchangeIcon = container.querySelector(".exchange"), selects = container.querySelectorAll("select");
        let isTranslating = false, timer;

        selects.forEach((sel, i) => {
            for (let code in countries) {
                let selected = (i === 0 && code === (isIdLang ? "id" : "en")) || (i === 1 && code === (isIdLang ? "en" : "id")) ? "selected" : "";
                sel.insertAdjacentHTML("beforeend", `<option value="${code}" ${selected}>${countries[code]}</option>`);
            }
            sel.addEventListener("change", translate);
        });

        exchangeIcon.addEventListener("click", () => {
            let tempVal = fromText.value; fromText.value = toText.value; toText.value = tempVal;
            let tempLang = selects[0].value; selects[0].value = selects[1].value; selects[1].value = tempLang;
            translate();
        });

        fromText.addEventListener("input", () => {
            clearTimeout(timer);
            if (!fromText.value) toText.value = "";
            else timer = setTimeout(translate, 500);
        });

        async function translate() {
            let text = fromText.value.trim();
            if (!text) return;
            toText.setAttribute("placeholder", "Translating...");
            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${selects[0].value}&tl=${selects[1].value}&dt=t&q=${encodeURI(text)}`);
                const data = await res.json();
                let output = "";
                data[0].forEach(item => output += item[0]);
                toText.value = output;
            } catch (err) {
                toText.value = "Translation error";
            }
        }
    }
};


// ==========================================
// 6. UI BUILDER & LOGIC
// ==========================================
const UI = {
  renderBase: () => {
    document.title = isIdLang ? `${Config.q} - Penelusuran` : `${Config.q} - Search`;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (settings.theme === "dark" || (settings.theme === "system" && prefersDark) || Config.th == 1) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    const svgIcons = { all: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 1C2.686 1 0 3.686 0 7C0 10.314 2.686 13 6 13C7.647 13 9.138 12.337 10.223 11.263L14.787 14.84C15.113 15.096 15.585 15.039 15.84 14.713C16.096 14.387 16.039 13.915 15.713 13.66L11.149 10.083C11.689 9.182 12 8.127 12 7C12 3.686 9.314 1 6 1ZM1.5 7C1.5 4.515 3.515 2.5 6 2.5C8.485 2.5 10.5 4.515 10.5 7C10.5 9.485 8.485 11.5 6 11.5C3.515 11.5 1.5 9.485 1.5 7Z"></path></svg>`, images: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 1C1.455 1 0 2.455 0 4.25V11.75C0 13.545 1.455 15 3.25 15H12.75C14.545 15 16 13.545 16 11.75V10.259C16 10.253 16 10.247 16 10.241V4.25C16 2.455 14.545 1 12.75 1H3.25ZM14.5 8.439V4.25C14.5 3.284 13.716 2.5 12.75 2.5H3.25C2.284 2.5 1.5 3.284 1.5 4.25V11.75C1.5 11.956 1.536 12.154 1.601 12.338L5.97 7.97C6.263 7.677 6.737 7.677 7.03 7.97L8 8.939L10.97 5.97C11.263 5.677 11.737 5.677 12.03 5.97L14.5 8.439ZM9.061 10L10.03 10.97C10.323 11.263 10.323 11.737 10.03 12.03C9.737 12.323 9.263 12.323 8.97 12.03L6.5 9.561L2.662 13.399C2.846 13.464 3.044 13.5 3.25 13.5H12.75C13.716 13.5 14.5 12.716 14.5 11.75V10.561L11.5 7.561L9.061 10Z"></path></svg>`, videos: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.489 5.55C15.38 6.636 15.38 9.364 13.489 10.45L6.231 14.616C4.348 15.698 2 14.338 2 12.166L2 3.834C2 1.662 4.348 0.303 6.231 1.384L13.489 5.55ZM12.742 9.149C13.629 8.64 13.629 7.36 12.742 6.851L5.485 2.685C4.601 2.178 3.5 2.816 3.5 3.834L3.5 12.166C3.5 13.185 4.601 13.823 5.485 13.316L12.742 9.149Z"></path></svg>`, news: `<svg width="16" height="16" viewBox="0 0 22 22" fill="#6e7780"><path d="M12 11h6v2h-6v-2zm-6 6h12v-2H6v2zm0-4h4V7H6v6zm16-7.22v12.44c0 1.54-1.34 2.78-3 2.78H5c-1.64 0-3-1.25-3-2.78V5.78C2 4.26 3.36 3 5 3h14c1.64 0 3 1.25 3 2.78zM19.99 12V5.78c0-.42-.46-.78-1-.78H5c-.54 0-1 .36-1 .78v12.44c0 .42.46.78 1 .78h14c.54 0 1-.36 1-.78V12zM12 9h6V7h-6v2"></path></svg>`, maps: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#6e7780"><path d="M8 8C9.105 8 10 7.105 10 6C10 4.895 9.105 4 8 4C6.895 4 6 4.895 6 6C6 7.105 6.895 8 8 8Z"></path></svg>` }; 
    const createTab = (id, tbmVal, icon, label) => `<div class="search-item"><a href="/search?q=${encodeURIComponent(Config.q).replace(/%20/g,'+')}${tbmVal}${searchLangParam}${searchParam}" class="tab-wrapper" tab-id="${id}"><div class="label">${Config.windowWidth >= 780 ? svgIcons[icon] : ''}<span>${getText("tab", label)}</span></div></a></div>`; 
    
    document.body.innerHTML = ` 
      <div class="app" id="main-bx"> 
        <div class="page-header"> 
          <div class="page-header__inner"> 
            <div class="logo-slot"><a title="Kembali" href="/"><img alt="Logo" src="/images/logo.png"></a></div> 
            <div class="header"> 
              <div class="search-box"> 
                <div class="search-field"> 
                  <input type="search" id="sear_21829_input" value="${Utils.escapeHTML(Config.q.trim())}" name="q" class="search-input" autocomplete="off" placeholder="${getText("placeholder")}"> 
                  <div role="button" class="search-toggle inpbtun" id="xclarGh" title="Cari"></div> 
                  <div role="button" class="cleartext inpbtun" style="display:none" id="Chasprn" title="Hapus"></div> 
                </div> 
              </div> 
              <div class="search-menu"> 
                ${createTab("all", "", "all", 0)} 
                ${createTab("images", "&tbm=isch", "images", 1)} 
                ${createTab("videos", "&tbm=vid", "videos", 2)} 
                ${createTab("news", "&tbm=nws", "news", 3)} 
                ${createTab("maps", "", "maps", 4)} 
              </div> 
            </div> 
          </div> 
        </div> 
        <div class="results-section"> 
          <div class="result-wrapper"><div class="main-result"></div></div> 
        </div> 
      </div> `; 
    UI.setupEventListeners(); 
  },


    setupEventListeners: () => {
        const searchInput = document.querySelector(".search-input");
        const clearBtn = document.querySelector(".cleartext");
        const toggleBtn = document.querySelector(".search-toggle");

        if (!searchInput) return;

        // PERBAIKAN 1: Cek langsung saat halaman dimuat apakah input sudah ada isinya (dari URL)
        if (searchInput.value.trim() && clearBtn) {
            clearBtn.style.display = "block";
        }

        searchInput.addEventListener('input', () => {
            if (clearBtn) clearBtn.style.display = searchInput.value ? "block" : "none";
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => { 
                searchInput.value = ""; 
                searchInput.focus(); 
                clearBtn.style.display = "none"; 
            });
        }

        searchInput.addEventListener('keyup', (e) => { 
            if (e.key === "Enter" && toggleBtn) toggleBtn.click(); 
        });
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (searchInput.value.trim()) {
                    const searchData = Config.tbm ? `&tbm=${Config.tbm}` : "";
                    window.location.href = `/search?q=${encodeURIComponent(searchInput.value).replace(/%20/g,'+')}${searchData}${searchLangParam}${searchParam}`;
                }
            });
        }
        
        document.addEventListener('click', e => { if (e.target.matches('.show-wrapper .more')) handlePagination(); });
    },

    setupTabStyles: () => {
        const items = document.querySelectorAll(".search-item");
        const mainResult = document.querySelector(".main-result");

        if (Config.tbm === "vid") {
            items[2].classList.add("selected");
            mainResult.classList.add("video-grid");
        } else if (Config.tbm === "isch") {
            items[1].classList.add("selected");
            mainResult.innerHTML = `<div class="show-wrapper"><div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div></div>`;
            const script = document.createElement("script"); script.src = "/imgtest.js"; document.body.appendChild(script);
        } else if (Config.tbm === "nws") {
            items[3].classList.add("selected");
        } else {
            items[0].classList.add("selected");
            mainResult.innerHTML += `<div class="results-list"></div>`;
        }
    },

    renderFooter: () => {
        if (!document.querySelector(".footer")) {
            document.querySelector(".results-section").insertAdjacentHTML('beforeend', `
                <section class="footer">
                    <ul class="list"><li><a href="/settings">Settings</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/search?q=translate">Translate</a></li></ul>
                    <div class="copyright">©Copyright ${new Date().getFullYear()}</div>
                </section>
            `);
        }
    },

    renderEmptyState: () => {
        const list = Array(3).fill(0).map((_, i) => `<li>${getText("noresultsug", i)}</li>`).join("");
        document.querySelector(".main-result").innerHTML += `
            <div class="result-card result-card--empty result-card--flat">
                <div class="title-black">${getText("noresult")}</div>
                <div class="suggestion">${getText("suggtext")}</div>
                <div><ul>${list}</ul></div>
            </div>`;
    },

    handleErrorState: () => {
        document.head.innerHTML = `<style>*{margin:0;padding:0}html{font:15px/22px arial,sans-serif;background:#fff;color:#222;padding:15px}body{margin:7% auto 0;max-width:390px;min-height:180px;padding:30px 0 15px}#error{font-size:40px;font-weight:bold;color:black}</style>`;
        document.body.innerHTML = `<span id="error">ERROR</span><p><b>503.</b> That’s an error.</p><p>Site under maintenance.</p>`;
        document.title = "Error 503";
    }
};


// ==========================================
// 7. MAIN EXECUTION & RENDER LOGIC
// ==========================================

async function performSearch() {
    try {
        if (Config.tbm === "vid") {
            const data = await API.fetchVideo(Config.q);
            renderVideos(data);
        } else if (Config.tbm === "nws") {
            const data = await API.fetchNews(Config.q);
            renderNews(data);
        } else if (!["vid", "isch", "nws"].includes(Config.tbm)) {
            const data = await API.fetchWeb(Config.q, Config.startIndex);
            renderWebResults(data);
            if (Config.startIndex === 1) checkInstantAnswers();
        }
    } catch (err) {
        if (Config.startIndex === 1) UI.renderEmptyState();
    }
}

function renderVideos(res) {
    const container = document.querySelector(".main-result");
    if (!res.items || !res.items.length) { UI.renderEmptyState(); return; }
    
    res.items.forEach(item => {
        container.insertAdjacentHTML('beforeend', `
            <div class="video-card">
                <a href="https://youtube.com/watch?v=${item.id.videoId}">
                    <img src="${item.snippet.thumbnails.medium.url}" class="thumbnail">
                    <div class="title">${item.snippet.title}</div>
                    <div class="source">
                        <div class="info">${Utils.timeAgo(item.snippet.publishTime)}</div>
                        <div class="info"><img src="images/youtube.png" class="favicon"><div>${item.snippet.channelTitle}</div></div>
                    </div>
                </a>
            </div>
        `);
    });
    if (Config.startIndex === 1) UI.renderFooter();
    handlePaginationUi("stop", res);
}

function renderNews(res) {
    const container = document.querySelector(".main-result");
    if (!res.items || !res.items.length) { UI.renderEmptyState(); return; }

    res.items.forEach(item => {
        const publisher = item.pagemap?.metatags?.[0]?.['og:site_name'] || item.displayLink;
        const pubTime = [item.pagemap?.metatags?.[0]?.['article:published_time'], item.pagemap?.newsarticle?.[0]?.datepublished].find(Boolean);
        const timeStr = pubTime ? Utils.dateConversion(pubTime) : "Published";
        const thumb = item.pagemap?.cse_thumbnail ? `<img class="thumb" src="${item.pagemap.cse_thumbnail[0].src}">` : "";
        const snippet = Config.windowWidth > 780 ? `<div class="snippet">${item.snippet}</div>` : "";

        container.insertAdjacentHTML('beforeend', `
            <div class="result-card news-card"><div class="news-card__body">
                <a href="${item.link}">${thumb}
                    <div class="top"><img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&url=${item.link}&size=64" class="favicon"><div class="link">${publisher}</div></div>
                    <div class="title">${item.title.slice(0, 70)}</div>${snippet}<div class="publishtime">${timeStr}</div>
                </a>
            </div></div>
        `);
    });
    if (Config.startIndex === 1) UI.renderFooter();
}

// ==========================================
// KODE YANG SUDAH DISESUAIKAN (BAGIAN RENDER WEB & WIDGET VIDEO)
// ==========================================

function renderWebResults(res) {
  const container = document.querySelector(".main-result .results-list");
  const isFirstPage = Config.startIndex === 1;
  if (!res.items) {
    if (isFirstPage) UI.renderEmptyState();
    return;
  }
  if (isFirstPage) {
    if (Config.windowWidth > 700) {
      document.querySelector(".main-result").insertAdjacentHTML('afterbegin', `<div class="result-stats">${isIdLang ? `Sekitar ${res.searchInformation.formattedTotalResults} hasil (${res.searchInformation.formattedSearchTime} detik)` : `Approximately ${res.searchInformation.formattedTotalResults} result (${res.searchInformation.formattedSearchTime} seconds)`}</div>`);
    }
    if (res.spelling) {
      container.insertAdjacentHTML('beforeend', `<div class="corrected-word result-card result-card--flat"><div class="snippet">${getText("correct")} <a href="/search?q=${encodeURIComponent(res.spelling.correctedQuery)}${searchLangParam}">${res.spelling.correctedQuery}</a><span>?</span></div></div>`);
    }
    Widgets.renderWidgets();
  }

  res.items.forEach((item, i) => {
    const originUrl = new URL(item.link);
    const siteName = item.pagemap?.metatags?.[0]?.['og:site_name'] || item.displayLink;
    const snippet = item.pagemap?.question?.[0]?.text ? `${Utils.dateConversion(item.pagemap.question[0].datecreated, true)} - ${Utils.escapeHTML(item.pagemap.question[0].text)}` : Utils.escapeHTML(item.snippet);
    
    const faviconHtml = isFaviconDisabled ? "" : `<div class="favicon"><img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${item.link}&size=64"></div>`;

container.insertAdjacentHTML('beforeend', `
  <div class="result-card result-card--flat">
    <div class="tab-link">
      <a href="${item.link}">
        <div class="top">
          ${faviconHtml}
          <div class="link-rw"><div class="link">${siteName}</div><div class="link link--meta">${item.displayLink}</div></div>
        </div>
        <div class="title">${Utils.escapeHTML(item.title)}</div>
      </a>
    </div>
    <div class="btm-snpt"><div class="snippet"><span>${snippet || getText("noSiteInfo")}</span></div></div>
  </div>
`);

    // 1. RESERVASI TEMPAT: Sisipkan slot kosong tepat setelah hasil web ke-2 (Indeks 1)
    if (i === 1 && isFirstPage) {
      container.insertAdjacentHTML('beforeend', `<div id="dynamic-video-widget-slot"></div>`);
    }
  });

  // Jika hasil web kurang dari 2, taruh slot di bagian akhir
  if (res.items.length < 2 && isFirstPage) {
    container.insertAdjacentHTML('beforeend', `<div id="dynamic-video-widget-slot"></div>`);
  }

  // 2. Jalankan pemuatan video secara asynchronous di background
  if (isFirstPage) {
    Widgets.checkVideoWidget();
  }

  if (res.queries?.nextPage && isFirstPage) {
    document.querySelector(".main-result").insertAdjacentHTML('beforeend', `<div class="show-wrapper"><button class="more">${getText("more")}</button></div>`);
  }

  if (isFirstPage) {
    UI.renderFooter();
    API.fetchSuggestions(Config.q).then(sug => {
      if(sug.suggestions && sug.suggestions.length) {
        const list = sug.suggestions.slice(0,5).map(s => `<a href="/search?q=${s}" class="related">${Utils.capitalize(s)}</a>`).join("");
        container.insertAdjacentHTML('beforeend', `<div class="related-search"><div class="title">${getText("related")}</div><div class="search-list">${list}</div></div>`);
      }
    });
  } 
  handlePaginationUi("stop", res);

  if (settings.newtab) document.querySelectorAll(".main-result a").forEach(a => a.target = "_blank");
}


async function checkInstantAnswers() {
    const queryMap = { "yahoo": "yahoo!", "notch": "markus persson", "bing": "microsoft bing", "bard": "google bard", "apple": "apple inc", "ronaldo": "cristiano ronaldo", "messi": "lionel messi" };
    const exactQuery = queryMap[Config.q.toLowerCase()] || Config.q;
    
    try {
        const res = await API.fetchInstantAnswer(exactQuery);
        if (res && res.snippet) Widgets.renderInstantCard(res);
    } catch(e) {}
}

function handlePaginationUi(cmd, res) { 
  const wrapper = document.querySelector(".show-wrapper"); 
  if (!wrapper) return; 
  if (cmd === "start") { 
    // Memunculkan kembali animasi loading circle saat tombol dipencet
    wrapper.innerHTML = `<div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div>`; 
    Config.startIndex += 10; 
    setTimeout(performSearch, 500); 
  } else if (Config.startIndex >= Config.maxIndex || !res?.queries?.nextPage) { 
    wrapper.remove(); 
  } else { 
    wrapper.innerHTML = `<div class="pagination-divider"></div><button class="more">${getText("more")}</button>`; 
  } 
}


function handlePagination() { handlePaginationUi("start"); }

// ==========================================
// 8. INITIALIZE APPLICATION
// ==========================================
function initApp() {
    if (Config.rested) {
        UI.handleErrorState();
        return;
    }
    
    if (!Config.q || window.location.pathname.match(".html")) {
        window.location.href = "/";
    } else if (Config.q && navigator.onLine) {
        UI.renderBase();
        UI.setupTabStyles();
        performSearch();
    }
}

// Jalankan saat dokumen siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
