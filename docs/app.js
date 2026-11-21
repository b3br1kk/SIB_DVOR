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
    stage: $('.day__stage'), frame: $('.day__frame'), imgs: $$('.day__img'), cv: $('.day__hl'),
    steps: $$('.step'), dots: $$('.day__dots i'), hh: $('.day__hh'), mm: $('.day__mm'),
    arc: $('.sun__arc'), dot: $('.sun__dot'),
  };
  const CH = [
    { t: 9 * 60 + 40, g: 'ski', f: [0.32, 0.72], fm: [0.25, 0.63], z: 1.15 },
    { t: 13 * 60, g: 'ethno', f: [0.81, 0.79], fm: [0.81, 0.77], z: 1.55 },
    { t: 18 * 60 + 30, g: 'banya', f: [0.33, 0.27], fm: [0.31, 0.27], z: 1.22 },
    { t: 21 * 60 + 30, g: 'cafe', f: [0.46, 0.58], fm: [0.46, 0.56], z: 1.28 },
  ];
  let lastActive = -1, dayP = -1;
  function renderDay(p) {
    if (!D) return;
    const n = CH.length; const pp = clamp(p, 0, 0.9999) * n; const c = Math.floor(pp); const u = pp - c;
    const s = c < n - 1 ? sstep(0.68, 1, u) : 0;
    D.imgs.forEach((im, i) => { im.style.opacity = i <= c ? 1 : i === c + 1 ? s : 0; });
    const active = c < n - 1 && u > 0.84 ? c + 1 : c;
    if (active !== lastActive) {
      lastActive = active; day.dataset.t = active;
      D.steps.forEach((el, i) => el.classList.toggle('is-on', i === active));
      D.dots.forEach((el, i) => el.classList.toggle('is-on', i <= active));
    }
    // часы
    const tA = CH[c].t, tB = c < n - 1 ? CH[c + 1].t : 23 * 60 + 10;
    const mins = Math.round(c < n - 1 ? lerp(tA, tB, sstep(0.55, 1, u)) : lerp(tA, tB, sstep(0.25, 1, u)));
    D.hh.textContent = String(Math.floor(mins / 60)).padStart(2, '0');
    D.mm.textContent = String(mins % 60).padStart(2, '0');
    // солнце/луна по дуге
    const L = D.arc.getTotalLength(); const pt = D.arc.getPointAtLength(L * clamp((mins - 8 * 60) / (15 * 60 + 30), 0, 1));
    D.dot.setAttribute('cx', pt.x); D.dot.setAttribute('cy', pt.y);
    // камера: фокус на зоне главы
    const vw = D.stage.clientWidth, vh = D.stage.clientHeight; const W = D.frame.offsetWidth, H = D.frame.offsetHeight;
    const wide = vw > 900; const fk = wide ? 'f' : 'fm';
    const fA = CH[c][fk], fB = c < n - 1 ? CH[c + 1][fk] : fA;
    const fx = lerp(fA[0], fB[0], s), fy = lerp(fA[1], fB[1], s); const zB = c < n - 1 ? CH[c + 1].z : CH[c].z;
    const z = wide ? lerp(CH[c].z, zB, s) : 1.5;
    const targetX = wide ? 0.64 * vw : 0.5 * vw, targetY = wide ? 0.48 * vh : 0.27 * vh;
    const mx = Math.max(0, (W * z - vw) / 2), my = Math.max(0, (H * z - vh) / 2);
    const tx = clamp(targetX - vw / 2 + (0.5 - fx) * W * z, -mx, mx);
    const ty = clamp(targetY - vh / 2 + (0.5 - fy) * H * z, -my, my);
    D.frame.style.transform = `translate(-50%,-50%) translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${z})`;
    // подсветка зоны
    const aIn = c === 0 ? sstep(0, 0.1, u) : sstep(0.02, 0.16, u);
    const aCur = c < n - 1 ? aIn * (1 - sstep(0.58, 0.7, u)) : aIn;
    paint(D.cv, [[CH[c].g, aCur]], c >= 2);
  }

  /* ——— прокрутка ——— */
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (day) {
        const r = day.getBoundingClientRect(); const len = r.height - innerHeight;
        const p = clamp(-r.top / Math.max(1, len), 0, 1);
        if (Math.abs(p - dayP) > 0.0004 || dayP < 0) { dayP = p; renderDay(p); }
      }
      topbarTone();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { dayP = -1; onScroll(); renderMapHL(); }, { passive: true });
  maskReady.then(() => { dayP = -1; onScroll(); renderMapHL(); });
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
      if (isPicked(g) && b.classList.contains('step__add')) { $('#den').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); return; }
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
