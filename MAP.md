# MAP — docs/
- index.html: демо-плашка → .topbar → .hero → .day#sutki (4 .step с крупным планом и кнопкой data-pick) → .map#karta (.seg время, .map__frame + canvas .map__hl, .pin ×4, .zone) → .plan#den (form.planner, .receipt) → .voices#otzyvy (.rates, .ribbon) → .faq → footer#kontakty
- styles.css: токены :root → плашка/шапка → кнопки → hero → «Сутки» (.day, .day__frame, .day__panel, .step) → орнамент → .sec-head → карта → сборщик и чек → отзывы → FAQ → подвал → @media 1100 / 899 / 560 / 420 → reduced-motion
- app.js: зоны NAMES/GROUP/ZONES → маска (maskReady, groupLayer, paint) → topbarTone → CH + renderDay (кроссфейд, часы, солнце, камера, подсветка) → onScroll → карта (idAt, showZone, seg) → сборщик (PROG, pick, updatePlan, setupDates, отправка в MAX) → появление GSAP
