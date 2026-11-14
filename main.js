'use strict';
/*
 * snowdian — снег, иней, сугробы на словах и метель на весь файл.
 *  - Слово заметает сугробом → води по нему лопатой (курсором), пока не расчистишь.
 *  - Метель заметает весь файл → курсор превращается в снегоуборочную машину, чисти.
 *  - По краям экрана — иней.
 * Команды (Ctrl/Cmd+P): «snowdian: метель сейчас», «snowdian: замести слово».
 */

var Base = null;
try { Base = require("obsidian").Plugin; } catch (e) { Base = null; }
if (!Base) Base = function () {};
var PST = null;
try { PST = require("obsidian").PluginSettingTab; } catch (e) { PST = null; }
var Setting = null;
try { Setting = require("obsidian").Setting; } catch (e) { Setting = null; }

var DEFAULTS = { lang: "auto", snow: true, frost: true, ice: true, golden: true, tree: true, xp: 0, garland: true, gMode: "twinkle", gPalette: "classic", gSpeed: 1, drifts: true, blizzard: true, density: 1, hud: true, sleet: true, money: 0, drops: 0, ups: {} };

var STORM_MULT = 3;      // множитель денег за уборку метели
var WORD_PAY = 6;        // за сугроб на слове
var STORM_BASE = 40;     // сколько всего даёт метель целиком (до множителя ×STORM_MULT)
var STORM_BONUS = 60;    // бонус за полную очистку метели
var PUDDLE_PAY = 1;      // капельки за лужу
var ICE_PAY = 3;         // ❄ за кусок льда
var GOLDEN_MS = 30000;   // длительность бонуса золотой снежинки
var UPGRADES = [
  { id: "shovel", icon: "🪏", base: 40, max: 8 },
  { id: "plow", icon: "🚜", base: 60, max: 6 },
  { id: "value", icon: "💰", base: 80, max: 10 },
  { id: "weather", icon: "🌨", base: 70, max: 6 },
  { id: "helper", icon: "🧑‍🔧", base: 150, max: 5 },
  { id: "broom", cur: "drops", icon: "🧹", base: 4, max: 8 },
  { id: "duck", cur: "drops", icon: "🦆", base: 10, max: 1 },
  { id: "rainbow", cur: "drops", icon: "🌈", base: 20, max: 1 },
  { id: "scraper", cur: "drops", icon: "🪒", base: 6, max: 5 },
  { id: "ornaments", cur: "drops", icon: "🎀", base: 8, max: 1 },
  { id: "skin", icon: "🎨", base: 250, max: 1 }
];

var I18N = {
  ru: {
    "plugin.name": "snowdian",
    "cmd.blizzard": "snowdian: метель сейчас",
    "cmd.drift": "snowdian: замести слово",
    "cmd.sleet": "snowdian: снег с дождём",
    "cmd.shop": "snowdian: магазин",
    "cmd.clear": "snowdian: растопить всё",

    "up.shovel.name": "Широкая лопата",
    "up.shovel.desc": "Сугробы на словах счищаются быстрее",
    "up.plow.name": "Широкий отвал",
    "up.plow.desc": "Машина чистит более широкую полосу",
    "up.value.name": "Звонкий снег",
    "up.value.desc": "+15% к ❄ за весь снег",
    "up.weather.name": "Метеосводка",
    "up.weather.desc": "Сугробы и метели приходят чаще",
    "up.helper.name": "Дворник-помощник",
    "up.helper.desc": "Сам приходит и убирает сугробы и лужи (за полцены)",
    "up.broom.name": "Хорошая метёлка",
    "up.broom.desc": "Лужи убираются быстрее",
    "up.duck.name": "Резиновая уточка",
    "up.duck.desc": "В каждой луже плавает уточка",
    "up.rainbow.name": "Радуга",
    "up.rainbow.desc": "После снега с дождём встаёт радуга: +8 ❄ за каждую убранную лужу",
    "up.scraper.name": "Скребок",
    "up.scraper.desc": "Лёд счищается быстрее",
    "up.ornaments.name": "Украшения на ёлке",
    "up.ornaments.desc": "Ёлка в углу наряжается шарами и звёздой",
    "up.skin.name": "Красная машина",
    "up.skin.desc": "Новая покраска снегоуборщика",

    "hud.shop": "Магазин",
    "hud.sec": "с",
    "shop.title": "Лавка снегоуборщика",
    "shop.balance": "У тебя: ❄ {m}   💧 {d}",
    "shop.level": "ур. {l}/{max}",
    "shop.owned": "Куплено",
    "shop.foot": "Сугроб: {w} ❄ · Лужа: {p} 💧 · Метель: ~{s} + бонус {b} ❄",

    "toast.golden": "Золотая снежинка! Двойной доход 30 сек",
    "toast.sleet": "🌧 Снег с дождём — будут сугробы и лужи",
    "toast.level": "Зимний уровень {n}! Доход выше",

    "blizzard.hint": "Метель! Файл замело — води снегоуборочной машиной",
    "blizzard.banner": "❄ МЕТЕЛЬ ×{m}",
    "blizzard.cleared": "Метель убрана!",
    "blizzard.bonus": "бонус за уборку +{b}",

    "settings.title": "snowdian",
    "settings.lang": "Язык интерфейса",
    "settings.lang.desc": "Авто — как в Obsidian",
    "settings.lang.auto": "Авто",
    "settings.toggles": "Что показывать",
    "settings.snow": "Снегопад",
    "settings.snow.desc": "Лёгкий снег по всему экрану",
    "settings.frost": "Иней по краям",
    "settings.frost.desc": "Замёрзшая виньетка",
    "settings.hud": "Счёт в углу",
    "settings.hud.desc": "Показывать счёт и кнопку магазина",
    "settings.garland": "Гирлянда",
    "settings.garland.desc": "Мигающая гирлянда вдоль верхнего края",
    "settings.drifts": "Сугробы на словах",
    "settings.drifts.desc": "Слова заметает, чистить лопатой",
    "settings.sleet": "Снег с дождём",
    "settings.sleet.desc": "Сугробы и лужи под словами, лужи убирать метёлкой",
    "settings.blizzard": "Метель",
    "settings.blizzard.desc": "Время от времени заметает весь файл",
    "settings.ice": "Лёд на словах",
    "settings.ice.desc": "Редкие ледяные корки, их счищает скребок",
    "settings.tree": "Ёлка в углу",
    "settings.tree.desc": "Растёт с зимним уровнем, наряжается за 💧",
    "settings.golden": "Золотая снежинка",
    "settings.golden.desc": "Иногда падает золотая снежинка: клик даёт двойной доход",
    "settings.gmode": "Режим гирлянды",
    "settings.gmode.desc": "Как переливаются лампочки",
    "settings.gpalette": "Цвета гирлянды",
    "settings.gspeed": "Скорость гирлянды",
    "settings.density": "Густота снега",

    "mode.twinkle": "Мерцание",
    "mode.steady": "Ровный свет",
    "mode.blink": "Попеременное мигание",
    "mode.chase": "Бегущие огни",
    "mode.wave": "Волна",
    "mode.breathe": "Дыхание",
    "mode.sparkle": "Искры",
    "pal.classic": "Разноцветная",
    "pal.rainbow": "Радужная",
    "pal.warm": "Тёплая белая",
    "pal.cold": "Холодная белая",
    "pal.xmas": "Красно-зелёная",
    "pal.candy": "Розово-белая",
    "pal.aurora": "Северное сияние"
  },
  en: {
    "plugin.name": "snowdian",
    "cmd.blizzard": "snowdian: blizzard now",
    "cmd.drift": "snowdian: bury a word",
    "cmd.sleet": "snowdian: sleet",
    "cmd.shop": "snowdian: shop",
    "cmd.clear": "snowdian: clear everything",

    "up.shovel.name": "Wide shovel",
    "up.shovel.desc": "Word drifts are cleared faster",
    "up.plow.name": "Wide plow",
    "up.plow.desc": "The snowplow clears a wider strip",
    "up.value.name": "Chiming snow",
    "up.value.desc": "+15% ❄ for all snow",
    "up.weather.name": "Weather forecast",
    "up.weather.desc": "Drifts and blizzards come more often",
    "up.helper.name": "Janitor helper",
    "up.helper.desc": "Comes by and clears drifts and puddles (half pay)",
    "up.broom.name": "Good broom",
    "up.broom.desc": "Puddles are cleared faster",
    "up.duck.name": "Rubber duck",
    "up.duck.desc": "A duck floats in every puddle",
    "up.rainbow.name": "Rainbow",
    "up.rainbow.desc": "After sleet a rainbow appears: +8 ❄ per cleared puddle",
    "up.scraper.name": "Ice scraper",
    "up.scraper.desc": "Ice is cleared faster",
    "up.ornaments.name": "Tree ornaments",
    "up.ornaments.desc": "The corner tree gets baubles and a star",
    "up.skin.name": "Red plow",
    "up.skin.desc": "A fresh paint job for the snowplow",

    "hud.shop": "Shop",
    "hud.sec": "s",
    "shop.title": "Snowplow shop",
    "shop.balance": "You have: ❄ {m}   💧 {d}",
    "shop.level": "lv. {l}/{max}",
    "shop.owned": "Owned",
    "shop.foot": "Drift: {w} ❄ · Puddle: {p} 💧 · Blizzard: ~{s} + bonus {b} ❄",

    "toast.golden": "Golden snowflake! Double income for 30 s",
    "toast.sleet": "🌧 Sleet — expect drifts and puddles",
    "toast.level": "Winter level {n}! Income up",

    "blizzard.hint": "Blizzard! The file is snowed in — drive the snowplow",
    "blizzard.banner": "❄ BLIZZARD ×{m}",
    "blizzard.cleared": "Blizzard cleared!",
    "blizzard.bonus": "cleanup bonus +{b}",

    "settings.title": "snowdian",
    "settings.lang": "Interface language",
    "settings.lang.desc": "Auto follows Obsidian",
    "settings.lang.auto": "Auto",
    "settings.toggles": "What to show",
    "settings.snow": "Snowfall",
    "settings.snow.desc": "Light snow across the screen",
    "settings.frost": "Frost on the edges",
    "settings.frost.desc": "A frozen vignette",
    "settings.hud": "Score in the corner",
    "settings.hud.desc": "Show the score and the shop button",
    "settings.garland": "Garland",
    "settings.garland.desc": "Twinkling lights along the top edge",
    "settings.drifts": "Word drifts",
    "settings.drifts.desc": "Words get snowed over, clear them with a shovel",
    "settings.sleet": "Sleet",
    "settings.sleet.desc": "Drifts and puddles under words, clear puddles with a broom",
    "settings.blizzard": "Blizzard",
    "settings.blizzard.desc": "Now and then buries the whole file",
    "settings.ice": "Ice on words",
    "settings.ice.desc": "Rare ice crusts, scrape them off",
    "settings.tree": "Corner tree",
    "settings.tree.desc": "Grows with your winter level, decorated with 💧",
    "settings.golden": "Golden snowflake",
    "settings.golden.desc": "A golden snowflake sometimes falls: click it for double income",
    "settings.gmode": "Garland mode",
    "settings.gmode.desc": "How the bulbs shimmer",
    "settings.gpalette": "Garland colors",
    "settings.gspeed": "Garland speed",
    "settings.density": "Snow density",

    "mode.twinkle": "Twinkle",
    "mode.steady": "Steady",
    "mode.blink": "Alternating blink",
    "mode.chase": "Running lights",
    "mode.wave": "Wave",
    "mode.breathe": "Breathing",
    "mode.sparkle": "Sparkles",
    "pal.classic": "Multicolor",
    "pal.rainbow": "Rainbow",
    "pal.warm": "Warm white",
    "pal.cold": "Cool white",
    "pal.xmas": "Red & green",
    "pal.candy": "Candy",
    "pal.aurora": "Aurora"
  }
};

