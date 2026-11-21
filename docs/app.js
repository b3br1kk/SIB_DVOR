/* Сибирский двор — демо. Сцена «Сутки двора», карта по маске зон, сборщик дня. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  if (G) G.registerPlugin(window.ScrollTrigger);
  const MAX_URL = 'https://max.ru/u/f9LHodD0cOLaY0QWOI_nVbSbi6RzxVHj2z8PKyE7IdGz8zfiN4PkCBS8Sq8';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const nb = (s) => s.replace(/ (?=₽)/g, ' ');

  /* ——— зоны ——— */
  const NAMES = { 1: 'Кафе «Сибирь»', 2: 'Парковка у кафе', 3: 'Пруд с пирсами', 4: 'Баня на дровах', 5: 'Традиционный чум', 6: '«Красный» гостевой чум', 7: 'Хлебная печь под навесом', 8: 'Лабаз на сваях', 9: 'Хантыйский дом', 10: 'Поляна: столы и очаг', 11: 'Каркас чума', 20: 'Городская лыжная база · соседи', 21: 'Петля лыжной трассы · соседи' };
  const GROUP = { 1: 'cafe', 2: 'cafe', 3: 'banya', 4: 'banya', 5: 'ethno', 6: 'ethno', 7: 'ethno', 8: 'ethno', 9: 'ethno', 10: 'ethno', 11: 'ethno', 20: 'ski', 21: 'ski' };
  const ZONES = {
    ski: { k: 'Утро · соседи', t: 'Лыжная база и трасса', d: 'Городская лыжная база (СШОР) — муниципальная, не часть «Сибирского двора». Удобно начать день с круга по лыжне и прийти к нам греться.', list: [['Адрес', 'ул. Ленина, 7 к1'], ['Прокат и часы', 'у лыжной базы']], btn: 'Утро с лыжней — в мой день' },
    ethno: { k: 'День · 12:00–16:00', t: 'Юганская этнодеревня', d: 'Стойбище ханты: белый чум с орнаментом, «красный» гостевой чум, хантыйский дом, лабаз на сваях, хлебная печь, поляна со столами и очагом. Цены программ — с человека.', list: [['Для школьников', '400 ₽'], ['«Знакомство с миром ханты»', '700 ₽'], ['«В гостях у ханты»', '1 300 ₽'], ['«Путешествие в мир ханты»', '1 800 ₽']], btn: 'Программу — в мой день' },
    banya: { k: 'Вечер', t: 'Бани на дровах у пруда', d: 'Бани разного размера в подкове пруда. У каждой своя площадка с мангалом и беседкой.', list: [['Вместимость', '2–20 человек'], ['Стоимость', 'по запросу']], btn: 'Баню — в мой день' },
    cafe: { k: 'День и ночь', t: 'Кафе «Сибирь»', d: 'Зал на 100 мест с национальной кухней: оленина, заливное, манты. Банкеты, свадьбы, корпоративы. Рядом парковка.', list: [['Ланч', '350 ₽'], ['Банкет', 'по запросу']], btn: 'Ужин — в мой день' },
  };

  const mask = { w: 0, h: 0, z: null, cache: {} };
  const maskReady = new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        const z = new Uint8Array(c.width * c.height);
        for (let i = 0; i < z.length; i++) z[i] = Math.round(d[i * 4] / 10);
        Object.assign(mask, { w: c.width, h: c.height, z });
      } catch (e) { /* file:// или чужой источник — без подсветки */ }
      res();
    };
    im.onerror = () => res();
    im.src = 'assets/img/map-mask.png';
  });

  function groupLayer(g, dark) {
    const key = g + (dark ? ':d' : ':l');
    if (mask.cache[key]) return mask.cache[key];
    const { w: W, h: H, z } = mask;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); const img = x.createImageData(W, H); const px = img.data;
    const inG = (i) => GROUP[z[i]] === g;
    for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
      const i = y * W + xx; if (!inG(i)) continue;
      const edge = !inG(i - 1) || !inG(i + 1) || !inG(i - W) || !inG(i + W);
      const o = i * 4;
      const E = dark ? [255, 205, 140, 230] : [166, 50, 43, 120];
      const F = dark ? [255, 190, 110, 64] : [166, 50, 43, 44];
      const C = edge ? E : F;
      px[o] = C[0]; px[o + 1] = C[1]; px[o + 2] = C[2]; px[o + 3] = C[3];
    }
    x.putImageData(img, 0, 0);
    return (mask.cache[key] = c);
  }

  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return cv.getContext('2d');
  }
  function paint(cv, layers, dark) {
    const ctx = fitCanvas(cv); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!mask.z) return;
    ctx.imageSmoothingEnabled = true;
    for (const [g, a] of layers) {
      if (!g || a <= 0.01) continue;
      const L = groupLayer(g, dark);
      ctx.globalAlpha = a * (dark ? 0.6 : 0.35); ctx.filter = 'blur(' + Math.max(2, Math.round(cv.width / 450)) + 'px)';
      ctx.drawImage(L, 0, 0, cv.width, cv.height);
      ctx.filter = 'none'; ctx.globalAlpha = a;
      ctx.drawImage(L, 0, 0, cv.width, cv.height);
    }
    ctx.globalAlpha = 1;
  }

  /* ——— шапка: тёмная над тёмными секциями ——— */
  const darkSecs = $$('.plan, .voices, .faq, .foot');
  const day = $('.day');
  function topbarTone() {
    const y = 40; let dark = false;
    for (const s of darkSecs) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) dark = true; }
    if (day) { const r = day.getBoundingClientRect(); if (r.top <= y && r.bottom > y && +day.dataset.t >= 2) dark = true; }
    document.body.classList.toggle('is-dark', dark);
  }

  /* ——— СУТКИ ДВОРА ——— */
  const D = day && {
    stage: $('.day__stage'), cv: $('.day__seq'), poster: $('.day__poster'), load: $('.day__load'),
    steps: $$('.step'), dots: $$('.day__dots i'), hh: $('.day__hh'), mm: $('.day__mm'),
    arc: $('.sun__arc'), dot: $('.sun__dot'),
  };
  const CH = [{ t: 9 * 60 + 40 }, { t: 13 * 60 }, { t: 18 * 60 + 30 }, { t: 21 * 60 + 30 }];
  /* Пролёт: 440 кадров из Blender. Два уровня: лёгкий (640×360 / 360×640, ≈5 МБ, грузится первым за пару секунд —
     пролёт сразу идёт без пропусков) и полный (1920×1080 / 720×1280), который подгружается вокруг текущей позиции
     и подменяет кадры. Кадры распаковываются заранее в ImageBitmap по направлению движения.
     Положение в пролёте ведёт критически демпфированная пружина: скорость камеры набирается и гаснет плавно,
     не пульсирует от щелчков колеса. */
  const SEQ = {
    n: 440, hold: [[1, 20], [140, 160], [280, 300], [420, 440]], fly: [[20, 140], [160, 280], [300, 420]], HOLD: 0.36,
    hi: { d: 'assets/seq3/d', m: 'assets/seq2/m' }, lo: { d: 'assets/seq3/l', m: 'assets/seq2/ml' }, size: { d: [1920, 1080], m: [720, 1280] },
  };
  const seq = { set: '', lo: [], hi: [], haveLo: 0, haveHi: 0, bmp: new Map(), pending: new Set(), target: 1, disp: 1, vel: 0, key: '', ctx: null, raf: 0, last: 0, gen: 0, fetching: new Set() };
  const BMP_MAX = 64, DEC_PAR = 4, NET_PAR = 8;
  const OMEGA = +((/[?&]omega=([\d.]+)/.exec(location.search) || [])[1] || 5);
  function seqSet() { return innerHeight > innerWidth * 1.1 ? 'm' : 'd'; }
  const pad4 = (i) => String(i).padStart(4, '0');
  function seqInit() {
    if (!D) return;
    const set = seqSet(); if (set === seq.set) return;
    const gen = ++seq.gen;
    seq.bmp.forEach((e) => e.bm.close && e.bm.close()); seq.bmp.clear(); seq.pending.clear(); seq.fetching.clear();
    seq.set = set; seq.lo = new Array(SEQ.n + 2); seq.hi = new Array(SEQ.n + 2); seq.haveLo = 0; seq.haveHi = 0; seq.key = '';
    const [W, H] = SEQ.size[set]; D.cv.width = W; D.cv.height = H; seq.ctx = null;
    // очередь лёгкого уровня: ключевые кадры, затем шагами
    const loOrder = []; const seen = new Set(); const add = (i) => { if (i >= 1 && i <= SEQ.n && !seen.has(i)) { seen.add(i); loOrder.push(i); } };
    [1, 20, 140, 160, 280, 300, 420, 440].forEach(add);
    for (const st of [16, 8, 4, 2, 1]) for (let i = 1; i <= SEQ.n; i += st) add(i);
    let k = 0, active = 0;
    const nextHi = () => {
      // ближайший к текущей позиции полный кадр, сначала по направлению движения
      const c = Math.round(seq.disp), dir = lastDir;
      for (let d = 0; d <= SEQ.n; d++) {
        for (const i of [c + dir * d, c - dir * d]) if (i >= 1 && i <= SEQ.n && !seq.hi[i] && !seq.fetching.has('h' + i)) return i;
      }
      return 0;
    };
    const pump = () => {
      while (active < NET_PAR) {
        let tier, i;
        // лёгкий уровень первым; полный — когда лёгкий почти готов (или 2 потока сразу)
        if (k < loOrder.length) { tier = 'l'; i = loOrder[k++]; } // сначала весь лёгкий уровень
        else { i = nextHi(); tier = 'h'; if (!i) { if (k < loOrder.length) { tier = 'l'; i = loOrder[k++]; } else break; } }
        active++; seq.fetching.add(tier + i);
        const url = `${(tier === 'l' ? SEQ.lo : SEQ.hi)[set]}/${pad4(i)}.webp`;
        fetch(url).then((r) => (r.ok ? r.blob() : null)).then((bl) => {
          active--; seq.fetching.delete(tier + i); if (gen !== seq.gen) return;
          if (bl) {
            if (tier === 'l') { seq.lo[i] = bl; seq.haveLo++; } else { seq.hi[i] = bl; seq.haveHi++; }
            if (D.load) {
              D.load.firstElementChild.style.width = (100 * (seq.haveLo + seq.haveHi) / (2 * SEQ.n)).toFixed(1) + '%';
              if (seq.haveHi >= SEQ.n) D.load.classList.add('is-done');
            }
          }
          kick(); pump();
        }, () => { active--; seq.fetching.delete(tier + i); pump(); });
      }
    };
    pump();
  }
  function decode(i, tier) {
    const gen = seq.gen; seq.pending.add(i);
    const bl = tier === 'h' ? seq.hi[i] : seq.lo[i];
    const p = window.createImageBitmap ? createImageBitmap(bl) : new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(bl); });
    p.then((bm) => {
      seq.pending.delete(i);
      if (gen !== seq.gen) { bm.close && bm.close(); return; }
      const old = seq.bmp.get(i); if (old && old.hi && tier !== 'h') { bm.close && bm.close(); return; }
      if (old && old.bm.close) old.bm.close();
      seq.bmp.set(i, { bm, hi: tier === 'h' }); seq.key = ''; kick();
    }, () => seq.pending.delete(i));
  }
  let lastDir = 1;
  function ensureBitmaps() {
    const gap = seq.target - seq.disp; const dir = Math.abs(seq.vel) > 0.2 ? Math.sign(seq.vel) : Math.abs(gap) > 0.05 ? Math.sign(gap) : lastDir; lastDir = dir;
    const c = Math.round(seq.disp); const reach = Math.min(64, 22 + Math.ceil(Math.abs(gap)) + Math.ceil(Math.abs(seq.vel) * 0.3));
    const list = [c];
    for (let k = 2; k <= reach; k += 2) list.push(c + dir * k);
    for (let k = 1; k <= reach; k += 2) list.push(c + dir * k);
    for (let k = 1; k <= 8; k++) list.push(c - dir * k);
    for (const i of list) {
      if (seq.pending.size >= DEC_PAR) break;
      if (i < 1 || i > SEQ.n || seq.pending.has(i)) continue;
      const e = seq.bmp.get(i);
      if (seq.hi[i] && (!e || !e.hi)) decode(i, 'h');
      else if (!e && seq.lo[i]) decode(i, 'l');
    }
    if (seq.bmp.size > BMP_MAX) {
      const score = (i) => { const d = (i - c) * dir; return d >= 0 ? d * 0.5 : -d * 2; };
      const far = [...seq.bmp.keys()].sort((x, y) => score(y) - score(x));
      while (seq.bmp.size > BMP_MAX && far.length) { const i = far.shift(); const e = seq.bmp.get(i); e.bm.close && e.bm.close(); seq.bmp.delete(i); }
    }
  }
  function nearestBmp(i) {
    for (let d = 1; d <= SEQ.n; d++) { if (seq.bmp.has(i - d)) return i - d; if (seq.bmp.has(i + d)) return i + d; }
    return 0;
  }
  function drawSeq() {
    // смешиваем ближайшие готовые кадры по обе стороны дробной позиции
    const wf = clamp(seq.disp, 1, SEQ.n); const fl = Math.floor(wf), ce = Math.ceil(wf);
    let lo = -1, hi = -1;
    for (let k = 0; k <= 8 && (lo < 0 || hi < 0); k++) {
      if (lo < 0 && seq.bmp.has(fl - k)) lo = fl - k;
      if (hi < 0 && seq.bmp.has(ce + k)) hi = ce + k;
    }
    let a = 0;
    if (lo < 0 && hi < 0) { lo = nearestBmp(Math.round(wf)); if (!lo) return; hi = lo; }
    else if (lo < 0) lo = hi; else if (hi < 0) hi = lo;
    if (hi !== lo) a = Math.round(((wf - lo) / (hi - lo)) * 24) / 24;
    const e0 = seq.bmp.get(lo), e1 = seq.bmp.get(hi);
    const key = lo + (e0.hi ? 'h' : 'l') + ':' + hi + (e1.hi ? 'h' : 'l') + ':' + a; if (key === seq.key) return;
    const cv = D.cv; const W = cv.width, H = cv.height;
    const ctx = seq.ctx || (seq.ctx = cv.getContext('2d', { alpha: false }));
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 1; ctx.drawImage(e0.bm, 0, 0, W, H);
    if (a > 0 && hi !== lo) { ctx.globalAlpha = a; ctx.drawImage(e1.bm, 0, 0, W, H); ctx.globalAlpha = 1; }
    seq.key = key;
    if (!cv.classList.contains('is-ready')) cv.classList.add('is-ready');
  }
  function loop(now) {
    seq.raf = 0;
    let dt = (now - (seq.last || now)) / 1000; if (!(dt > 0)) dt = 1 / 60; dt = Math.min(dt, 0.05); seq.last = now;
    const gap = seq.target - seq.disp;
    if (Math.abs(gap) > 60) { seq.disp = seq.target - Math.sign(gap) * 60; seq.vel = 0; } // прыжок клавишами/якорем
    // критически демпфированная пружина (полунеявный Эйлер, шаги по 4 мс для устойчивости)
    for (let t = dt; t > 0; t -= 0.004) {
      const h = Math.min(0.004, t);
      seq.vel += (OMEGA * OMEGA * (seq.target - seq.disp) - 2 * OMEGA * seq.vel) * h;
      seq.disp += seq.vel * h;
    }
    if (Math.abs(seq.target - seq.disp) < 0.005 && Math.abs(seq.vel) < 0.02) { seq.disp = seq.target; seq.vel = 0; }
    ensureBitmaps(); drawSeq();
    if (seq.disp !== seq.target || seq.pending.size) seq.raf = requestAnimationFrame(loop); else seq.last = 0;
  }
  function kick() { if (!seq.raf && D) seq.raf = requestAnimationFrame(loop); }
  window.__sdSeq = { seq };
  let lastActive = -1, dayP = -1;
  function renderDay(p) {
    if (!D) return;
    const n = CH.length; const pp = clamp(p, 0, 0.9999) * n; const c = Math.floor(pp); const u = pp - c;
    const H = SEQ.HOLD; const fu = c < n - 1 ? clamp((u - H) / (1 - H), 0, 1) : 0;
    // кадр пролёта
    let f;
    if (c === n - 1) f = lerp(SEQ.hold[c][0], SEQ.hold[c][1], u);
    else if (u < H) f = lerp(SEQ.hold[c][0], SEQ.hold[c][1], u / H);
    else f = lerp(SEQ.fly[c][0], SEQ.fly[c][1], fu);
    seq.target = f; kick();
    const active = c < n - 1 && fu > 0.8 ? c + 1 : c;
    if (active !== lastActive) {
      lastActive = active; day.dataset.t = active;
      D.steps.forEach((el, i) => el.classList.toggle('is-on', i === active));
      D.dots.forEach((el, i) => el.classList.toggle('is-on', i <= active));
    }
    // часы идут во время перелёта
    const tA = CH[c].t, tB = c < n - 1 ? CH[c + 1].t : 23 * 60 + 10;
    const mins = Math.round(c < n - 1 ? lerp(tA, tB, fu) : lerp(tA, tB, sstep(0.2, 1, u)));
    D.hh.textContent = String(Math.floor(mins / 60)).padStart(2, '0');
    D.mm.textContent = String(mins % 60).padStart(2, '0');
    const L = D.arc.getTotalLength(); const pt = D.arc.getPointAtLength(L * clamp((mins - 8 * 60) / (15 * 60 + 30), 0, 1));
    D.dot.setAttribute('cx', pt.x); D.dot.setAttribute('cy', pt.y);
  }

  /* ——— плавная прокрутка (колесо мыши и тачпад; на телефоне — родная инерция) ———
     Как у Lenis: колесо задаёт цель, страница догоняет её с экспоненциальным затуханием.
     Прокрутка остаётся нативной, поэтому sticky-блоки и ScrollTrigger работают как обычно. */
  const Smooth = (() => {
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const api = { on: fine && !RM, to: null };
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    let target = scrollY, cur = scrollY, setY = scrollY, raf = 0, last = 0, lambda = 7.5;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    function tick(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000 || 1 / 60); last = now;
      // пользователь потянул полосу прокрутки или нажал клавишу — отдаём управление
      if (Math.abs(scrollY - setY) > 3) { target = cur = setY = scrollY; raf = 0; last = 0; return; }
      cur += (target - cur) * (1 - Math.exp(-lambda * dt));
      if (Math.abs(target - cur) < 0.4) cur = target;
      setY = Math.round(cur * 10) / 10; scrollTo(0, setY);
      if (cur !== target) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; }
    }
    function go(y, l) { target = clamp(y, 0, maxY()); lambda = l || 7.5; if (!raf) { cur = scrollY; setY = scrollY; last = 0; raf = requestAnimationFrame(tick); } }
    function scrollable(el, dy) {
      for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el); if (!/(auto|scroll)/.test(cs.overflowY)) continue;
        if (el.scrollHeight > el.clientHeight + 1 && (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      return false;
    }
    if (api.on) {
      document.documentElement.classList.add('smooth');
      addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.defaultPrevented) return;              // масштаб страницы
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;      // горизонтальный жест — родной
        if (scrollable(e.target, e.deltaY)) return;                // вложенная прокрутка
        e.preventDefault();
        const k = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
        if (!raf) { target = scrollY; }
        go(target + e.deltaY * k, 7.5);
      }, { passive: false });
      addEventListener('scroll', () => { if (!raf) { target = cur = setY = scrollY; } }, { passive: true });
      addEventListener('resize', () => { target = clamp(target, 0, maxY()); }, { passive: true });
    }
    api.to = (el) => {
      const node = typeof el === 'string' ? document.querySelector(el) : el; if (!node) return;
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const y = node.getBoundingClientRect().top + scrollY - pad;
      if (RM) { scrollTo(0, y); return; }
      if (api.on) go(y, 4.2); else node.scrollIntoView({ behavior: 'smooth' });
    };
    // якорные ссылки меню и кнопок — тем же движком
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const node = document.querySelector(id); if (!node) return;
      e.preventDefault(); api.to(node); history.replaceState(null, '', id);
    });
    return api;
  })();

  /* ——— прокрутка ——— */
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (day) {
        const r = day.getBoundingClientRect(); const len = r.height - innerHeight;
        const p = clamp(-r.top / Math.max(1, len), 0, 1);
        if (Math.abs(p - dayP) > 0.00005 || dayP < 0) { dayP = p; renderDay(p); }
      }
      topbarTone();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { seqInit(); seq.key = ''; kick(); dayP = -1; onScroll(); renderMapHL(); }, { passive: true });
  maskReady.then(() => { renderMapHL(); });
  // кадры пролёта грузим после первого экрана
  if (document.readyState === 'complete') seqInit(); else addEventListener('load', seqInit, { once: true });
  onScroll();

  /* ——— КАРТА ——— */
  const M = { frame: $('.map__frame'), imgs: $$('.map__img'), cv: $('.map__hl'), tip: $('.tip'), pins: $$('.pin'), seg: $$('.seg button'), zone: $('.zone'), scroll: $('.map__scroll') };
  let hoverG = null, selG = null, mapT = '1';
  function renderMapHL() { if (!M.cv) return; paint(M.cv, [[selG, 1], [hoverG !== selG ? hoverG : null, 0.75]], mapT >= '2'); }
  function idAt(ev) {
    if (!mask.z) return 0;
    const r = M.frame.getBoundingClientRect();
    const mx = Math.floor(((ev.clientX - r.left) / r.width) * mask.w), my = Math.floor(((ev.clientY - r.top) / r.height) * mask.h);
    const at = (x, y) => (x < 0 || y < 0 || x >= mask.w || y >= mask.h ? 0 : mask.z[y * mask.w + x]);
    let id = at(mx, my); if (id && id !== 3) return id;
    // мелкие постройки этнодеревни: ищем рядом
    let best = id, bd = 1e9; const R = 9;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const v = at(mx + dx, my + dy); if (!v || v === 3 || v === 2 || v === 21) continue;
      const d = dx * dx + dy * dy; if (d < bd && d <= R * R) { bd = d; best = v; }
    }
    return best;
  }
  function showZone(g) {
    selG = g; const Z = ZONES[g];
    M.pins.forEach((p) => p.classList.toggle('is-on', p.dataset.zone === g));
    if (Z) {
      $('.zone__k', M.zone).textContent = Z.k; $('.zone__t', M.zone).textContent = Z.t; $('.zone__d', M.zone).textContent = Z.d;
      $('.zone__list', M.zone).innerHTML = Z.list.map(([a, b]) => `<li><span>${a}</span><b>${nb(b)}</b></li>`).join('');
      const btn = $('.zone__add', M.zone); btn.hidden = false; btn.dataset.pick = g; btn.textContent = isPicked(g) ? 'Уже в вашем дне ✓' : Z.btn;
    }
    renderMapHL();
  }
  if (M.frame) {
    M.frame.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch') return;
      const id = idAt(ev); const g = GROUP[id] || null;
      if (g !== hoverG) { hoverG = g; renderMapHL(); }
      if (id && NAMES[id]) {
        const r = M.frame.getBoundingClientRect();
        M.tip.hidden = false; M.tip.textContent = NAMES[id];
        M.tip.style.left = ev.clientX - r.left + 'px'; M.tip.style.top = ev.clientY - r.top + 'px';
      } else M.tip.hidden = true;
      M.frame.style.cursor = g ? 'pointer' : 'crosshair';
    });
    M.frame.addEventListener('pointerleave', () => { hoverG = null; M.tip.hidden = true; renderMapHL(); });
    M.frame.addEventListener('click', (ev) => {
      if (ev.target.closest('.pin')) return;
      const g = GROUP[idAt(ev)]; if (g) showZone(g);
    });
    M.pins.forEach((p) => p.addEventListener('click', () => showZone(p.dataset.zone)));
    M.seg.forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.time;
      M.seg.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      M.imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.t === t));
      mapT = t; renderMapHL();
    }));
    M.imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.t === '1'));
    // на телефоне карта шире экрана — начинаем с центра
    const centerMap = () => { if (M.scroll.scrollWidth > M.scroll.clientWidth) M.scroll.scrollLeft = (M.scroll.scrollWidth - M.scroll.clientWidth) * 0.45; };
    requestAnimationFrame(centerMap);
  }

  /* ——— СОБРАТЬ ДЕНЬ ——— */
  const PROG = {
    school: { n: 'Экскурсия для школьников', p: 400 },
    znak: { n: '«Знакомство с миром ханты»', p: 700 },
    gost: { n: '«В гостях у ханты»', p: 1300 },
    put: { n: '«Путешествие в мир ханты»', p: 1800 },
    dev: { n: '«Северное тепло: этнодевичник»', p: 0, range: '2 500–4 000 ₽' },
  };
  const form = $('.planner');
  const st = { guests: 4 };
  const rub = (v) => v.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
  const gWord = (n) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'гость'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'гостя'; return 'гостей'; };
  function isPicked(g) {
    if (!form) return false;
    const f = form.elements;
    return g === 'ski' ? f.ski.checked : g === 'banya' ? f.banya.checked : g === 'ethno' ? !!f.prog.value : g === 'cafe' ? !!f.dinner.value : false;
  }
  function pick(g) {
    const f = form.elements;
    if (g === 'ski') f.ski.checked = true;
    if (g === 'banya') f.banya.checked = true;
    if (g === 'ethno' && !f.prog.value) form.querySelector('input[name=prog][value=znak]').checked = true;
    if (g === 'cafe' && !f.dinner.value) form.querySelector('input[name=dinner][value=dinner]').checked = true;
    updatePlan();
  }
  function updatePlan() {
    if (!form) return;
    const f = form.elements; const n = st.guests;
    $('#guests').textContent = n; $('.num__l').textContent = gWord(n);
    const lines = []; let sum = 0; const ask = [];
    const plan = [];
    if (f.ski.checked) { lines.push(['Круг по лыжне у соседей', 'у лыжной базы']); plan.push('Утро: круг по лыжне на городской лыжной базе, потом греться к вам.'); }
    const pv = f.prog.value;
    if (pv) {
      const P = PROG[pv];
      if (P.p) { lines.push([`${P.n} × ${n}`, rub(P.p * n)]); sum += P.p * n; plan.push(`День: программа ${P.n} (${P.p.toLocaleString('ru-RU')} ₽ с человека).`); }
      else { lines.push([P.n, nb(P.range)]); ask.push('этнодевичник'); plan.push(`День: ${P.n} — подскажите точную стоимость (${P.range}).`); }
    }
    if (f.lunch.checked) { lines.push([`Ланч в кафе × ${n}`, rub(350 * n)]); sum += 350 * n; plan.push('Ланч в кафе.'); }
    if (f.banya.checked) { lines.push(['Баня на дровах', 'по запросу']); ask.push('баня'); plan.push('Вечер: баня на дровах с площадкой и мангалом — подскажите свободное время и цену.'); }
    const dv = f.dinner.value;
    if (dv === 'dinner') { lines.push(['Ужин в «Сибири»', 'по меню']); plan.push('Ночь: ужин в кафе «Сибирь» — забронируйте, пожалуйста, стол.'); }
    if (dv === 'banket') { lines.push(['Банкет в «Сибири»', 'по запросу']); ask.push('банкет'); plan.push('Ночь: банкет в кафе «Сибирь» — пришлите варианты меню и цену.'); }
    const date = f.date.value ? new Date(f.date.value + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }) : '';
    $('[data-r=date]').textContent = date || 'дата не выбрана';
    $('[data-r=guests]').textContent = `${n} ${gWord(n)}`;
    $('[data-r=lines]').innerHTML = lines.length ? lines.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('') : '<li class="empty"><span>Отметьте, что хотите успеть</span><span></span></li>';
    const open = lines.some(([, b]) => /запрос|меню/.test(b));
    $('[data-r=total]').textContent = !lines.length ? '—' : sum ? (open ? 'от ' : '') + rub(sum) : 'по запросу';
    $('[data-r=ask]').textContent = ask.length ? `По запросу: ${ask.join(', ')} — администратор назовёт цену.` : '';
    const msg = ['Здравствуйте! Хотим провести день в «Сибирском дворе».',
      `${date ? 'Дата: ' + date + '. ' : ''}Нас ${n} ${gWord(n)}.`.trim(), ...plan,
      sum ? `По ценам с сайта выходит ${open ? 'от ' : ''}${sum.toLocaleString('ru-RU')} ₽. Подтвердите, пожалуйста, время и стоимость.` : 'Подтвердите, пожалуйста, время и стоимость.'];
    $('[data-r=msg]').textContent = plan.length ? msg.join('\n') : 'Отметьте утро, день, вечер или ночь — текст заявки соберётся здесь.';
    $$('[data-pick]').forEach((b) => {
      const on = isPicked(b.dataset.pick);
      if (b.classList.contains('step__add')) {
        if (!b.dataset.label) b.dataset.label = b.innerHTML;
        b.innerHTML = on ? 'В вашем дне ✓ <span class="sr">— изменить в сборщике</span>' : b.dataset.label;
        b.classList.toggle('is-on', on);
      }
    });
    if (selG) { const zb = $('.zone__add'); if (zb && !zb.hidden) zb.textContent = isPicked(selG) ? 'Уже в вашем дне ✓' : ZONES[selG].btn; }
    return plan.length ? msg.join('\n') : '';
  }
  function setupDates() {
    const chips = $$('.chip'); const inp = form.elements.date;
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date(); today.setHours(12, 0, 0, 0);
    chips.forEach((ch) => {
      const k = ch.dataset.day;
      if (k !== 'other') {
        const d = new Date(today); const add = (+k - d.getDay() + 7) % 7; d.setDate(d.getDate() + add);
        ch.dataset.iso = iso(d);
        ch.textContent = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.$/, '');
      }
      ch.setAttribute('aria-pressed', 'false');
      ch.addEventListener('click', () => {
        const on = ch.getAttribute('aria-pressed') !== 'true';
        chips.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        if (k === 'other') { inp.hidden = !on; if (on) { ch.setAttribute('aria-pressed', 'true'); inp.focus(); } else inp.value = ''; }
        else { inp.hidden = true; inp.value = on ? ch.dataset.iso : ''; if (on) ch.setAttribute('aria-pressed', 'true'); }
        updatePlan();
      });
    });
    inp.min = iso(today);
  }
  if (form) {
    setupDates();
    form.addEventListener('change', updatePlan);
    $$('.num__b').forEach((b) => b.addEventListener('click', () => { st.guests = clamp(st.guests + +b.dataset.d, 1, 40); updatePlan(); }));
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-pick]'); if (!b) return;
      const g = b.dataset.pick;
      if (isPicked(g) && b.classList.contains('step__add')) { Smooth.to('#den'); return; }
      pick(g);
    });
    $('[data-send]').addEventListener('click', async () => {
      const text = updatePlan() || 'Здравствуйте! Хотим приехать в «Сибирский двор». Подскажите, пожалуйста, что можно забронировать.';
      const out = $('.receipt__copied');
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } ta.remove();
      }
      out.textContent = ok ? 'Текст скопирован — вставьте его в чат.' : 'Скопируйте текст заявки выше и вставьте в чат.';
      window.open(MAX_URL, '_blank', 'noopener');
    });
    updatePlan();
  }

  /* ——— появление ——— */
  if (G && !RM) {
    G.from('.hero__in > *', { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.15 });
    G.from('.hero__hint, .hero__time', { opacity: 0, duration: 1, delay: 0.9 });
    G.utils.toArray('.sec-head, .rq, .rates li, .faq details').forEach((el) => {
      G.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    G.from('.receipt__paper', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.plan__grid', start: 'top 70%', once: true } });
  }
})();
