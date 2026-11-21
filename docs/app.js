/* Сибирский двор — демо. Сцена «Сутки двора», карта по маске зон, сборщик дня. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  /* Пролёт: 1318 кадров Full HD, упакованных в одно видео H.264 (соседние кадры почти одинаковы — видео в разы легче картинок).
     Файл качается потоком; свой разбор MP4 знает, где лежит каждый кадр, и аппаратный декодер браузера (WebCodecs)
     распаковывает ровно тот кадр, который нужен прокрутке. Последние ~32 кадра хранятся готовыми — назад листается мгновенно.
     Положение в пролёте ведёт критически демпфированная пружина. Без WebCodecs — перемотка того же видео в <video>. */
  const SEQ = {
    n: 1318, hold: [[1, 58], [418, 478], [838, 898], [1258, 1318]], fly: [[58, 418], [478, 838], [898, 1258]], HOLD: 0.36,
    src: { d: 'assets/fly/fly-d.mp4', m: 'assets/fly/fly-m.mp4' },
  };
  const OMEGA = +((/[?&]omega=([\d.]+)/.exec(location.search) || [])[1] || 3);
  const CACHE = 34, AHEAD = 20;
  const seq = { set: '', gen: 0, mode: '', target: 1, disp: 1, vel: 0, raf: 0, last: 0, key: '', ctx: null,
    buf: null, got: 0, total: 0, samples: null, sync: null, codec: null, desc: null,
    dec: null, decPos: -1, inflight: 0, cache: new Map(), video: null, seeking: false };
  function seqSet() { return innerHeight > innerWidth * 1.1 ? 'm' : 'd'; }

  /* ——— минимальный разбор MP4 (одна видеодорожка, moov в начале файла) ——— */
  function mp4Parse(u8, end) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const type = (o) => String.fromCharCode(u8[o + 4], u8[o + 5], u8[o + 6], u8[o + 7]);
    const boxes = (from, to, cb) => {
      for (let o = from; o + 8 <= to;) {
        let size = dv.getUint32(o); let hdr = 8;
        if (size === 1) { size = Number(dv.getBigUint64(o + 8)); hdr = 16; } else if (size === 0) size = to - o;
        if (o + size > to || size < 8) return false;
        if (cb(type(o), o + hdr, o + size) === true) return true;
        o += size;
      }
      return false;
    };
    let moov = null;
    boxes(0, end, (t, a, b) => { if (t === 'moov') { moov = [a, b]; return true; } });
    if (!moov) return null;
    const find = (path, a, b) => { let r = null; boxes(a, b, (t, x, y) => { if (t === path[0]) { r = path.length === 1 ? [x, y] : find(path.slice(1), x, y); return true; } }); return r; };
    let stbl = null;
    boxes(moov[0], moov[1], (t, a, b) => {
      if (t !== 'trak') return;
      const hd = find(['mdia', 'hdlr'], a, b); if (!hd) return;
      if (String.fromCharCode(u8[hd[0] + 8], u8[hd[0] + 9], u8[hd[0] + 10], u8[hd[0] + 11]) !== 'vide') return;
      stbl = find(['mdia', 'minf', 'stbl'], a, b); return true;
    });
    if (!stbl) return null;
    const box = (n) => find([n], stbl[0], stbl[1]);
    // stsd → avc1 → avcC
    const stsd = box('stsd'); const ent = stsd[0] + 8; // version/flags + entry_count
    const sampleEntryEnd = ent + dv.getUint32(ent);
    let avcC = null; boxes(ent + 8 + 78, sampleEntryEnd, (t, a, b) => { if (t === 'avcC') { avcC = u8.slice(a, b); return true; } });
    const codec = 'avc1.' + [avcC[1], avcC[2], avcC[3]].map((x) => x.toString(16).padStart(2, '0')).join('');
    const stsz = box('stsz'); const fixed = dv.getUint32(stsz[0] + 4), cnt = dv.getUint32(stsz[0] + 8);
    const sizes = new Uint32Array(cnt); for (let i = 0; i < cnt; i++) sizes[i] = fixed || dv.getUint32(stsz[0] + 12 + i * 4);
    let offs = []; const stco = box('stco'), co64 = box('co64');
    if (stco) { const n = dv.getUint32(stco[0] + 4); for (let i = 0; i < n; i++) offs.push(dv.getUint32(stco[0] + 8 + i * 4)); }
    else { const n = dv.getUint32(co64[0] + 4); for (let i = 0; i < n; i++) offs.push(Number(dv.getBigUint64(co64[0] + 8 + i * 8))); }
    const stsc = box('stsc'); const sn = dv.getUint32(stsc[0] + 4); const runs = [];
    for (let i = 0; i < sn; i++) runs.push([dv.getUint32(stsc[0] + 8 + i * 12), dv.getUint32(stsc[0] + 12 + i * 12)]);
    const sampleOff = new Float64Array(cnt); let si = 0;
    for (let c = 0; c < offs.length; c++) {
      let per = runs[0][1]; for (const [first, spc] of runs) if (c + 1 >= first) per = spc;
      let o = offs[c]; for (let k = 0; k < per && si < cnt; k++) { sampleOff[si] = o; o += sizes[si]; si++; }
    }
    const stss = box('stss'); let sync;
    if (stss) { const n = dv.getUint32(stss[0] + 4); sync = new Uint32Array(n); for (let i = 0; i < n; i++) sync[i] = dv.getUint32(stss[0] + 8 + i * 4) - 1; }
    else { sync = new Uint32Array(cnt); for (let i = 0; i < cnt; i++) sync[i] = i; }
    // avcC уже без заголовка бокса — это и есть description для VideoDecoder
    return { codec, desc: avcC, sizes, offs: sampleOff, sync, syncSet: new Set(sync), count: cnt };
  }

  function seqInit() {
    if (!D) return;
    const set = seqSet(); if (set === seq.set) return;
    const gen = ++seq.gen; seq.set = set; seq.key = '';
    seq.cache.forEach((bm) => bm.close && bm.close()); seq.cache.clear();
    if (seq.dec) { try { seq.dec.close(); } catch (e) {} seq.dec = null; }
    if (seq.video) { seq.video.remove(); seq.video = null; }
    seq.buf = null; seq.got = 0; seq.samples = null; seq.decPos = -1; seq.inflight = 0;
    const url = SEQ.src[set];
    if (!('VideoDecoder' in window) || !window.ReadableStream) return seqVideoFallback(url);
    fetch(url).then(async (res) => {
      if (!res.ok || !res.body) throw new Error('fetch');
      const total = +res.headers.get('Content-Length') || 0;
      let buf = new Uint8Array(total || 8 << 20), got = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; if (gen !== seq.gen) return;
        if (got + value.length > buf.length) { const nb = new Uint8Array(Math.max(buf.length * 2, got + value.length)); nb.set(buf.subarray(0, got)); buf = nb; }
        buf.set(value, got); got += value.length; seq.buf = buf; seq.got = got; seq.total = total || got;
        if (!seq.samples) {
          const info = mp4Parse(buf, got);
          if (info) {
            const cfg = { codec: info.codec, description: info.desc, hardwareAcceleration: 'prefer-hardware', optimizeForLatency: true };
            let ok = false; try { ok = (await VideoDecoder.isConfigSupported(cfg)).supported; } catch (e) { ok = false; }
            if (gen !== seq.gen) return;
            if (!ok) { cfg.hardwareAcceleration = 'no-preference'; try { ok = (await VideoDecoder.isConfigSupported(cfg)).supported; } catch (e) {} }
            if (!ok) { reader.cancel(); return seqVideoFallback(url); }
            seq.samples = info; seq.cfg = cfg; seq.mode = 'codecs'; newDecoder();
          }
        }
        if (D.load) D.load.firstElementChild.style.width = (100 * got / (seq.total || got)).toFixed(1) + '%';
        kick();
      }
      if (D.load) D.load.classList.add('is-done');
      kick();
    }).catch(() => { if (gen === seq.gen) seqVideoFallback(url); });
  }
  function newDecoder() {
    const gen = seq.gen;
    if (seq.dec) { try { seq.dec.close(); } catch (e) {} }
    seq.inflight = 0; seq.decPos = -1;
    seq.dec = new VideoDecoder({
      output: (frame) => {
        const idx = Math.round(frame.timestamp / 1000); // timestamp = номер кадра × 1000 мкс
        seq.inflight = Math.max(0, seq.inflight - 1);
        if (gen !== seq.gen || Math.abs(idx + 1 - seq.disp) > CACHE + AHEAD) { frame.close(); kick(); return; }
        createImageBitmap(frame).then((bm) => {
          frame.close();
          if (gen !== seq.gen) { bm.close(); return; }
          const old = seq.cache.get(idx); if (old) old.close();
          seq.cache.set(idx, bm); trimCache(); seq.key = ''; kick();
        }, () => frame.close());
      },
      error: () => { seq.decPos = -1; },
    });
    seq.dec.configure(seq.cfg);
  }
  function trimCache() {
    if (seq.cache.size <= CACHE) return;
    const c = seq.disp - 1;
    const far = [...seq.cache.keys()].sort((x, y) => Math.abs(y - c) - Math.abs(x - c));
    while (seq.cache.size > CACHE && far.length) { const i = far.shift(); seq.cache.get(i).close(); seq.cache.delete(i); }
  }
  const avail = (i) => seq.samples && i >= 0 && i < seq.samples.count && seq.offEnd(i) <= seq.got;
  seq.offEnd = (i) => seq.samples.offs[i] + seq.samples.sizes[i];
  function feed(i) {
    const S = seq.samples; const o = S.offs[i];
    const key = S.syncSet.has(i);
    seq.dec.decode(new EncodedVideoChunk({ type: key ? 'key' : 'delta', timestamp: i * 1000, data: seq.buf.subarray(o, o + S.sizes[i]) }));
    seq.decPos = i; seq.inflight++;
  }
  function keyBefore(i) { const sy = seq.samples.sync; let k = 0; for (let j = 0; j < sy.length && sy[j] <= i; j++) k = sy[j]; return k; }
  let lastDir = 1;
  function pumpDecode() {
    if (seq.mode !== 'codecs' || !seq.dec || seq.dec.state !== 'configured') return;
    const S = seq.samples; const want = clamp(Math.round(seq.disp) - 1, 0, S.count - 1);
    const dir = Math.abs(seq.vel) > 0.3 ? Math.sign(seq.vel) : lastDir; lastDir = dir;
    // какой ближайший нужный кадр ещё не готов
    let need = -1;
    for (let k = 0; k <= AHEAD; k++) {
      for (const i of k ? [want + dir * k, want - dir * Math.min(k, 6)] : [want]) {
        if (i >= 0 && i < S.count && !seq.cache.has(i) && avail(i)) { need = i; break; }
      }
      if (need >= 0) break;
    }
    if (need < 0) return;
    if (seq.inflight >= 6) return;
    // продолжаем подряд, если нужный кадр немного впереди; иначе — с ближайшего ключевого
    if (!(seq.decPos >= 0 && need > seq.decPos && need - seq.decPos <= 40)) {
      const k = keyBefore(need);
      if (!(seq.decPos >= k && seq.decPos < need)) { seq.dec.reset(); seq.dec.configure(seq.cfg); seq.inflight = 0; seq.decPos = k - 1; }
    }
    // подаём до нужного кадра и на 3 вперёд (декодеру нужен небольшой запас, чтобы отдать кадр)
    const stop = Math.min(S.count - 1, need + 3);
    while (seq.decPos < stop && seq.inflight < 8 && avail(seq.decPos + 1)) feed(seq.decPos + 1);
  }
  function seqVideoFallback(url) {
    seq.mode = 'video';
    const v = document.createElement('video'); v.className = 'day__seq day__video is-ready'; v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.src = url;
    v.addEventListener('seeked', () => { seq.seeking = false; kick(); });
    v.addEventListener('progress', () => { try { const e = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0; if (D.load) D.load.firstElementChild.style.width = (100 * e / (v.duration || 1)).toFixed(1) + '%'; } catch (e) {} });
    D.cv.after(v); D.cv.style.display = 'none'; seq.video = v; kick();
  }
  function drawSeq() {
    if (seq.mode === 'video') {
      const v = seq.video; if (!v || seq.seeking || !(v.readyState >= 1)) return;
      const t = (clamp(seq.disp, 1, SEQ.n) - 1) / 30; if (Math.abs(v.currentTime - t) < 0.5 / 30) return;
      seq.seeking = true; v.currentTime = t; return;
    }
    // смешиваем ближайшие готовые кадры по обе стороны дробной позиции
    const wf = clamp(seq.disp, 1, SEQ.n) - 1; const fl = Math.floor(wf), ce = Math.ceil(wf);
    let lo = -1, hi = -1;
    for (let k = 0; k <= 12 && (lo < 0 || hi < 0); k++) {
      if (lo < 0 && seq.cache.has(fl - k)) lo = fl - k;
      if (hi < 0 && seq.cache.has(ce + k)) hi = ce + k;
    }
    if (lo < 0 && hi < 0) return; if (lo < 0) lo = hi; else if (hi < 0) hi = lo;
    const a = hi !== lo ? Math.round(((wf - lo) / (hi - lo)) * 24) / 24 : 0;
    const key = lo + ':' + hi + ':' + a; if (key === seq.key) return;
    const b0 = seq.cache.get(lo), b1 = seq.cache.get(hi); const cv = D.cv;
    if (cv.width !== b0.width || cv.height !== b0.height) { cv.width = b0.width; cv.height = b0.height; seq.ctx = null; }
    const ctx = seq.ctx || (seq.ctx = cv.getContext('2d', { alpha: false }));
    ctx.globalAlpha = 1; ctx.drawImage(b0, 0, 0);
    if (a > 0 && hi !== lo) { ctx.globalAlpha = a; ctx.drawImage(b1, 0, 0); ctx.globalAlpha = 1; }
    seq.key = key;
    if (!cv.classList.contains('is-ready')) cv.classList.add('is-ready');
  }
  function loop(now) {
    seq.raf = 0;
    let dt = (now - (seq.last || now)) / 1000; if (!(dt > 0)) dt = 1 / 60; dt = Math.min(dt, 0.05); seq.last = now;
    const gap = seq.target - seq.disp;
    if (Math.abs(gap) > 150) { seq.disp = seq.target - Math.sign(gap) * 150; seq.vel = 0; } // прыжок клавишами/якорем
    for (let t = dt; t > 0; t -= 0.004) { // критически демпфированная пружина
      const h = Math.min(0.004, t);
      seq.vel += (OMEGA * OMEGA * (seq.target - seq.disp) - 2 * OMEGA * seq.vel) * h;
      seq.disp += seq.vel * h;
    }
    if (Math.abs(seq.target - seq.disp) < 0.005 && Math.abs(seq.vel) < 0.02) { seq.disp = seq.target; seq.vel = 0; }
    pumpDecode(); drawSeq();
    const busy = seq.disp !== seq.target || seq.inflight > 0 || (seq.mode === 'codecs' && !seq.cache.has(clamp(Math.round(seq.disp) - 1, 0, SEQ.n - 1)) && seq.got < seq.total);
    if (busy) seq.raf = requestAnimationFrame(loop); else seq.last = 0;
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
     Прокрутка остаётся нативной, поэтому sticky-блоки работают как обычно. */
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
      M.imgs.forEach((im) => {
        if (im.dataset.t === t && im.dataset.srcset) { im.srcset = im.dataset.srcset; im.src = im.dataset.src; delete im.dataset.srcset; }
        im.classList.toggle('is-on', im.dataset.t === t);
      });
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

  /* ——— появление (без библиотек: IntersectionObserver + CSS-переходы) ——— */
  if (!RM && 'IntersectionObserver' in window) {
    const root = document.documentElement; root.classList.add('reveal-on');
    $$('.hero__in > *').forEach((el, i) => { el.style.setProperty('--d', (0.15 + i * 0.09).toFixed(2) + 's'); });
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-in')));
    const els = $$('.sec-head, .rq, .rates li, .faq details, .receipt__paper');
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach((el) => { el.classList.add('rv'); io.observe(el); });
  }
})();