function rnd(a, b) { return a + Math.random() * (b - a); }
function el(tag, cls, parent) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  (parent || document.body).appendChild(n);
  return n;
}
function kill(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }

var WORKER_SVG =
  '<svg viewBox="0 0 40 44" width="40" height="44">' +
  '<g class="leg l1"><rect x="14" y="30" width="5" height="13" rx="2" fill="#2d3a5a"/><rect x="12" y="40" width="9" height="4" rx="2" fill="#3a2a1a"/></g>' +
  '<g class="leg l2"><rect x="21" y="30" width="5" height="13" rx="2" fill="#243049"/><rect x="19" y="40" width="9" height="4" rx="2" fill="#3a2a1a"/></g>' +
  '<g class="wbody"><rect x="11" y="15" width="18" height="18" rx="6" fill="#e0572f"/>' +
  '<rect x="11" y="17" width="18" height="4" fill="#f7f3e8"/>' +
  '<circle cx="20" cy="9" r="7" fill="#f2c9a0"/><path d="M12.5 8 Q20 -3 27.5 8 Z" fill="#2b6cb0"/><circle cx="20" cy="-1" r="2.6" fill="#fff"/>' +
  '<circle cx="23" cy="9" r="1" fill="#222"/></g>' +
  '<g class="arm"><rect x="22" y="17" width="5" height="11" rx="2.5" fill="#c84a25"/>' +
  '<rect class="sh" x="26" y="20" width="14" height="2.4" rx="1" fill="#8a5a2b"/><path class="sh" d="M36 17 H42 L41 27 H37 Z" fill="#9aa5b1" stroke="#4a4f55" stroke-width=".8"/>' +
  '<rect class="br" x="26" y="20" width="13" height="2.2" rx="1" fill="#8a5a2b"/><path class="br" d="M37 17 L43 15 L44 28 L38 27 Z" fill="#d6b25a" stroke="#7a5a1a" stroke-width=".8"/></g>' +
  '</svg>';

var PLOW_SVG =
  '<svg viewBox="0 0 170 90"><g class="body">' +
  // лопата-отвал (спереди справа)
  '<path d="M150 18 L168 10 L168 82 L150 74 Z" fill="#c9cdd2" stroke="#4a4f55" stroke-width="2"/>' +
  '<path d="M154 24 L164 20 M154 40 L164 38 M154 56 L164 56" stroke="#8b9097" stroke-width="2"/>' +
  // кузов
  '<rect x="30" y="34" width="122" height="34" rx="5" fill="#f2b705" stroke="#5a4300" stroke-width="2"/>' +
  // кабина
  '<path d="M100 34 L112 14 H146 V34 Z" fill="#f2b705" stroke="#5a4300" stroke-width="2"/>' +
  '<path d="M114 18 H142 V32 H106 Z" fill="#bfe4f7" stroke="#5a4300" stroke-width="1.5"/>' +
  // кузов сзади
  '<rect x="6" y="40" width="36" height="28" rx="4" fill="#d89f00" stroke="#5a4300" stroke-width="2"/>' +
  // мигалка
  '<rect class="beacon" x="122" y="8" width="12" height="7" rx="2" fill="#ff7a00"/>' +
  // колёса
  '<circle cx="46" cy="72" r="13" fill="#2b2b2b"/><circle cx="46" cy="72" r="5" fill="#999"/>' +
  '<circle cx="124" cy="72" r="13" fill="#2b2b2b"/><circle cx="124" cy="72" r="5" fill="#999"/>' +
  // фара
  '<circle cx="150" cy="48" r="4" fill="#fff6b0"/>' +
  '</g></svg>';

module.exports = (function () {
  class WinterSnow extends Base {
    constructor(app, manifest) {
      super(app, manifest);
      this.flakes = [];
      this.drifts = [];
      this.workers = [];
      this.rain = []; this.sleet = null; this.sleetK = 0;
      this.blizzard = null;
      this.wind = 0;
      this.storm = 0;           // 0..1 — сила метели для снегопада
      this.stormTarget = 0;
      this.timers = [];
      this.mouse = { x: -999, y: -999, px: null, py: null };
      this.settings = Object.assign({}, DEFAULTS); this.settings.ups = {};
    }

    /* ---------- язык ---------- */
    detectLang() {
      var pref = this.settings && this.settings.lang;
      if (pref === "ru" || pref === "en") return pref;
      var o = "";
      try { o = window.localStorage.getItem("language") || ""; } catch (e) {}
      if (!o) { try { o = navigator.language || navigator.userLanguage || "en"; } catch (e) { o = "en"; } }
      return /^ru/i.test(o) ? "ru" : "en";
    }

    t(key, vars) {
      if (!this.langCode) this.langCode = this.detectLang();
      var pack = I18N[this.langCode] || I18N.ru;
      var str = pack[key];
      if (str == null) str = I18N.ru[key];
      if (str == null) str = key;
      if (vars) for (var k in vars) str = str.split("{" + k + "}").join(vars[k]);
      return str;
    }

    applyLang() {
      this.langCode = null;
      var self = this;
      (this.cmdRefs || []).forEach(function (p) { try { p[0].name = self.t(p[1]); } catch (e) {} });
      try { if (this.app.commands && this.app.commands.reloadCommands) this.app.commands.reloadCommands(); } catch (e) {}
      if (this.hudShopBtn) this.hudShopBtn.textContent = this.t("hud.shop");
      this.updateHud(false);
    }

    async onload() {
      try {
        var saved = await this.loadData();
        if (saved) { Object.assign(this.settings, saved); this.settings.ups = Object.assign({}, saved.ups || {}); }
      } catch (e) {}
      this.langCode = this.detectLang();
      this.build();
      this.buildHud();
      this.buildTree();
      this.scheduleHelper();

      this.cmdRefs = [];
      var reg = (id, key, cb) => this.cmdRefs.push([this.addCommand({ id: id, name: this.t(key), callback: cb }), key]);
      reg("blizzard-now", "cmd.blizzard", () => this.startBlizzard());
      reg("drift-word", "cmd.drift", () => this.spawnDrift());
      reg("sleet", "cmd.sleet", () => { if (!this.sleet && !this.blizzard) this.startSleet(); });
      reg("shop", "cmd.shop", () => this.toggleShop());
      reg("clear-all", "cmd.clear", () => this.clearAll());
      if (PST && Setting) this.addSettingTab(this.makeTab());

      this.onMove = (e) => this.handleMove(e);
      document.addEventListener("mousemove", this.onMove, true);
      this.lastKey = 0;
      this.onKey = () => { this.lastKey = performance.now(); };
      document.addEventListener("keydown", this.onKey, true);
      this.onResize = () => this.resize();
      window.addEventListener("resize", this.onResize);

      this.loop = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loop);

      this.later(() => this.scheduleDrift(), 15000);
      this.later(() => this.scheduleBlizzard(), rnd(70000, 120000));
      this.later(() => this.scheduleSleet(), rnd(35000, 70000));
      this.later(() => this.scheduleIce(), rnd(60000, 110000));
      this.later(() => this.scheduleGolden(), rnd(90000, 150000));
    }

    onunload() {
      cancelAnimationFrame(this.raf);
      this.timers.forEach(clearTimeout);
      document.removeEventListener("mousemove", this.onMove, true);
      document.removeEventListener("keydown", this.onKey, true);
      window.removeEventListener("resize", this.onResize);
      this.clearAll();
      this.goldenUntil = 0;
      kill(this.treeWrap);
      kill(this.snowCanvas); kill(this.frost); kill(this.garlandCanvas); kill(this.hud); kill(this.shop); this.workers.forEach(function (w) { kill(w.node); }); this.saveNow();
      document.body.classList.remove("winter-shovel", "winter-broom", "winter-scraper", "winter-plowing");
    }

    later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

    /* ---------- каркас ---------- */
    build() {
      this.frost = el("div", "winter-layer winter-frost");
      el("div", "winter-frost-glass", this.frost);
      el("div", "winter-frost-tint", this.frost);
      this.frostCanvas = el("canvas", "", this.frost);
      this.garlandCanvas = el("canvas", "winter-layer winter-garland");
      this.snowCanvas = el("canvas", "winter-layer winter-snow");
      this.ctx = this.snowCanvas.getContext("2d");
      this.resize();
      this.applyToggles();
    }

    buildTree() {
      var NS = "http://www.w3.org/2000/svg";
      var wrap = el("div", "winter-layer winter-tree");
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 100 144");
      svg.setAttribute("width", "100"); svg.setAttribute("height", "144");
      this.treeTiers = [];
      var trunk = document.createElementNS(NS, "rect");
      trunk.setAttribute("x", "43"); trunk.setAttribute("y", "122"); trunk.setAttribute("width", "14"); trunk.setAttribute("height", "22");
      trunk.setAttribute("fill", "#6b4a2b");
      svg.appendChild(trunk);
      this.treeGroup = document.createElementNS(NS, "g");
      svg.appendChild(this.treeGroup);
      this.treeOrn = document.createElementNS(NS, "g");
      svg.appendChild(this.treeOrn);
      this.treeStar = document.createElementNS(NS, "text");
      this.treeStar.setAttribute("x", "50"); this.treeStar.setAttribute("y", "16");
      this.treeStar.setAttribute("text-anchor", "middle"); this.treeStar.setAttribute("font-size", "16");
      this.treeStar.textContent = "⭐";
      svg.appendChild(this.treeStar);
      wrap.appendChild(svg);
      document.body.appendChild(wrap);
      this.treeWrap = wrap;
      this.treeSvg = svg;
      this.renderTree();
    }

    renderTree() {
      if (!this.treeGroup) return;
      var NS = "http://www.w3.org/2000/svg";
      var lvl = Math.min(12, this.level());
      var tiers = Math.min(4, 2 + Math.floor(lvl / 4));
      var g = this.treeGroup;
      g.textContent = "";
      for (var i = 0; i < tiers; i++) {
        var top = 6 + i * 26, bot = top + 42, half = 16 + i * 9 + Math.min(lvl, 10) * 0.5;
        var p = document.createElementNS(NS, "polygon");
        p.setAttribute("points", (50) + "," + top + " " + (50 - half) + "," + bot + " " + (50 + half) + "," + bot);
        p.setAttribute("fill", "#2e8b57"); p.setAttribute("stroke", "#1d5c3a"); p.setAttribute("stroke-width", "1");
        g.appendChild(p);
      }
      this.treeStar.setAttribute("opacity", this.up("ornaments") ? "1" : "0");
      this.treeOrn.textContent = "";
      if (this.up("ornaments")) {
        var colors = ["#e53935", "#ffd54f", "#42a5f5", "#ab47bc", "#ff7043"];
        var spots = [[40, 30], [60, 34], [46, 56], [56, 62], [36, 84], [64, 88], [50, 106]];
        for (var j = 0; j < spots.length; j++) {
          var c = document.createElementNS(NS, "circle");
          c.setAttribute("cx", spots[j][0]); c.setAttribute("cy", spots[j][1]); c.setAttribute("r", "3");
          c.setAttribute("fill", colors[j % colors.length]);
          this.treeOrn.appendChild(c);
        }
      }
      this.treeWrap.style.display = this.settings.tree ? "" : "none";
    }

    applyToggles() {
      this.frost.style.display = this.settings.frost ? "" : "none";
      if (this.treeWrap) this.treeWrap.style.display = this.settings.tree ? "" : "none";
      this.snowCanvas.style.display = this.settings.snow ? "" : "none";
      this.garlandCanvas.style.display = this.settings.garland ? "" : "none";
    }

    resize() {
      this.W = window.innerWidth; this.H = window.innerHeight;
      this.snowCanvas.width = this.W; this.snowCanvas.height = this.H;
      this.garlandCanvas.width = this.W; this.garlandCanvas.height = 90;
      this.frostCanvas.width = this.W; this.frostCanvas.height = this.H;
      this.drawFrost();
    }

    /* ---------- иней: кристаллические веточки по краям ---------- */
    drawFrost() {
      var c = this.frostCanvas.getContext("2d");
      var W = this.W, H = this.H;
      c.clearRect(0, 0, W, H);
      c.lineCap = "round";
      var branch = (x, y, ang, len, depth) => {
        if (len < 4 || depth > 4) return;
        var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
        c.globalAlpha = 0.15 + 0.1 * (4 - depth);
        c.lineWidth = Math.max(0.6, 2.2 - depth * 0.4);
        c.strokeStyle = "#f4fbff";
        c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
        branch(x2, y2, ang + rnd(0.4, 0.9), len * 0.62, depth + 1);
        branch(x2, y2, ang - rnd(0.4, 0.9), len * 0.62, depth + 1);
        branch(x2, y2, ang + rnd(-0.2, 0.2), len * 0.7, depth + 1);
      };
      var n = Math.round((W + H) / 14);
      for (var i = 0; i < n; i++) {
        var side = Math.floor(Math.random() * 4), x, y, a;
        if (side === 0) { x = rnd(0, W); y = 0; a = Math.PI / 2; }
        else if (side === 1) { x = rnd(0, W); y = H; a = -Math.PI / 2; }
        else if (side === 2) { x = 0; y = rnd(0, H); a = 0; }
        else { x = W; y = rnd(0, H); a = Math.PI; }
        branch(x, y, a + rnd(-0.5, 0.5), rnd(26, 70), 0);
      }
      // углы гуще
      [[0, 0, Math.PI / 4], [W, 0, 3 * Math.PI / 4], [0, H, -Math.PI / 4], [W, H, -3 * Math.PI / 4]]
        .forEach(function (p) {
          for (var k = 0; k < 10; k++) branch(p[0], p[1], p[2] + rnd(-0.7, 0.7), rnd(50, 130), 0);
        });
      c.globalAlpha = 1;
    }

    /* ---------- снегопад ---------- */
    makeFlake(top) {
      return {
        x: rnd(-100, this.W + 100), y: top ? rnd(-30, -2) : rnd(0, this.H),
        r: rnd(0.8, 3.2), vy: rnd(0.5, 1.6), ph: rnd(0, 6.28), sw: rnd(0.3, 1.1)
      };
    }

    loop(t) {
      this.raf = requestAnimationFrame(this.loop);
      // сила метели плавно подтягивается
      this.storm += (this.stormTarget - this.storm) * 0.02;
      this.wind = this.storm * 7 + Math.sin(t / 3000) * 0.4;
      var want = Math.round((110 + this.storm * 600) * this.settings.density);
      while (this.flakes.length < want) this.flakes.push(this.makeFlake(false));
      if (this.flakes.length > want + 20) this.flakes.length = want;

      var ctx = this.ctx, W = this.W, H = this.H;
      ctx.clearRect(0, 0, W, H);
      if (this.settings.snow || this.storm > 0.05) {
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(120,160,210,.6)"; ctx.shadowBlur = 3;
        for (var i = 0; i < this.flakes.length; i++) {
          var f = this.flakes[i];
          f.ph += 0.02;
          f.y += f.vy * (1 + f.r * 0.4) * (1 + this.storm * 1.2);
          f.x += Math.sin(f.ph) * f.sw + this.wind * (0.5 + f.r * 0.3);
          if (f.y > H + 5 || f.x > W + 120 || f.x < -120) {
            f.y = rnd(-30, -2); f.x = rnd(-100, W + 100);
            if (this.wind > 2) f.x = rnd(-300, W);
          }
          ctx.globalAlpha = 0.55 + f.r * 0.14;
          if (this.storm > 0.3 && f.r > 1.6) {
            ctx.strokeStyle = "#fff"; ctx.lineWidth = f.r * 0.8;
            ctx.beginPath(); ctx.moveTo(f.x, f.y);
            ctx.lineTo(f.x - this.wind * 3, f.y - 6); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
          }
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      this.updateSleet(t);
      this.updateDrifts();
      var dtw = Math.min(60, t - (this.lastT || t)); this.lastT = t;
      if (this.workers.length) this.updateWorkers(dtw);
      if (this.goldenUntil && performance.now() > this.goldenUntil) { this.goldenUntil = 0; this.updateHud(false); }
      if (this.goldenUntil && performance.now() - (this.lastHudT || 0) > 1000) { this.lastHudT = performance.now(); this.updateHud(false); }
      if (this.settings.garland && t - (this.lastGarland || 0) > 60) { this.lastGarland = t; this.drawGarland(t); }
    }

    /* ---------- гирлянда ---------- */
    drawGarland(t) {
      var c = this.garlandCanvas.getContext("2d"), W = this.W;
      c.clearRect(0, 0, W, 90);
      var PAL = {
        classic: ["#ff3b3b", "#ffc83a", "#3be07a", "#3ba7ff", "#c85bff"],
        warm: ["#ffb347", "#ffd27a", "#ff9a3c", "#fff0b3"],
        cold: ["#9fd8ff", "#ffffff", "#5aa9ff", "#c9e6ff"],
        xmas: ["#e63946", "#2fbf71"],
        candy: ["#ff5fa2", "#ffffff"],
        aurora: ["#3be0b0", "#4aa8ff", "#a86bff", "#6bffd8"]
      };
      var gp = this.settings.gPalette, mode = this.settings.gMode;
      var cols = PAL[gp] || PAL.classic, rainbow = gp === "rainbow";
      var ts = t * (this.settings.gSpeed || 1);
      var seg = 240, sag = 34, n = Math.ceil(W / seg);
      var segW = W / n;
      c.lineWidth = 2; c.strokeStyle = "#1c2b22"; c.lineCap = "round";
      c.beginPath();
      for (var i = 0; i < n; i++) {
        var x0 = i * segW, x1 = x0 + segW;
        c.moveTo(x0, 2); c.quadraticCurveTo((x0 + x1) / 2, 2 + sag * 2, x1, 2);
      }
      c.stroke();
      var k = 0;
      for (var i = 0; i < n; i++) {
        var x0 = i * segW, x1 = x0 + segW, cnt = Math.max(4, Math.round(segW / 36));
        for (var j = 1; j <= cnt; j++) {
          var u = j / (cnt + 1);
          var x = x0 + (x1 - x0) * u;
          var y = 2 + 2 * sag * 2 * u * (1 - u) / 1; // кривая Безье: точка при u
          // ось Y кривой: (1-u)^2*2 + 2u(1-u)*(2+2sag) + u^2*2
          y = (1 - u) * (1 - u) * 2 + 2 * u * (1 - u) * (2 + sag * 2) + u * u * 2;
          var slope = (x1 - x0) * 0 + 4 * sag * (1 - 2 * u) / (x1 - x0);
          var ang = Math.atan(slope);
          var col = rainbow ? "hsl(" + ((k * 28 + ts / 15) % 360) + ",90%,60%)" : cols[k % cols.length];
          var tw;
          if (mode === "steady") tw = 1;
          else if (mode === "blink") tw = Math.floor(ts / 600) % 2 === (k % 2) ? 1 : 0.12;
          else if (mode === "chase") { var ph = ((ts / 120) - k) % 6; if (ph < 0) ph += 6; tw = ph < 1.5 ? 1 : 0.15; }
          else if (mode === "wave") tw = 0.5 + 0.5 * Math.sin(ts / 300 - k * 0.5);
          else if (mode === "breathe") tw = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ts / 700));
          else if (mode === "sparkle") { var h = Math.sin(k * 12.9898 + Math.floor(ts / 160 + k * 3) * 78.233) * 43758.5453; tw = (h - Math.floor(h)) > 0.72 ? 1 : 0.12; }
          else tw = 0.55 + 0.45 * Math.sin(ts / 380 + k * 1.7);
          var bx = x + Math.sin(ang) * 6, by = y + Math.cos(ang) * 6 + 3;
          c.strokeStyle = "#1c2b22"; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x, y); c.lineTo(bx, by); c.stroke();
          c.save();
          c.translate(bx, by); c.rotate(-ang);
          c.shadowColor = col; c.shadowBlur = 14 * tw;
          c.globalAlpha = 0.45 + 0.55 * tw;
          c.fillStyle = col;
          c.beginPath(); c.ellipse(0, 6, 4.2, 7, 0, 0, 6.283); c.fill();
          c.shadowBlur = 0; c.globalAlpha = 0.6 * tw;
          c.fillStyle = "#fff";
          c.beginPath(); c.ellipse(-1.2, 4, 1.1, 2.2, 0, 0, 6.283); c.fill();
          c.restore();
          k++;
        }
      }
      c.globalAlpha = 1;
    }

    /* ---------- слова ---------- */
    activeRoot() {
      return document.querySelector(".workspace-leaf.mod-active .view-content") ||
             document.querySelector(".workspace-leaf-content .view-content");
    }

    pickWord() {
      var root = this.activeRoot();
      if (!root) return null;
      var rr = root.getBoundingClientRect();
      var blocks = root.querySelectorAll(".cm-line, .markdown-preview-view p, .markdown-preview-view li, .markdown-preview-view h1, .markdown-preview-view h2, .markdown-preview-view h3");
      var cands = [];
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i], br = b.getBoundingClientRect();
        if (br.bottom < rr.top + 20 || br.top > rr.bottom - 20 || br.height === 0) continue;
        var walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
        var tn;
        while ((tn = walker.nextNode())) {
          var re = /[\p{L}\p{N}]{4,}/gu, m;
          while ((m = re.exec(tn.nodeValue))) cands.push({ node: tn, s: m.index, e: m.index + m[0].length });
        }
      }
      var taken = this.drifts;
      for (var tries = 0; tries < 12 && cands.length; tries++) {
        var c = cands[Math.floor(Math.random() * cands.length)];
        var range = document.createRange();
        try { range.setStart(c.node, c.s); range.setEnd(c.node, c.e); } catch (e) { continue; }
        var r = range.getBoundingClientRect();
        if (r.width < 10 || r.top < rr.top || r.bottom > rr.bottom || r.left < rr.left || r.right > rr.right) continue;
        var overlap = taken.some(function (d) {
          var q = d.rect; return !(r.right < q.left || r.left > q.right || r.bottom < q.top || r.top > q.bottom);
        });
        if (overlap) continue;
        return range;
      }
      return null;
    }

    scheduleDrift() {
      var typing = performance.now() - this.lastKey < 4000;
      if (this.settings.drifts && !typing && !this.blizzard && this.count("snow") < 4 + Math.floor(this.up("weather") / 2)) this.spawnDrift();
      this.later(() => this.scheduleDrift(), rnd(7000, 16000) / (1 + 0.2 * this.up("weather")));
    }

    scheduleIce() {
      if (this.settings.ice && !this.blizzard && !this.sleet && performance.now() - this.lastKey > 4000 && this.count("ice") < 2) this.spawnDrift("ice");
      this.later(() => this.scheduleIce(), rnd(90000, 160000));
    }

    scheduleGolden() {
      if (this.settings.golden && !this.golden && !this.blizzard) this.spawnGolden();
      this.later(() => this.scheduleGolden(), rnd(150000, 240000));
    }

    spawnGolden() {
      var n = el("div", "winter-golden");
      n.textContent = "❄";
      n.style.pointerEvents = "auto";
      n.style.left = rnd(60, Math.max(120, window.innerWidth - 60)) + "px";
      this.golden = n;
      n.addEventListener("click", () => {
        this.goldenUntil = performance.now() + GOLDEN_MS;
        this.toast(this.t("toast.golden"));
        kill(n); this.golden = null;
        this.updateHud(true);
      });
      document.body.appendChild(n);
      this.later(() => { if (this.golden === n) { kill(n); this.golden = null; } }, 9500);
    }

    count(kind) { return this.drifts.filter(function (d) { return d.kind === kind; }).length; }

    spawnDrift(kind) {
      if (kind !== "puddle" && kind !== "ice") kind = "snow";
      var range = this.pickWord();
      if (!range) return;
      var node = el("div", "winter-layer " + (kind === "puddle" ? "winter-puddle" : kind === "ice" ? "winter-ice" : "winter-drift"));
      if (kind === "puddle") {
        el("i", "ripple", node);
        if (this.up("duck")) { var dk = el("span", "duck", node); dk.textContent = "🦆"; }
      }
      var d = { kind: kind, range: range, word: range.toString(), node: node, hp: 1, rect: range.getBoundingClientRect(), born: performance.now() };
      node.style.opacity = "0";
      this.drifts.push(d);
      this.placeDrift(d);
      requestAnimationFrame(function () {
        node.style.transition = "opacity 2.5s ease, transform 3s cubic-bezier(.2,.8,.2,1)";
        node.style.opacity = "1";
      });
    }

    relocate(d) {
      var root = this.activeRoot();
      if (!root) return false;
      var best = null, bestDist = 1e9, last = d.rect;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var tn;
      while ((tn = walker.nextNode())) {
        var v = tn.nodeValue, i = v.indexOf(d.word);
        while (i !== -1) {
          var range = document.createRange();
          try { range.setStart(tn, i); range.setEnd(tn, i + d.word.length); } catch (e) { break; }
          var r = range.getBoundingClientRect();
          if (r.width > 0) {
            var dist = Math.abs(r.left - last.left) + Math.abs(r.top - last.top);
            if (dist < bestDist) { bestDist = dist; best = range; }
          }
          i = v.indexOf(d.word, i + 1);
        }
      }
      if (best) { d.range = best; return true; }
      return false;
    }

    placeDrift(d) {
      var n = d.node;
      var ok = d.range.startContainer.isConnected && d.range.getBoundingClientRect().width > 0;
      if (!ok) {
        // редактор перерисовал строку — ищем это слово заново
        var now = performance.now();
        if (!d.lostAt) d.lostAt = now;
        if (!d.lastTry || now - d.lastTry > 150) {
          d.lastTry = now;
          if (this.relocate(d)) { d.lostAt = 0; ok = true; }
        }
        if (!ok) {
          n.style.visibility = "hidden"; d.rect = { left: -9999, right: -9999, top: -9999, bottom: -9999, width: 0, height: 0 };
          if (now - d.lostAt > 60000) d.dead = true;
          return;
        }
      }
      d.lostAt = 0;
      var r = d.range.getBoundingClientRect();
      d.rect = r;
      var root = this.activeRoot(), rr = root && root.getBoundingClientRect();
      if (rr && (r.bottom < rr.top || r.top > rr.bottom || r.right < rr.left || r.left > rr.right)) {
        n.style.visibility = "hidden"; return;
      }
      n.style.visibility = "";
      if (d.kind === "puddle") {
        var ph = Math.max(10, r.height * 0.55);
        n.style.left = (r.left - 8) + "px"; n.style.width = (r.width + 16) + "px";
        n.style.top = (r.bottom - ph * 0.55) + "px"; n.style.height = ph + "px";
        var pa = Math.min(1, (performance.now() - d.born) / 2500);
        n.style.transform = "scale(" + (0.2 + 0.8 * pa) * (0.3 + 0.7 * d.hp) + ")";
        n.style.opacity = String(Math.min(1, pa * 1.2) * (0.3 + 0.7 * d.hp));
        return;
      }
      n.style.left = (r.left - 4) + "px";
      n.style.width = (r.width + 8) + "px";
      var h = r.height * 1.15;
      n.style.top = (r.bottom - h + 3) + "px";
      n.style.height = h + "px";
      var age = Math.min(1, (performance.now() - d.born) / 2500);
      n.style.transform = "scaleY(" + (0.15 + 0.85 * age) * (0.25 + 0.75 * d.hp) + ")";
    }

    updateDrifts() {
      var over = false, overP = false, overI = false, m = this.mouse;
      for (var i = this.drifts.length - 1; i >= 0; i--) {
        var d = this.drifts[i];
        this.placeDrift(d);
        if (d.dead) { kill(d.node); this.drifts.splice(i, 1); continue; }
        var r = d.rect;
        if (m.x >= r.left - 6 && m.x <= r.right + 6 && m.y >= r.top - 8 && m.y <= r.bottom + 8) {
          if (d.kind === "puddle") overP = true; else if (d.kind === "ice") overI = true; else over = true;
        }
      }
      if (!this.blizzard) {
        document.body.classList.toggle("winter-shovel", over && !overI);
        document.body.classList.toggle("winter-scraper", overI && !over);
        document.body.classList.toggle("winter-broom", overP && !over && !overI);
      }
    }

    handleMove(e) {
      var m = this.mouse;
      var dx = m.px == null ? 0 : e.clientX - m.px, dy = m.py == null ? 0 : e.clientY - m.py;
      m.x = e.clientX; m.y = e.clientY; m.px = e.clientX; m.py = e.clientY;
      var dist = Math.hypot(dx, dy);

      // лопата
      for (var i = this.drifts.length - 1; i >= 0; i--) {
        var d = this.drifts[i], r = d.rect;
        if (m.x >= r.left - 6 && m.x <= r.right + 6 && m.y >= r.top - 8 && m.y <= r.bottom + 8) {
          if (d.kind === "puddle") {
            d.hp -= dist * (1 + 0.4 * this.up("broom")) / (r.width + 120);
            if (d.hp <= 0) { this.splash(r); this.earn(PUDDLE_PAY, r.left + r.width / 2, r.top, "puddle", "drops"); this.puddleDone(); kill(d.node); this.drifts.splice(i, 1); }
            continue;
          }
          if (d.kind === "ice") {
            d.hp -= dist * (1 + 0.3 * this.up("scraper")) / (r.width + 60);
            if (d.hp <= 0) { this.puff(r); this.earn(ICE_PAY, r.left + r.width / 2, r.top, "word"); kill(d.node); this.drifts.splice(i, 1); }
            continue;
          }
          d.hp -= dist * (1 + 0.35 * this.up("shovel")) / (r.width + 90);
          if (d.hp <= 0) { this.puff(r); this.earn(WORD_PAY, r.left + r.width / 2, r.top, "word"); kill(d.node); this.drifts.splice(i, 1); }
        }
      }
      // снегоуборочная машина
      if (this.blizzard && this.blizzard.ready) this.plowTo(e.clientX, e.clientY, dx);
    }

    splash(r) {
      for (var i = 0; i < 9; i++) {
        var dr = el("div", "winter-layer winter-drop");
        dr.style.left = rnd(r.left, r.right) + "px"; dr.style.top = (r.bottom - 4) + "px";
        dr.style.setProperty("--dx", rnd(-30, 30) + "px");
        dr.style.setProperty("--dy", rnd(-34, -12) + "px");
        (function (n) { setTimeout(function () { kill(n); }, 750); })(dr);
      }
    }

    puddleDone() {
      if (this.sleet) this.sleet.cleaned++;
    }

    /* ---------- снег с дождём ---------- */
    scheduleSleet() {
      if (this.settings.sleet && !this.blizzard && !this.sleet) this.startSleet();
      this.later(() => this.scheduleSleet(), rnd(110000, 200000) / (1 + 0.1 * this.up("weather")));
    }

    startSleet() {
      this.sleet = { end: performance.now() + 50000, next: performance.now() + 2500, cleaned: 0 };
      this.toast(this.t("toast.sleet"));
    }

    endSleet() {
      var sl = this.sleet; this.sleet = null;
      if (this.up("rainbow") && sl.cleaned > 0) {
        var rb = el("div", "winter-layer winter-rainbow");
        setTimeout(function () { kill(rb); }, 7000);
        this.earn(8 * sl.cleaned, this.W / 2, 140, "word");
      }
    }

    toast(text) {
      var t = el("div", "winter-layer winter-toast");
      t.textContent = text;
      setTimeout(function () { kill(t); }, 4200);
    }

    updateSleet(t) {
      var sl = this.sleet;
      this.sleetK += ((sl ? 1 : 0) - this.sleetK) * 0.03;
      if (sl) {
        if (this.blizzard) { this.sleet = null; return; }
        if (t > sl.end) this.endSleet();
        else if (t > sl.next) {
          sl.next = t + rnd(2200, 4000);
          if (this.drifts.length < 9) {
            if (Math.random() < 0.5 && this.count("puddle") < 5) this.spawnDrift("puddle");
            else if (this.count("snow") < 6) this.spawnDrift("snow");
          }
        }
      }
      if (this.sleetK < 0.03) return;
      var ctx = this.ctx, n = Math.round(160 * this.sleetK);
      while (this.rain.length < n) this.rain.push({ x: rnd(0, this.W + 100), y: rnd(0, this.H), v: rnd(14, 22) });
      if (this.rain.length > n) this.rain.length = n;
      ctx.strokeStyle = "rgba(150,195,255,.55)"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var i = 0; i < this.rain.length; i++) {
        var d = this.rain[i];
        d.y += d.v; d.x -= d.v * 0.18;
        if (d.y > this.H) { d.y = -20; d.x = rnd(0, this.W + 100); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y - 14);
      }
      ctx.stroke();
    }

    puff(r) {
      for (var i = 0; i < 26; i++) {
        var f = this.makeFlake(false);
        f.x = rnd(r.left, r.right); f.y = rnd(r.top, r.bottom); f.vy = rnd(-1.5, 0.5); f.r = rnd(1, 3);
        this.flakes.push(f);
      }
    }

    /* ---------- метель ---------- */
    scheduleBlizzard() {
      if (this.settings.blizzard && !this.blizzard) this.startBlizzard();
      this.later(() => this.scheduleBlizzard(), rnd(150000, 280000) / (1 + 0.12 * this.up("weather")));
    }

    startBlizzard() {
      if (this.blizzard) return;
      var root = this.activeRoot();
      if (!root) return;
      var rr = root.getBoundingClientRect();
      var cv = el("canvas", "winter-layer winter-cover");
      cv.width = Math.round(rr.width); cv.height = Math.round(rr.height);
      cv.style.left = rr.left + "px"; cv.style.top = rr.top + "px";
      cv.style.width = rr.width + "px"; cv.style.height = rr.height + "px";
      cv.style.opacity = "0";
      var c = cv.getContext("2d");
      // сугроб: белая заливка с шумом и голубоватыми тенями
      var g = c.createLinearGradient(0, 0, 0, cv.height);
      g.addColorStop(0, "#f7fbff"); g.addColorStop(1, "#dbe9f7");
      c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      for (var i = 0; i < Math.round(cv.width * cv.height / 900); i++) {
        c.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.7)" : "rgba(150,185,225,.18)";
        var s = rnd(8, 46);
        c.beginPath(); c.ellipse(rnd(0, cv.width), rnd(0, cv.height), s, s * rnd(0.3, 0.6), rnd(-0.4, 0.4), 0, 6.283); c.fill();
      }
      var cell = 22, cols = Math.ceil(cv.width / cell), rows = Math.ceil(cv.height / cell);
      var b = {
        cv: cv, c: c, rr: rr, cell: cell, cols: cols, rows: rows,
        cleared: new Uint8Array(cols * rows), clearedN: 0, ready: false, px: null, py: null, face: 1
      };
      this.blizzard = b;
      this.stormTarget = 1;
      document.body.classList.remove("winter-shovel", "winter-broom", "winter-scraper");
      document.body.classList.add("winter-plowing");
      b.hint = el("div", "winter-layer winter-hint");
      b.hint.textContent = this.t("blizzard.hint");
      b.hint.style.opacity = "0";
      b.earned = 0;
      b.banner = el("div", "winter-layer winter-combo");
      b.banner.innerHTML = '<span class="t">' + this.t("blizzard.banner", { m: STORM_MULT }) + '</span><span class="v">+0</span>';
      b.banner.style.display = "none";
      requestAnimationFrame(function () { cv.style.transition = "opacity 5s ease"; cv.style.opacity = "0.97"; b.hint.style.opacity = "1"; });
      // машина появляется после того как намело
      this.later(() => {
        if (this.blizzard !== b) return;
        b.plow = el("div", "winter-layer winter-plow");
        b.plow.innerHTML = PLOW_SVG; if (this.up("skin")) b.plow.style.filter = "hue-rotate(-42deg) saturate(1.3)";
        b.plow.style.display = this.mouse.x < 0 ? "none" : "";
        b.ready = true; b.banner.style.display = "";
        this.plowTo(this.mouse.x, this.mouse.y, 0);
        cv.style.transition = "opacity 1.2s ease"; cv.style.opacity = "1";
      }, 4200);
      this.later(() => { if (this.blizzard === b && b.hint) b.hint.style.opacity = "0"; }, 12000);
    }

    plowTo(x, y, dx) {
      var b = this.blizzard;
      if (!b || !b.ready) return;
      if (Math.abs(dx) > 1) b.face = dx > 0 ? 1 : -1;
      var W = 170, H = 90;
      // отвал: справа (face=1) или слева (face=-1) от курсора
      var tx = b.face === 1 ? x - W + 4 : x - 4;
      b.plow.style.transform = "translate(" + tx + "px," + (y - H / 2) + "px) scaleX(" + b.face + ")";
      // чистим отвалом вдоль пути
      var px = b.px == null ? x : b.px, py = b.py == null ? y : b.py;
      var steps = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 8));
      var c = b.c, rr = b.rr, R = 40 + 7 * this.up("plow");
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = "#000";
      for (var i = 1; i <= steps; i++) {
        var sx = px + (x - px) * i / steps - rr.left, sy = py + (y - py) * i / steps - rr.top;
        c.beginPath(); c.arc(sx, sy, R, 0, 6.283); c.fill();
        this.markCleared(sx, sy, R);
      }
      c.globalCompositeOperation = "source-over";
      b.px = x; b.py = y;
      // снежные брызги от отвала
      if (Math.hypot(x - px, y - py) > 3) {
        for (var k = 0; k < 2; k++) {
          var f = this.makeFlake(false);
          f.x = x + b.face * rnd(0, 10); f.y = y + rnd(-30, 30); f.vy = rnd(-1, 0.4); f.r = rnd(1, 2.4);
          this.flakes.push(f);
        }
      }
      if (b.clearedN / (b.cols * b.rows) > 0.9) this.endBlizzard();
    }

    markCleared(sx, sy, R) {
      var b = this.blizzard, cell = b.cell;
      var c0 = Math.max(0, Math.floor((sx - R) / cell)), c1 = Math.min(b.cols - 1, Math.floor((sx + R) / cell));
      var r0 = Math.max(0, Math.floor((sy - R) / cell)), r1 = Math.min(b.rows - 1, Math.floor((sy + R) / cell));
      for (var r = r0; r <= r1; r++) for (var cc = c0; cc <= c1; cc++) {
        var cx = cc * cell + cell / 2, cy = r * cell + cell / 2;
        if ((cx - sx) * (cx - sx) + (cy - sy) * (cy - sy) <= R * R) {
          var i = r * b.cols + cc;
          if (!b.cleared[i]) { b.cleared[i] = 1; b.clearedN++; this.stormPay(STORM_BASE * STORM_MULT / (b.cols * b.rows * 0.9)); }
        }
      }
    }

    endBlizzard() {
      var b = this.blizzard;
      if (!b) return;
      this.blizzard = null;
      this.stormTarget = 0;
      document.body.classList.remove("winter-plowing");
      b.cv.style.transition = "opacity 1s ease"; b.cv.style.opacity = "0";
      if (b.plow) {
        b.plow.style.transition = "opacity 1s ease"; b.plow.style.opacity = "0";
      }
      kill(b.hint); kill(b.banner);
      var bonus = Math.round(STORM_BONUS * this.mult());
      this.addMoney(bonus);
      this.bonusBurst(Math.round(b.earned + bonus), bonus);
      setTimeout(function () { kill(b.cv); kill(b.plow); }, 1100);
    }

    clearAll() {
      this.workers.forEach(function (w) { kill(w.node); });
      this.workers = [];
      this.drifts.forEach(function (d) { kill(d.node); });
      this.drifts = [];
      if (this.golden) { kill(this.golden); this.golden = null; }
      var b = this.blizzard;
      if (b) {
        this.blizzard = null; this.stormTarget = 0;
        kill(b.cv); kill(b.plow); kill(b.hint); kill(b.banner);
        document.body.classList.remove("winter-plowing");
      }
      document.body.classList.remove("winter-scraper");
    }

    /* ---------- деньги ---------- */
    up(id) { return this.settings.ups[id] || 0; }
    level() { return Math.floor(Math.sqrt((this.settings.xp || 0) / 50)) + 1; }
    mult() { return (1 + 0.15 * this.up("value") + 0.02 * (this.level() - 1)) * (this.goldenUntil > performance.now() ? 2 : 1); }
    dmult() { return 1 + 0.25 * this.up("dropv"); }
    price(u) { return Math.round(u.base * Math.pow(1.7, this.up(u.id))); }

    addMoney(v, cur) {
      var before = this.level();
      this.settings[cur || "money"] += v;
      if (!cur || cur === "money") this.settings.xp = (this.settings.xp || 0) + v;
      if (this.level() > before) this.toast(this.t("toast.level", { n: this.level() }));
      this.updateHud(true);
      this.saveSoon();
    }
    saveSoon() {
      clearTimeout(this.saveT);
      this.saveT = setTimeout(() => this.saveNow(), 3000);
    }
    saveNow() { try { this.saveData(this.settings); } catch (e) {} }

    earn(base, x, y, kind, cur) {
      var v = Math.max(1, Math.round(base * (cur === "drops" ? this.dmult() : this.mult())));
      this.addMoney(v, cur);
      var p = el("div", "winter-layer winter-pop" + (kind === "helper" ? " helper" : "") + (cur === "drops" ? " drops" : ""));
      p.textContent = "+" + v + (cur === "drops" ? " 💧" : " ❄");
      p.style.left = x + "px"; p.style.top = y + "px";
      setTimeout(function () { kill(p); }, 1300);
    }

    stormPay(base) {
      var b = this.blizzard;
      if (!b) return;
      var v = base * this.mult();
      this.settings.money += v;
      this.settings.xp = (this.settings.xp || 0) + v;
      b.earned += v;
      var now = performance.now();
      if (now - (b.lastUi || 0) > 80) {
        b.lastUi = now;
        this.updateHud(false);
        var vEl = b.banner && b.banner.querySelector(".v");
        if (vEl) {
          vEl.textContent = "+" + Math.round(b.earned);
          b.banner.classList.remove("tick"); void b.banner.offsetWidth; b.banner.classList.add("tick");
        }
        this.saveSoon();
      }
    }

    bonusBurst(total, bonus) {
      var o = el("div", "winter-layer winter-bonus");
      o.innerHTML = '<div class="a">' + this.t("blizzard.cleared") + '</div><div class="b">+' + total + ' ❄</div><div class="c">' + this.t("blizzard.bonus", { b: bonus }) + '</div>';
      setTimeout(function () { kill(o); }, 3200);
      var hr = this.hud.getBoundingClientRect();
      for (var i = 0; i < 18; i++) {
        (function (self, i) {
          var c = el("div", "winter-layer winter-coin");
          c.textContent = "❄";
          c.style.left = (self.W / 2 + rnd(-40, 40)) + "px"; c.style.top = (self.H / 2 + rnd(-20, 20)) + "px";
          setTimeout(function () {
            c.style.transition = "transform .9s cubic-bezier(.5,0,.8,.4), opacity .9s";
            c.style.transform = "translate(" + (hr.left + 20 - self.W / 2) + "px," + (hr.top + 10 - self.H / 2) + "px) scale(.6)";
            c.style.opacity = "0.2";
          }, 60 + i * 55);
          setTimeout(function () { kill(c); }, 1400 + i * 55);
        })(this, i);
      }
    }

    scheduleHelper() {
      var lvl = this.up("helper");
      var wait = lvl ? 45000 / lvl : 8000;
      this.later(() => {
        if (this.up("helper") && !this.blizzard) this.sendHelper();
        this.scheduleHelper();
      }, wait);
    }

    sendHelper() {
      if (this.workers.length >= (this.up("helper") >= 4 ? 2 : 1)) return;
      var list = this.drifts.filter(function (d) { return !d.busy && d.kind !== "ice" && d.rect && d.rect.left > 0; });
      if (!list.length) return;
      var d = list[0];
      d.busy = true;
      var node = el("div", "winter-layer winter-worker" + (d.kind === "puddle" ? " sweeping" : ""));
      node.innerHTML = WORKER_SVG;
      var fromLeft = (d.rect.left + d.rect.width / 2) < this.W / 2;
      var w = { node: node, d: d, state: "in", dir: fromLeft ? 1 : -1, fromLeft: fromLeft,
                x: fromLeft ? -60 : this.W + 60, y: d.rect.bottom - 44, dig: 0 };
      node.classList.add("walking");
      this.workers.push(w);
      this.drawWorker(w);
    }

    drawWorker(w) {
      w.node.style.transform = "translate(" + (w.x - 20) + "px," + w.y + "px) scaleX(" + w.dir + ")";
    }

    updateWorkers(dt) {
      for (var i = this.workers.length - 1; i >= 0; i--) {
        var w = this.workers[i], d = w.d, r = d.rect;
        var alive = this.drifts.indexOf(d) !== -1 && !d.dead;
        if (!alive && w.state !== "out") this.workerLeave(w);
        var speed = 150 * dt / 1000;
        if (w.state === "in" && alive) {
          // встаём сбоку от сугроба, лицом к нему
          var tx = w.fromLeft ? r.left - 22 : r.right + 22;
          w.y += (r.bottom - 44 - w.y) * 0.1;
          var dx = tx - w.x;
          w.dir = dx >= 0 ? 1 : -1;
          if (Math.abs(dx) <= speed) {
            w.x = tx; w.state = "dig"; w.dir = w.fromLeft ? 1 : -1;
            w.node.classList.remove("walking"); w.node.classList.add("digging");
          } else w.x += Math.sign(dx) * speed;
        } else if (w.state === "dig" && alive) {
          w.dig += dt;
          w.x = w.fromLeft ? r.left - 22 : r.right + 22;
          w.y = r.bottom - 44;
          d.hp = Math.max(0.02, 1 - w.dig / (d.kind === "puddle" ? 2500 : 3000));
          if (d.kind !== "puddle" && Math.random() < dt / 160) {
            var f = this.makeFlake(false);
            f.x = w.x + w.dir * 22; f.y = w.y + 10; f.vy = rnd(-2.2, -0.8); f.r = rnd(1, 2.4);
            this.flakes.push(f);
          }
          if (w.dig >= (d.kind === "puddle" ? 2500 : 3000)) {
            if (d.kind === "puddle") { this.splash(r); this.puddleDone(); this.earn(PUDDLE_PAY, r.left + r.width / 2, r.top, "helper", "drops"); }
            else { this.puff(r);
            this.earn(WORD_PAY * 0.5, r.left + r.width / 2, r.top, "helper"); }
            kill(d.node); this.drifts.splice(this.drifts.indexOf(d), 1);
            this.workerLeave(w);
          }
        } else if (w.state === "out") {
          w.x += w.dir * speed * 1.1;
          if (w.x < -80 || w.x > this.W + 80) { kill(w.node); this.workers.splice(i, 1); continue; }
        }
        this.drawWorker(w);
      }
    }

    workerLeave(w) {
      w.state = "out";
      w.dir = w.x < this.W / 2 ? -1 : 1;
      w.node.classList.remove("digging"); w.node.classList.add("walking");
    }

    /* ---------- HUD и магазин ---------- */
    buildHud() {
      this.hud = el("div", "winter-hud");
      this.hudMoney = el("span", "m", this.hud);
      this.hudDrops = el("span", "m d", this.hud);
      var btn = el("button", "shopbtn", this.hud);
      this.hudShopBtn = btn;
      btn.textContent = this.t("hud.shop");
      btn.addEventListener("click", () => this.toggleShop());
      this.hud.style.display = this.settings.hud ? "" : "none";
      this.updateHud(false);
    }

    updateHud(flash) {
      if (this.treeGroup) this.renderTree();
      this.hudMoney.textContent = "❄ " + Math.floor(this.settings.money);
      this.hudDrops.textContent = "💧 " + Math.floor(this.settings.drops) + "  ★" + this.level() + (this.goldenUntil > performance.now() ? "  ×2 " + Math.ceil((this.goldenUntil - performance.now()) / 1000) + this.t("hud.sec") : "");
      if (flash) { this.hud.classList.remove("flash"); void this.hud.offsetWidth; this.hud.classList.add("flash"); }
      if (this.shop) this.renderShop();
    }

    toggleShop() {
      if (this.shop) { kill(this.shop); this.shop = null; return; }
      this.shop = el("div", "winter-shop");
      this.renderShop();
    }

    renderShop() {
      var sh = this.shop;
      sh.textContent = "";
      var head = el("div", "head", sh);
      var ttl = el("span", "", head); ttl.textContent = this.t("shop.title");
      var x = el("button", "x", head); x.textContent = "×";
      x.addEventListener("click", () => this.toggleShop());
      var bal = el("div", "bal", sh);
      bal.textContent = this.t("shop.balance", { m: Math.floor(this.settings.money), d: Math.floor(this.settings.drops) });
      UPGRADES.forEach((u) => {
        var cur = u.cur || "money", sym = cur === "drops" ? "💧" : "❄";
        var lvl = this.up(u.id), maxed = lvl >= u.max, cost = this.price(u);
        var row = el("div", "row", sh);
        var ic = el("div", "ic", row); ic.textContent = u.icon;
        var tx = el("div", "tx", row);
        var n = el("div", "n", tx); n.textContent = this.t("up." + u.id + ".name") + (u.max > 1 ? "  " + this.t("shop.level", { l: lvl, max: u.max }) : "");
        var d = el("div", "d", tx); d.textContent = this.t("up." + u.id + ".desc");
        var buy = el("button", "buy", row);
        if (maxed) { buy.textContent = this.t("shop.owned"); buy.disabled = true; }
        else {
          buy.textContent = sym + " " + cost;
          buy.disabled = this.settings[cur] < cost;
          buy.addEventListener("click", () => {
            if (this.settings[cur] < cost) return;
            this.settings[cur] -= cost;
            this.settings.ups[u.id] = lvl + 1;
            this.saveNow();
            this.updateHud(false);
            if (u.id === "weather") { /* применится со следующего таймера */ }
          });
        }
      });
      var f = el("div", "foot", sh);
      f.textContent = this.t("shop.foot", {
        w: Math.round(WORD_PAY * this.mult()), p: PUDDLE_PAY,
        s: Math.round(STORM_BASE * STORM_MULT * this.mult()), b: Math.round(STORM_BONUS * this.mult())
      });
    }

    /* ---------- настройки ---------- */
    makeTab() {
      var plugin = this;
      return new (class extends PST {
        display() {
          var tab = this;
          var el = this.containerEl; el.empty();
          el.createEl("h2", { text: plugin.t("settings.title") });
          new Setting(el).setName(plugin.t("settings.lang")).setDesc(plugin.t("settings.lang.desc")).addDropdown(function (dd) {
            dd.addOption("auto", plugin.t("settings.lang.auto")).addOption("ru", "Русский").addOption("en", "English")
              .setValue(plugin.settings.lang || "auto").onChange(async function (v) {
                plugin.settings.lang = v; await plugin.saveData(plugin.settings);
                plugin.applyLang();
                plugin.later(function () { tab.display(); }, 0);
              });
          });
          var tog = function (name, desc, key) {
            new Setting(el).setName(name).setDesc(desc).addToggle(function (t) {
              t.setValue(plugin.settings[key]).onChange(async function (v) {
                plugin.settings[key] = v; plugin.applyToggles(); if (plugin.hud) plugin.hud.style.display = plugin.settings.hud ? '' : 'none'; await plugin.saveData(plugin.settings);
              });
            });
          };
          el.createEl("h3", { text: plugin.t("settings.toggles") });
          ["snow", "frost", "hud", "garland", "drifts", "sleet", "blizzard", "ice", "tree", "golden"].forEach(function (k) {
            tog(plugin.t("settings." + k), plugin.t("settings." + k + ".desc"), k);
          });
          var gsave = async function () { await plugin.saveData(plugin.settings); };
          new Setting(el).setName(plugin.t("settings.gmode")).setDesc(plugin.t("settings.gmode.desc")).addDropdown(function (dd) {
            ["twinkle", "steady", "blink", "chase", "wave", "breathe", "sparkle"].forEach(function (m) { dd.addOption(m, plugin.t("mode." + m)); });
            dd.setValue(plugin.settings.gMode).onChange(function (v) { plugin.settings.gMode = v; gsave(); });
          });
          new Setting(el).setName(plugin.t("settings.gpalette")).addDropdown(function (dd) {
            ["classic", "rainbow", "warm", "cold", "xmas", "candy", "aurora"].forEach(function (p) { dd.addOption(p, plugin.t("pal." + p)); });
            dd.setValue(plugin.settings.gPalette).onChange(function (v) { plugin.settings.gPalette = v; gsave(); });
          });
          new Setting(el).setName(plugin.t("settings.gspeed")).addSlider(function (s) {
            s.setLimits(0.3, 3, 0.1).setValue(plugin.settings.gSpeed).setDynamicTooltip().onChange(function (v) { plugin.settings.gSpeed = v; gsave(); });
          });
          new Setting(el).setName(plugin.t("settings.density")).addSlider(function (s) {
            s.setLimits(0.3, 2, 0.1).setValue(plugin.settings.density).setDynamicTooltip().onChange(async function (v) {
              plugin.settings.density = v; await plugin.saveData(plugin.settings);
            });
          });
        }
      })(this.app, this);
    }
  }
  return WinterSnow;
})();
