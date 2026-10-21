(function () {
  var root = document.documentElement;
  var body = document.body;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function ss(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function cssVar(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }

  /* ---------------- Motion toggle ---------------- */
  var mt = $('#mt');
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saved = load('motion');
  var nm = saved ? saved === 'off' : prefersReduced;
  var typed = $('.typed'), typing = false, wi = 0, ci = 0, del = false, words = [];
  function applyMotion() {
    body.classList.toggle('no-motion', nm);
    if (mt) { mt.textContent = nm ? '▶ MOTION OFF' : '▮▮ MOTION ON'; mt.setAttribute('aria-pressed', String(nm)); }
  }
  applyMotion();

  /* ---------------- Theme line ---------------- */
  var THEMES = ['aurora', 'sunset', 'emerald', 'light'];
  var BARS = { aurora: '#050714', sunset: '#030303', emerald: '#020f0a', light: '#faf6ee' };
  var dots = $$('.tdot');
  var current = root.getAttribute('data-theme');
  if (THEMES.indexOf(current) < 0) current = 'sunset';
  var colors = {};
  function readColors() {
    colors.a1 = cssVar('--a1-rgb') || '34,211,238';
    colors.a2 = cssVar('--a2-rgb') || '139,92,246';
    colors.ink = cssVar('--ink') || '255,255,255';
    colors.rim = cssVar('--rim') || colors.a1;
    colors.inv = cssVar('--pinv') === '1';
  }
  function paintDots(t) {
    dots.forEach(function (d) {
      var on = d.dataset.theme === t;
      d.classList.toggle('on', on);
      d.setAttribute('aria-checked', String(on));
    });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BARS[t]);
  }
  function setTheme(t, from) {
    if (THEMES.indexOf(t) < 0 || t === current) return;
    current = t;
    root.setAttribute('data-theme', t);
    save('theme', t);
    paintDots(t);
    readColors();
    if (from && !nm) {
      var r = from.getBoundingClientRect();
      var rip = document.createElement('div');
      rip.className = 'ripple';
      rip.style.left = r.left + r.width / 2 + 'px';
      rip.style.top = r.top + r.height / 2 + 'px';
      body.appendChild(rip);
      setTimeout(function () { rip.remove(); }, 1000);
    }
    dirty = true;
  }
  dots.forEach(function (d) { d.addEventListener('click', function () { setTheme(d.dataset.theme, d); }); });
  paintDots(current);
  readColors();
  var dirty = true;

  /* ---------------- Reveal + count-up ---------------- */
  function cnt(el) {
    var t = parseFloat(el.dataset.n), d = parseInt(el.dataset.d || '0', 10);
    var i = el.querySelector('i'), sf = i ? i.outerHTML : '';
    if (nm) { el.innerHTML = t.toFixed(d) + sf; return; }
    var s = null;
    (function f(ts) {
      if (s === null) s = ts;
      var p = Math.min((ts - s) / 1400, 1), v = t * (1 - Math.pow(1 - p, 3));
      el.innerHTML = v.toFixed(d) + sf;
      if (p < 1) requestAnimationFrame(f);
    })(performance.now());
  }
  var revealEls = $$('.reveal,.sg');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
        var n = $$('[data-n]', e.target);
        if (e.target.matches('[data-n]')) n.push(e.target);
        n.forEach(cnt);
      });
    }, { threshold: 0, rootMargin: '0px 0px 80px 0px' });
    revealEls.forEach(function (x) { io.observe(x); });
    // stats row is also observed so numbers count even if the wrapper has no .reveal
    $$('[data-n]').forEach(function (x) { if (!x.closest('.reveal')) io.observe(x); });
  } else {
    revealEls.forEach(function (x) { x.classList.add('in'); });
  }

  /* ---------------- Nav, progress, hero fade ---------------- */
  var nav = $('#nav'), pg = $('#pg'), hc = $('.hc'), pf = $('.pf'), prog = 0, lastScroll = 0, tilted = null, sct;
  var finePtr = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  /* back to top */
  var totop = document.createElement('button');
  totop.className = 'totop'; totop.type = 'button'; totop.setAttribute('aria-label', 'Back to top');
  totop.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5"/></svg>';
  totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: nm ? 'auto' : 'smooth' }); });
  body.appendChild(totop);

  /* nav link follows the section you are reading (home page) */
  var spyLinks = $$('.links a[href*="#"]').filter(function (a) { return a.getAttribute('href').split('#')[0] === 'index.html' && document.getElementById(a.getAttribute('href').split('#')[1]); });
  var spyBusy = false;
  function spy() {
    spyBusy = false;
    if (!spyLinks.length) return;
    var hit = null;
    spyLinks.forEach(function (a) {
      var r = document.getElementById(a.getAttribute('href').split('#')[1]).getBoundingClientRect();
      if (r.top <= window.innerHeight * 0.4 && r.bottom > window.innerHeight * 0.4) hit = a;
    });
    spyLinks.forEach(function (a) { a.classList.toggle('active', a === hit); });
  }
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    lastScroll = performance.now();
    if (tilted) { tilted.style.transform = ''; tilted = null; }   /* nothing stays tilted while the page moves */
    if (finePtr) { body.classList.add('is-scrolling'); clearTimeout(sct); sct = setTimeout(function () { body.classList.remove('is-scrolling'); if (tx || ty) setHot(document.elementFromPoint(tx, ty)); }, 140); }
    if (totop) totop.classList.toggle('show', y > 700);
    if (!spyBusy) { spyBusy = true; requestAnimationFrame(spy); }
    pg.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    var p = Math.min(1, y / (window.innerHeight * 0.75));
    if (p !== prog) { prog = p; dirty = true; }
    if (pf) pf.style.setProperty('--pp', p.toFixed(3));
    if (hc) hc.style.opacity = 1 - 0.85 * ss(0.25, 0.9, y / window.innerHeight);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = $('#burger'), menu = $('#links');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('.links a').forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- Cursor dot ---------------- */
  var cur = $('#cur'), cx = 0, cy = 0, tx = 0, ty = 0, mxp = 0, my0 = 0;
  /* The pointer only grows over small controls (buttons, links, tabs, inputs). Big cards and
     picture links keep the small dot, so it never turns into a huge circle. */
  var lastHot = null;
  function setHot(t) {
    if (!cur) return;
    var el = t && t.closest ? t.closest('a,button,input,textarea,summary,[role="radio"]') : null;
    if (el && el !== lastHot) {
      var r = el.getBoundingClientRect();
      if (r.width * r.height > 24000 || r.height > 110) el = null;
    }
    lastHot = el;
    cur.classList.toggle('hot', !!el);
  }
  function hideCur() { if (cur) { cur.style.opacity = 0; cur.classList.remove('hot'); } lastHot = null; }
  document.documentElement.addEventListener('mouseleave', hideCur);
  window.addEventListener('blur', hideCur);
  window.addEventListener('pointermove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (cur) { cur.style.opacity = 1; setHot(e.target); }
    if (pf) { pf.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3)); pf.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5).toFixed(3)); }
    mxp = e.clientX / window.innerWidth - 0.5;
    my0 = e.clientY / window.innerHeight - 0.5;
    dirty = true;
  }, { passive: true });
  (function lp() {
    if (nm) { cx = tx; cy = ty; } else { cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18; }
    if (cur) cur.style.transform = 'translate(' + (cx - 4) + 'px,' + (cy - 4) + 'px)';
    requestAnimationFrame(lp);
  })();

  /* ---------------- Halftone portrait (hero) ---------------- */
  var pt = $('#pt');
  if (pt && window.PORTRAIT) {
    var px = pt.getContext('2d'), S = 0, NN = window.PORTRAIT.n;
    var raw = atob(window.PORTRAIT.d), cells = raw.length, P = [];
    for (var ci2 = 0; ci2 < cells; ci2++) {
      var code = raw.charCodeAt(ci2);
      if (!code) continue;
      var gx0 = (ci2 % NN) / NN, gy0 = ((ci2 / NN) | 0) / NN;
      if ((gx0 < 0.08 || gx0 > 0.92) && gy0 < 0.62) continue;
      P.push({ x: (ci2 % NN) / NN, y: ((ci2 / NN) | 0) / NN, v: (code & 31) / 31, o: code >= 32, n: Math.random(), k: Math.random(), dx: Math.random() - 0.5 });
    }
    var psz = function () {
      var r = pt.getBoundingClientRect();
      S = r.width; pt.width = S * dpr; pt.height = S * dpr;
      px.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true;
    };
    psz();
    window.addEventListener('resize', psz);
    var drawPortrait = function () {
      if (dirty) {
        dirty = false;
        px.clearRect(0, 0, S, S);
        var p = prog, cl = S / NN, B = [], j;
        for (j = 0; j < 32; j++) B.push([]);
        for (var i = 0; i < P.length; i++) {
          var q = P[i];
          if (q.k < p * 1.08) continue;
          var vv = colors.inv && !q.o ? Math.max(0, 1.05 - q.v * 1.15) : q.v;
          var al = Math.max(0, vv * (1 - 0.5 * p) + (q.n - 0.5) * 0.14);
          var bk = (q.o ? 16 : 0) + Math.min(15, Math.floor(al * 16));
          B[bk].push(q.x * S + mxp * 10 + (q.dx < 0 ? -1 : 1) * p * S * (0.1 + 0.55 * q.k * q.k), q.y * S + my0 * 6 + (q.k - 0.5) * p * 14);
        }
        for (j = 0; j < 32; j++) {
          var a = B[j];
          if (!a.length) continue;
          var al2 = ((j % 16) + 0.6) / 16.4;
          px.strokeStyle = j < 16 ? 'rgba(' + colors.ink + ',' + al2 + ')' : 'rgba(' + colors.rim + ',' + Math.min(1, al2 * 1.15) + ')';
          px.lineWidth = Math.max(0.7, cl * (0.08 + 0.6 * al2 * al2 + 0.1 * al2));
          px.beginPath();
          for (var k = 0; k < a.length; k += 2) { px.moveTo(a[k], a[k + 1] + cl); px.lineTo(a[k] + cl * 0.9, a[k + 1]); }
          px.stroke();
        }
      }
      requestAnimationFrame(drawPortrait);
    };
    requestAnimationFrame(drawPortrait);
  }

  /* ---------------- Canvas visuals ---------------- */
  function mk(id, kind) {
    var cv = $('#' + id);
    if (!cv) return;
    var c = cv.getContext('2d'), W = 0, H = 0, vis = true;
    function rs() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    rs();
    window.addEventListener('resize', rs);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(cv);
    (function f(t) {
      if (vis) {
        var s = nm ? 0 : t / 1000;
        c.clearRect(0, 0, W, H);
        var m = Math.min(W, H), ox = W / 2, oy = H / 2, i, j;
        if (kind === 0) {
          var n = 34, gx = W / n, gy = H / 22;
          for (j = 0; j < 22; j++) for (i = 0; i < n; i++) {
            var x = i * gx + gx / 2, y = j * gy + gy / 2 + Math.sin(i * 0.35 + s * 1.3 + j * 0.2) * H * 0.07 * Math.sin(j / 22 * 3.14);
            var a = 0.25 + 0.6 * Math.abs(Math.sin(i * 0.2 + j * 0.15 + s * 0.8));
            c.fillStyle = 'rgba(' + (j % 3 ? colors.a1 : colors.ink) + ',' + a + ')';
            c.fillRect(x, y, 2, 2);
          }
        } else {
          var N = 96;
          for (var k = 0; k < N; k++) {
            var an = k / N * 6.2832 + s * 0.05, r0 = m * 0.1, r1 = m * (0.22 + 0.22 * Math.abs(Math.sin(k * 0.37 + s * 0.6)));
            c.strokeStyle = 'rgba(' + colors.ink + ',' + (0.1 + 0.2 * Math.abs(Math.sin(k * 0.5))) + ')';
            c.beginPath(); c.moveTo(ox + Math.cos(an) * r0, oy + Math.sin(an) * r0); c.lineTo(ox + Math.cos(an) * r1, oy + Math.sin(an) * r1); c.stroke();
            c.fillStyle = 'rgba(' + colors.a1 + ',.95)';
            c.fillRect(ox + Math.cos(an) * r1 - 1, oy + Math.sin(an) * r1 - 1, 2.2, 2.2);
          }
          c.strokeStyle = 'rgba(' + colors.ink + ',.3)';
          c.beginPath(); c.arc(ox, oy, m * 0.075, 0, 6.2832); c.stroke();
          c.fillStyle = cssVar('--bg');
          c.beginPath(); c.arc(ox, oy, m * 0.06, 0, 6.2832); c.fill();
        }
      }
      requestAnimationFrame(f);
    })(0);
  }

  /* ---------------- "How my AI agents work" figure: Think / Check / Team ---------------- */
  var abSet = function () {};
  function ab(id) {
    var cv = $('#' + id);
    if (!cv) return;
    var c = cv.getContext('2d'), W = 0, H = 0, K = 1, vis = true, mx = -999, my = -999, scene = 0, prev = -1, t0 = -99999;
    var mono = cssVar('--mono') || 'ui-monospace,Menlo,monospace', sans = cssVar('--sans') || 'system-ui,sans-serif';
    function rs() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      K = Math.max(0.6, Math.min(1.12, W / 585));
    }
    rs();
    window.addEventListener('resize', rs);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(cv);
    cv.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    cv.addEventListener('pointerleave', function () { mx = my = -999; });
    abSet = function (i) { if (i === scene) return; prev = scene; scene = i; t0 = performance.now(); };

    /* ---- tiny drawing helpers ---- */
    function rgba(col, a) { return 'rgba(' + col + ',' + Math.max(0, Math.min(1, a)) + ')'; }
    function cl(x) { return Math.max(0, Math.min(1, x)); }
    function ease(x) { x = cl(x); return 1 - Math.pow(1 - x, 3); }
    function fs(n) { return Math.max(8.5, n * K); }
    function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function txt(s, x, y, size, col, a, align, sansFont) {
      c.font = '500 ' + size + 'px ' + (sansFont ? sans : mono); c.textAlign = align || 'left'; c.fillStyle = rgba(col, a);
      try { c.letterSpacing = sansFont ? '0px' : '1.4px'; } catch (e) {}
      c.fillText(s, x, y);
    }
    function mw(s, size) { c.font = '500 ' + size + 'px ' + mono; try { c.letterSpacing = '1.4px'; } catch (e) {} return c.measureText(s).width; }
    function ln(x1, y1, x2, y2, col, a, w, dash) {
      c.strokeStyle = rgba(col, a); c.lineWidth = w || 1; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); if (dash) c.setLineDash([]);
    }
    function head(x, y, ang, sz, col, a) {
      c.fillStyle = rgba(col, a); c.beginPath(); c.moveTo(x, y);
      c.lineTo(x - sz * Math.cos(ang - 0.45), y - sz * Math.sin(ang - 0.45)); c.lineTo(x - sz * Math.cos(ang + 0.45), y - sz * Math.sin(ang + 0.45)); c.closePath(); c.fill();
    }
    /* a line between two pills, trimmed so it stops at their borders */
    function edge(A, B) {
      var dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / d, uy = dy / d;
      function cut(P) { var tx = Math.abs(ux) > 0.001 ? P.hw / Math.abs(ux) : 1e9, ty = Math.abs(uy) > 0.001 ? P.hh / Math.abs(uy) : 1e9; return Math.min(tx, ty) + 5; }
      var ca = cut(A), cb = cut(B);
      return [A.x + ux * ca, A.y + uy * ca, B.x - ux * cb, B.y - uy * cb];
    }
    function pill(p, state, hv, label, a) {
      rr(p.x - p.hw, p.y - p.hh, p.hw * 2, p.hh * 2, p.hh);
      c.fillStyle = state === 2 ? rgba(colors.a1, 0.2 * a) : state === 1 ? rgba(colors.a1, 0.08 * a) : rgba(colors.ink, 0.03 * a); c.fill();
      c.strokeStyle = state === 2 ? rgba(colors.a1, a) : hv ? rgba(colors.ink, 0.75 * a) : state === 1 ? rgba(colors.a1, 0.5 * a) : rgba(colors.ink, 0.2 * a);
      c.lineWidth = state === 2 ? 1.6 : 1; c.stroke();
      txt(label, p.x + 0.7, p.y + p.fz * 0.36, p.fz, state === 2 ? colors.a1 : colors.ink, state === 2 ? a : state === 1 ? 0.85 * a : 0.55 * a, 'center');
    }
    /* two-line "thinking" log at the bottom: previous step dim, current step typed out */
    function trace(say, i, st, a, over, curCol) {
      var px = W * 0.07, py = H * 0.79, pw = W * 0.86, ph = H * 0.14, f = fs(11.5), l1 = py + ph * 0.4, l2 = py + ph * 0.8;
      rr(px, py, pw, ph, 10); c.fillStyle = rgba(colors.ink, 0.03 * a); c.fill(); c.strokeStyle = rgba(colors.ink, 0.13 * a); c.lineWidth = 1; c.stroke();
      if (over) {
        txt('▸ ' + say[i], px + 14, l1, f, colors.ink, 0.4 * a, 'left', true);
        txt('?', px + 14, l2, fs(10), colors.a1, a); txt(over, px + 30, l2, f, colors.ink, 0.95 * a, 'left', true);
        return;
      }
      if (i > 0) txt('▸ ' + say[i - 1], px + 14, l1, f, colors.ink, 0.4 * a, 'left', true);
      var s = say[i], n = nm || st > 9 ? s.length : Math.floor(cl((st - 0.25) / 0.7) * s.length);
      txt('▸', px + 14, l2, f, colors.a1, a, 'left', true);
      txt(s.slice(0, n), px + 14 + f * 1.1, l2, f, curCol || colors.ink, 0.95 * a, 'left', true);
    }
    var TITLES = ['FIG. 01  AGENTIC RAG', 'FIG. 02  CHECK', 'FIG. 03  TEAM'], TAGS = ['LANGGRAPH · SIMPLIFIED', 'SIMPLIFIED VIEW', 'SIMPLIFIED VIEW'];
    function frame(a, idx) {
      c.strokeStyle = rgba(colors.ink, 0.22 * a); c.lineWidth = 1;
      [[14, 14, 1, 1], [W - 14, 14, -1, 1], [14, H - 14, 1, -1], [W - 14, H - 14, -1, -1]].forEach(function (q) {
        c.beginPath(); c.moveTo(q[0] + q[2] * 9, q[1]); c.lineTo(q[0], q[1]); c.lineTo(q[0], q[1] + q[3] * 9); c.stroke();
      });
      c.fillStyle = rgba(colors.a1, a); c.fillRect(24, 25, 6, 6);
      txt(TITLES[idx], 38, 31, fs(10), colors.ink, 0.6 * a);
      if (W > 420) txt(TAGS[idx], W - 26, 31, fs(8.5), colors.ink, 0.3 * a, 'right');
    }

    /* polyline helpers (for the elbow arrows of the real architecture) */
    function plen(pts) { var L = [0], i; for (i = 1; i < pts.length; i++) { var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1]; L.push(L[i - 1] + Math.sqrt(dx * dx + dy * dy)); } return L; }
    function pstroke(pts, f, col, a, w, dash) {
      var L = plen(pts), T = L[L.length - 1] * f, i, x = pts[0][0], y = pts[0][1];
      c.strokeStyle = rgba(col, a); c.lineWidth = w || 1; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(x, y);
      for (i = 1; i < pts.length; i++) {
        if (L[i] <= T) { c.lineTo(pts[i][0], pts[i][1]); x = pts[i][0]; y = pts[i][1]; }
        else { var u = (T - L[i - 1]) / (L[i] - L[i - 1]); x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u; y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u; c.lineTo(x, y); break; }
      }
      c.stroke(); if (dash) c.setLineDash([]);
      return [x, y];
    }
    function pang(pts) { var n = pts.length, a0 = pts[n - 2], b0 = pts[n - 1]; return Math.atan2(b0[1] - a0[1], b0[0] - a0[0]); }

    /* =========================================================
       FIG. 01  AGENTIC RAG  -  the real flow of my IT support copilot (LangGraph)
       ========================================================= */
    var NODES = [
      { k: 'USER', s: 'USER', fx: 0.09, fy: 0.2, d: 'user → asks an IT question' },
      { k: 'ROUTER', fx: 0.28, fy: 0.2, d: 'router → general chat, or search the knowledge base?' },
      { k: 'PINECONE', s: 'KB', fx: 0.48, fy: 0.2, d: 'pinecone → top matching passages from the knowledge base' },
      { k: 'GRADE KB', s: 'GRADE', fx: 0.68, fy: 0.2, d: 'grade → is this evidence good enough to answer?' },
      { k: 'ANSWER', fx: 0.9, fy: 0.43, d: 'answer → the final reply, built from the best evidence' },
      { k: 'TAVILY', fx: 0.48, fy: 0.43, d: 'tavily → live web search when the documents fall short' },
      { k: 'GRADE WEB', s: 'GRADE', fx: 0.68, fy: 0.43, d: 'grade → the same check, now on the web results' },
      { k: 'FALLBACK', fx: 0.68, fy: 0.64, d: 'fallback → best possible answer, states what is missing' }
    ];
    var Q1 = 'question → an employee asks for IT help', Q2 = 'router → general chat, or search the knowledge base?', Q3 = 'pinecone → find the top matching passages';
    var RUNS = [
      { seq: [0, 1, 2, 3, 4], say: [Q1, Q2, Q3, 'grade → the evidence is good enough', 'answer → written from the knowledge base'], v1: 1 },
      { seq: [0, 1, 2, 3, 5, 6, 4], say: [Q1, Q2, Q3, 'grade → the evidence is weak', 'tavily → search the web for fresh information', 'grade → the web evidence is good', 'answer → written from the web evidence'], v1: 0, v2: 1 },
      { seq: [0, 1, 2, 3, 5, 6, 7, 4], say: [Q1, Q2, Q3, 'grade → the evidence is weak', 'tavily → search the web for fresh information', 'grade → the web evidence is weak too', 'fallback → best possible answer, says what is missing', 'answer → delivered, with the limitation stated'], v1: 0, v2: 0 },
      { seq: [0, 1, 7, 4], say: ['question → someone just says hello', 'router → general chat, so skip the search', 'answer → the assistant replies directly', 'answer → delivered to the user'] }
    ];
    var SD = 1.0, HOLD = 1.5, PT = 0, base0;
    RUNS.forEach(function (R) { R.dur = R.seq.length * SD + HOLD; R.t0 = PT; PT += R.dur; });
    function think(a, tt, s) {
      var r = tt % PT, run = RUNS.length - 1, i, k;
      for (i = 0; i < RUNS.length; i++) if (r < RUNS[i].t0 + RUNS[i].dur) { run = i; break; }
      var R = RUNS[run], lt = r - R.t0, n = R.seq.length, si = Math.min(n - 1, Math.floor(lt / SD)), st = lt - si * SD, arr = si === 0 || st >= SD * 0.5;
      var fz = fs(10), P = [], hov = -1, hh = Math.max(10, 12 * K);
      for (i = 0; i < NODES.length; i++) {
        var lab = (K < 0.8 && NODES[i].s) ? NODES[i].s : NODES[i].k;
        P.push({ x: W * NODES[i].fx, y: H * NODES[i].fy, hw: mw(lab, fz) / 2 + 9 * K, hh: hh, fz: fz, lab: lab });
        if (Math.abs(mx - P[i].x) < P[i].hw && Math.abs(my - P[i].y) < P[i].hh) hov = i;
      }
      function seg(A, B) { var e = edge(A, B); return [[e[0], e[1]], [e[2], e[3]]]; }
      var G = 5 * K, EP = {
        '0>1': seg(P[0], P[1]), '1>2': seg(P[1], P[2]), '2>3': seg(P[2], P[3]),
        '3>4': [[P[3].x + P[3].hw + G, P[3].y], [P[4].x, P[3].y], [P[4].x, P[4].y - P[4].hh - G]],
        '3>5': [[P[3].x, P[3].y + P[3].hh + G], [P[3].x, (P[3].y + P[5].y) / 2], [P[5].x, (P[3].y + P[5].y) / 2], [P[5].x, P[5].y - P[5].hh - G]],
        '5>6': seg(P[5], P[6]), '6>4': seg(P[6], P[4]), '6>7': seg(P[6], P[7]),
        '7>4': [[P[7].x + P[7].hw + G, P[7].y], [P[4].x, P[7].y], [P[4].x, P[4].y + P[4].hh + G]],
        '1>7': [[P[1].x, P[1].y + P[1].hh + G], [P[1].x, P[7].y], [P[7].x - P[7].hw - G, P[7].y]]
      };
      /* every arrow, faint */
      for (var key in EP) { var pt = EP[key]; pstroke(pt, 1, colors.ink, 0.11 * a, 1, key === '1>7' ? [4, 4] : null); var an = pang(pt), q = pt[pt.length - 1]; head(q[0], q[1], an, 5 * K, colors.ink, 0.2 * a); }
      if (W > 420) {
        var lbl = function (x, y, t, al, col) { txt(t, x, y, fs(8.5), col || colors.ink, 0.42 * a, al || 'center'); };
        lbl((EP['3>4'][0][0] + EP['3>4'][1][0]) / 2, P[3].y - 8 * K, 'good', 'center', colors.a1);
        lbl((EP['6>4'][0][0] + EP['6>4'][1][0]) / 2, P[6].y - 8 * K, 'good', 'center', colors.a1);
        lbl(P[3].x + 8 * K, (P[3].y + P[5].y) / 2 - 4 * K, 'weak', 'left');
        lbl(P[6].x + 8 * K, (P[6].y + P[7].y) / 2 + 3 * K, 'weak', 'left');
        lbl((EP['1>7'][1][0] + EP['1>7'][2][0]) / 2 - 20 * K, P[7].y - 8 * K, 'direct', 'center');
      }
      /* the route taken so far (bright) with a travelling packet */
      var hx = 0, hy = 0, moving = false;
      for (k = 1; k <= si; k++) {
        var ek = EP[R.seq[k - 1] + '>' + R.seq[k]], pr = k < si ? 1 : ease(st / (SD * 0.5)), e1 = pstroke(ek, pr, colors.a1, 0.9 * a, 1.8);
        if (pr >= 1) { var q2 = ek[ek.length - 1]; head(q2[0], q2[1], pang(ek), 6 * K, colors.a1, 0.95 * a); }
        else { hx = e1[0]; hy = e1[1]; moving = true; }
      }
      if (moving) {
        c.fillStyle = rgba(colors.a1, 0.22 * a); c.beginPath(); c.arc(hx, hy, 8 * K, 0, 6.2832); c.fill();
        c.fillStyle = rgba(colors.a1, a); c.beginPath(); c.arc(hx, hy, 3.4 * K, 0, 6.2832); c.fill();
      }
      var actN = arr ? R.seq[si] : -1;
      for (i = 0; i < NODES.length; i++) {
        var idx = R.seq.indexOf(i), state = i === actN ? 2 : (idx > -1 && idx < si ? 1 : 0);
        if (state === 2) {
          var gp = (s * 1.1) % 1, ex = gp * 9 * K;
          rr(P[i].x - P[i].hw - ex, P[i].y - P[i].hh - ex, (P[i].hw + ex) * 2, (P[i].hh + ex) * 2, P[i].hh + ex);
          c.strokeStyle = rgba(colors.a1, (1 - gp) * 0.45 * a); c.lineWidth = 1; c.stroke();
        }
        pill(P[i], state, i === hov, P[i].lab, a);
      }
      /* the two verdicts */
      [[3, 'v1'], [6, 'v2']].forEach(function (g) {
        var gi = R.seq.indexOf(g[0]);
        if (gi < 0 || gi > si || R[g[1]] === undefined) return;
        var ga = gi === si ? cl((st - 0.25) / 0.3) : 0.8, good = R[g[1]] === 1;
        txt(good ? 'GOOD ✓' : 'WEAK ✗', P[g[0]].x, P[g[0]].y - P[g[0]].hh - 7 * K, fs(9), good ? colors.a1 : colors.ink, ga * a, 'center');
      });
      trace(R.say, si, st, a, hov >= 0 ? NODES[hov].d : null);
    }

    /* =========================================================
       FIG. 02  CHECK  -  the grader decides if the evidence is good enough
       ========================================================= */
    var CP = 11.6, CST = [0, 2.6, 3.4, 5.2, 6.6];
    var CSAY = ['grade → reading the passages from the knowledge base', 'grade → weak: not good enough to answer', 'tavily → searching the web instead', 'grade → checking the web results', 'grade → good: answer from the web evidence'];
    var CDESC = { g: 'grade → an AI asks: is this evidence good enough?', kb: 'knowledge base → passages found in Pinecone', web: 'web → live results found with Tavily' };
    function shield(x, y, u, col, al, fillA, mark) {
      c.beginPath(); c.moveTo(x, y - 1.15 * u); c.lineTo(x + 0.9 * u, y - 0.75 * u); c.lineTo(x + 0.9 * u, y + 0.15 * u); c.quadraticCurveTo(x + 0.9 * u, y + 0.85 * u, x, y + 1.2 * u); c.quadraticCurveTo(x - 0.9 * u, y + 0.85 * u, x - 0.9 * u, y + 0.15 * u); c.lineTo(x - 0.9 * u, y - 0.75 * u); c.closePath();
      c.fillStyle = rgba(col, fillA); c.fill(); c.strokeStyle = rgba(col, al); c.lineWidth = 1.5; c.stroke();
      c.lineCap = 'round'; c.beginPath();
      if (mark === 1) { c.moveTo(x - 0.4 * u, y + 0.05 * u); c.lineTo(x - 0.08 * u, y + 0.4 * u); c.lineTo(x + 0.45 * u, y - 0.3 * u); }
      else if (mark === 2) { c.moveTo(x - 0.34 * u, y - 0.25 * u); c.lineTo(x + 0.34 * u, y + 0.43 * u); c.moveTo(x + 0.34 * u, y - 0.25 * u); c.lineTo(x - 0.34 * u, y + 0.43 * u); }
      if (mark) c.stroke(); c.lineCap = 'butt';
    }
    function lane(a, t, y, ta, ts, tv, good, label, labHov, shHov) {
      var x0 = W * 0.07, cw = W * 0.118, gap = W * 0.02, chh = 36 * K, i, sx = x0 + 4 * (cw + gap) - gap, shx = W * 0.72, shy = y + chh / 2;
      txt(label, x0, y - 10 * K, fs(9), colors.ink, labHov ? 0.95 * a : 0.6 * a);
      var sc = t < ts ? -1 : ease((t - ts) / 1.3), verd = t >= tv;
      for (i = 0; i < 4; i++) {
        var cx = x0 + i * (cw + gap), g = ease((t - ta - i * 0.12) / 0.4);
        rr(cx, y, cw, chh, 7 * K); c.strokeStyle = rgba(colors.ink, 0.07 * a); c.lineWidth = 1; c.stroke();
        if (g > 0.01) {
          var scanned = sc >= 0 && ((cx + cw * 0.5 - x0) / (sx - x0)) <= sc;
          var col = verd ? (good ? colors.a1 : colors.ink) : (scanned ? colors.a1 : colors.ink);
          rr(cx, y, cw, chh, 7 * K); c.fillStyle = rgba(col, (verd ? (good ? 0.14 : 0.04) : scanned ? 0.12 : 0.05) * g * a); c.fill();
          c.strokeStyle = rgba(col, (verd ? (good ? 0.9 : 0.28) : scanned ? 0.8 : 0.3) * g * a); c.lineWidth = 1; c.stroke();
          c.lineCap = 'round';
          ln(cx + 9 * K, y + 13 * K, cx + cw - 9 * K, y + 13 * K, colors.ink, 0.3 * g * a, 2.4 * K);
          ln(cx + 9 * K, y + 24 * K, cx + 9 * K + (cw - 18 * K) * 0.6, y + 24 * K, colors.ink, 0.3 * g * a, 2.4 * K);
          c.lineCap = 'butt';
        }
      }
      if (sc >= 0 && sc < 1) { var lx = x0 + (sx - x0) * sc; ln(lx, y - 7 * K, lx, y + chh + 7 * K, colors.a1, 0.18 * a, 7 * K); ln(lx, y - 7 * K, lx, y + chh + 7 * K, colors.a1, 0.95 * a, 1.6); }
      ln(sx + 10 * K, shy, shx - 17 * K, shy, colors.ink, 0.2 * a, 1); head(shx - 15 * K, shy, 0, 5 * K, colors.ink, 0.3 * a);
      var pulse = (t >= ts && !verd) ? 0.5 + 0.5 * Math.sin(t * 9) : 0, vc = verd ? (good ? colors.a1 : colors.ink) : colors.ink;
      shield(shx, shy, 12 * K, vc, (verd ? 1 : 0.5 + 0.4 * pulse) * a * (shHov ? 1 : 0.92), (verd ? (good ? 0.2 : 0.06) : 0.03) * a, verd ? (good ? 1 : 2) : 0);
      if (verd) {
        var va = ease((t - tv) / 0.3), tx = good ? 'GOOD ✓' : 'WEAK ✗', vw = Math.max(W * 0.125, mw(tx, fs(9.5)) + 14 * K), vx = W * 0.93 - vw;
        rr(vx, shy - 11 * K, vw, 22 * K, 11 * K); c.fillStyle = rgba(vc, (good ? 0.16 : 0.06) * va * a); c.fill(); c.strokeStyle = rgba(vc, (good ? 0.9 : 0.4) * va * a); c.lineWidth = 1; c.stroke();
        txt(tx, vx + vw / 2 + 0.7, shy + fs(9.5) * 0.35, fs(9.5), vc, va * a, 'center');
      }
    }
    function check(a, tt) {
      var t = tt % CP, y1 = H * 0.23, y2 = H * 0.5, chh = 36 * K, shx = W * 0.72, i, hov = null, x0 = W * 0.07;
      var s1 = y1 + chh / 2, s2 = y2 + chh / 2, hit = function (px, py, r) { return (mx - px) * (mx - px) + (my - py) * (my - py) < r * r; };
      var shh1 = hit(shx, s1, 18 * K), shh2 = hit(shx, s2, 18 * K);
      var lh1 = mx > x0 && mx < x0 + mw('KNOWLEDGE BASE', fs(9)) && my > y1 - 24 * K && my < y1 - 2 * K, lh2 = mx > x0 && mx < x0 + mw('WEB SEARCH', fs(9)) && my > y2 - 24 * K && my < y2 - 2 * K;
      if (shh1 || shh2) hov = CDESC.g; else if (lh1) hov = CDESC.kb; else if (lh2) hov = CDESC.web;
      lane(a, t, y1, 0.0, 1.2, 2.6, false, 'KNOWLEDGE BASE', lh1, shh1);
      lane(a, t, y2, 3.9, 5.2, 6.6, true, 'WEB SEARCH', lh2, shh2);
      /* weak result sends the agent to the web */
      var ra = cl((t - 2.9) / 0.3) * (1 - cl((t - 4.1) / 0.3));
      if (ra > 0.01) {
        var ya = s1 + 20 * K, yb = s2 - 20 * K;
        c.strokeStyle = rgba(colors.ink, 0.85 * ra * a); c.lineWidth = 1.6; c.setLineDash([4, 4]); c.lineDashOffset = -t * 24;
        c.beginPath(); c.moveTo(shx, ya); c.lineTo(shx, yb); c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
        head(shx, yb + 2, Math.PI / 2, 6 * K, colors.ink, 0.9 * ra * a);
        if (W > 420) txt('SEARCH THE WEB', shx + 12 * K, (ya + yb) / 2 + 3 * K, fs(8.5), colors.ink, ra * a);
      }
      /* the answer */
      if (t > 7.2) {
        var aa = ease((t - 7.2) / 0.4), aw = W * 0.86, ay = H * 0.655, ah = 26 * K, atx = 'ANSWER · BUILT FROM THE WEB EVIDENCE ✓';
        rr(W * 0.07, ay, aw, ah, ah / 2); c.fillStyle = rgba(colors.a1, 0.14 * aa * a); c.fill(); c.strokeStyle = rgba(colors.a1, 0.85 * aa * a); c.lineWidth = 1; c.stroke();
        txt(atx, W / 2 + 0.7, ay + ah / 2 + fs(9.5) * 0.35, fs(9.5), colors.a1, aa * a, 'center');
      }
      var stg = 0; for (i = 0; i < CST.length; i++) if (t >= CST[i]) stg = i;
      trace(CSAY, stg, t - CST[stg], a, hov, stg === 4 ? colors.a1 : colors.ink);
    }

    /* =========================================================
       FIG. 03  TEAM  -  four agents write a report and a critic reviews it
       ========================================================= */
    var AG = [{ k: 'SEARCH', d: 'search → look for sources on the topic' }, { k: 'FACTS', d: 'facts → pick out what matters' }, { k: 'WRITE', d: 'write → turn the facts into a report' }, { k: 'CRITIC', d: 'critic → scores the draft against quality criteria' }];
    var TSEQ = [0, 1, 2, 3, 2, 3], TD = 1.3, TP = 7 * TD + 3.4;
    var TSAY = ['search → look for sources on the topic', 'facts → pick out what matters', 'write → draft the report', 'critic → scores it: needs work', 'write → revise the draft', 'critic → good enough ✓', 'report → delivered to the reader'];
    var TREP = [0.12, 0.38, 0.68, 0.68, 0.86, 1, 1];
    function ico(kind, x, y, u, col, a) {
      c.strokeStyle = rgba(col, a); c.fillStyle = rgba(col, a); c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      if (kind === 0) { c.arc(x - 0.15 * u, y - 0.15 * u, 0.55 * u, 0, 6.2832); c.moveTo(x + 0.25 * u, y + 0.25 * u); c.lineTo(x + 0.75 * u, y + 0.75 * u); c.stroke(); }
      else if (kind === 1) { for (var q = 0; q < 3; q++) { c.moveTo(x - 0.1 * u, y + (q - 1) * 0.62 * u); c.lineTo(x + 0.8 * u, y + (q - 1) * 0.62 * u); } c.stroke(); for (q = 0; q < 3; q++) { c.beginPath(); c.arc(x - 0.6 * u, y + (q - 1) * 0.62 * u, 0.1 * u, 0, 6.2832); c.fill(); } }
      else if (kind === 2) { c.moveTo(x - 0.65 * u, y + 0.65 * u); c.lineTo(x + 0.55 * u, y - 0.55 * u); c.stroke(); c.beginPath(); c.moveTo(x - 0.8 * u, y + 0.8 * u); c.lineTo(x - 0.35 * u, y + 0.8 * u); c.stroke(); }
      else { c.moveTo(x - 0.7 * u, y + 0.05 * u); c.lineTo(x - 0.2 * u, y + 0.55 * u); c.lineTo(x + 0.75 * u, y - 0.55 * u); c.stroke(); }
      c.lineCap = 'butt'; c.lineJoin = 'miter';
    }
    function team(a, tt, s) {
      var t = tt % TP, si = Math.min(6, Math.floor(t / TD)), st = t - si * TD, arr = st >= TD * 0.5 || si === 0 && st >= 0.3;
      var R0 = 27 * K, cy = H * 0.37, X = [0.14, 0.38, 0.62, 0.86], i, hov = -1, rrad = R0;
      var N = []; for (i = 0; i < 4; i++) { N.push({ x: W * X[i], y: cy }); if (Math.sqrt((mx - N[i].x) * (mx - N[i].x) + (my - cy) * (my - cy)) < rrad) hov = i; }
      var actA = si <= 5 ? TSEQ[si] : 3;
      /* links */
      for (i = 0; i < 3; i++) { ln(N[i].x + rrad + 6, cy, N[i + 1].x - rrad - 9, cy, colors.ink, 0.14 * a, 1); head(N[i + 1].x - rrad - 5, cy, 0, 5 * K, colors.ink, 0.22 * a); }
      /* feedback arc while the writer revises */
      if (si >= 3 && si <= 5) {
        var fa = si === 3 ? cl((st - 0.4) / 0.5) : si === 4 ? 1 : 1 - cl(st / 0.8);
        var ax = N[3].x, bx = N[2].x, top = cy - rrad - 34 * K;
        c.strokeStyle = rgba(colors.ink, 0.9 * fa * a); c.lineWidth = 1.5; c.setLineDash([4, 4]); c.lineDashOffset = -t * 20;
        c.beginPath(); c.moveTo(ax - 6 * K, cy - rrad - 4); c.bezierCurveTo(ax - 10 * K, top, bx + 10 * K, top, bx + 6 * K, cy - rrad - 8); c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
        head(bx + 6 * K, cy - rrad - 6, Math.PI / 2 + 0.2, 6 * K, colors.ink, 0.9 * fa * a);
        txt('REVISE', (ax + bx) / 2, top + 4 * K - (K < 0.8 ? 7 : 0), fs(8.5), colors.ink, fa * a, 'center');
      }
      /* packet moving between agents */
      if (si <= 5) {
        var pr = ease(st / (TD * 0.5)), fx, fy, tx2 = N[TSEQ[si]].x, ty2 = cy;
        if (si === 0) { fx = N[0].x; fy = cy - 46 * K; } else { fx = N[TSEQ[si - 1]].x; fy = cy; }
        if (pr < 1) { var px2 = fx + (tx2 - fx) * pr, py2 = fy + (ty2 - fy) * pr; c.fillStyle = rgba(colors.a1, 0.22 * a); c.beginPath(); c.arc(px2, py2, 9 * K, 0, 6.2832); c.fill(); rr(px2 - 5 * K, py2 - 6.5 * K, 10 * K, 13 * K, 2.5 * K); c.fillStyle = rgba(colors.a1, a); c.fill(); }
      }
      if (si === 0 && st < 0.9) txt('TOPIC', N[0].x, cy - 52 * K, fs(8.5), colors.ink, 0.5 * a * (1 - cl((st - 0.5) / 0.4)), 'center');
      /* the four agents */
      for (i = 0; i < 4; i++) {
        var seen = false, k2; for (k2 = 0; k2 < Math.min(si, 6); k2++) if (TSEQ[k2] === i) seen = true;
        var on = arr && i === actA && si <= 5, st2 = on ? 2 : seen ? 1 : 0;
        if (on) { var gp = (s * 1.1) % 1; c.strokeStyle = rgba(colors.a1, (1 - gp) * 0.45 * a); c.lineWidth = 1; c.beginPath(); c.arc(N[i].x, cy, rrad + gp * 10 * K, 0, 6.2832); c.stroke(); }
        c.beginPath(); c.arc(N[i].x, cy, rrad, 0, 6.2832);
        c.fillStyle = st2 === 2 ? rgba(colors.a1, 0.2 * a) : st2 === 1 ? rgba(colors.a1, 0.08 * a) : rgba(colors.ink, 0.03 * a); c.fill();
        c.strokeStyle = st2 === 2 ? rgba(colors.a1, a) : i === hov ? rgba(colors.ink, 0.75 * a) : st2 === 1 ? rgba(colors.a1, 0.5 * a) : rgba(colors.ink, 0.2 * a); c.lineWidth = st2 === 2 ? 1.6 : 1; c.stroke();
        ico(i, N[i].x, cy, 10 * K, st2 === 2 ? colors.a1 : colors.ink, st2 === 2 ? a : st2 === 1 ? 0.85 * a : 0.55 * a);
        txt(AG[i].k, N[i].x + 0.7, cy + rrad + 17 * K, fs(10), colors.ink, st2 ? 0.9 * a : 0.5 * a, 'center');
      }
      /* critic score */
      var lit = si < 3 ? 0 : si < 5 ? 2 : 5, sx = N[3].x - 2.5 * 9 * K + 1;
      for (i = 0; i < 5; i++) {
        var on2 = i < lit && (si !== 3 || st > 0.9 || i < 0), bx2 = sx + i * 9 * K, by2 = cy + rrad + 28 * K;
        rr(bx2, by2, 6.5 * K, 5 * K, 1.5); c.fillStyle = on2 ? (lit >= 5 ? rgba(colors.a1, 0.95 * a) : rgba(colors.ink, 0.95 * a)) : rgba(colors.ink, 0.12 * a); c.fill();
      }
      /* the report fills up as it moves through the team */
      var by0 = H * 0.66, bw = W * 0.72, bx0 = W * 0.14, bh = 9 * K;
      var prog = si === 0 ? TREP[0] * cl(st / TD) : TREP[si - 1] + (TREP[si] - TREP[si - 1]) * cl(st / (TD * 0.9));
      if (si === 0) prog = TREP[0] * cl((st - 0.4) / 0.8);
      txt('REPORT', bx0, by0 - 9 * K, fs(8.5), colors.ink, 0.55 * a);
      rr(bx0, by0, bw, bh, bh / 2); c.fillStyle = rgba(colors.ink, 0.09 * a); c.fill();
      if (prog > 0.01) { rr(bx0, by0, bw * prog, bh, bh / 2); c.fillStyle = rgba(si >= 5 ? colors.a1 : colors.a1, 0.9 * a); c.fill(); }
      if (si >= 6) { var fa2 = cl(st / 0.4); txt('FINAL REPORT ✓', bx0 + bw, by0 - 9 * K, fs(8.5), colors.a1, fa2 * a, 'right'); }
      else if (si === 3 || si === 4) txt('NEEDS WORK', bx0 + bw, by0 - 9 * K, fs(8.5), colors.ink, a * (si === 3 ? cl((st - 0.5) / 0.4) : 1), 'right');
      trace(TSAY, si, st, a, hov >= 0 ? AG[hov].d : null, si === 3 ? colors.ink : si >= 5 ? colors.a1 : colors.ink);
    }

    var STILL = [RUNS[1].t0 + 6 * SD + 0.8, 9.0, 7 * TD + 1.0];
    function draw(idx, a, s, age, still) {
      var tt = still ? STILL[idx] : age;
      frame(a, idx);
      if (idx === 0) think(a, tt, s); else if (idx === 1) check(a, tt); else team(a, tt, s);
    }
    (function f(now) {
      if (vis) {
        var s = nm ? 2.5 : now / 1000, kf = nm ? 1 : Math.min(1, (now - t0) / 450), age = Math.max(0, (now - t0) / 1000);
        c.clearRect(0, 0, W, H);
        if (prev >= 0 && kf < 1) draw(prev, 1 - kf, s, 0, true);
        draw(scene, kf, s, age, nm);
      }
      requestAnimationFrame(f);
    })(0);
  }
  ab('cv1'); mk('cv2', 1);

  /* ---------------- Segmented controls, accordion, filter ---------------- */
  var T = {
    1: [['My agents decide before they answer.', 'A router first decides whether a question needs the knowledge base. Then the agent searches instead of guessing, all orchestrated with LangGraph.'],
        ['They check their own evidence.', 'An AI grader asks whether the evidence is good enough. If not, the agent searches the web, and if that is weak too, it says clearly what it could not find.'],
        ['They work as a team.', 'One agent searches, one gathers facts, one writes and a critic scores the draft, so weak reports are caught early.']]
  };

  $$('.seg[data-s]').forEach(function (sg) {
    var k = sg.dataset.s;
    $$('button', sg).forEach(function (b, i) {
      b.addEventListener('click', function () {
        $$('button', sg).forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#h3' + k).textContent = T[k][i][0];
        $('#p3' + k).textContent = T[k][i][1];
        if (k === '1') { $('#c1').textContent = '0' + (i + 1) + ' / 03'; abSet(i); }
      });
    });
  });
  $$('.xh').forEach(function (b) {
    b.addEventListener('click', function () {
      var it = b.parentNode, o = it.classList.contains('o');
      $$('.xi').forEach(function (x) { x.classList.remove('o'); });
      if (!o) it.classList.add('o');
    });
  });
  $$('#tb button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#tb button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $$('.fc').forEach(function (c) { c.classList.toggle('x', b.dataset.f !== 'all' && c.dataset.k !== b.dataset.f); });
    });
  });

  /* ---------------- Typed roles ---------------- */
  if (typed) { try { words = JSON.parse(typed.dataset.words); } catch (e) { words = []; } }
  function typeStep() {
    if (!typed || !words.length) return;
    if (nm) { typed.textContent = words[0]; typing = false; return; }
    typing = true;
    var w = words[wi];
    ci += del ? -1 : 1;
    typed.textContent = w.slice(0, ci);
    var d = del ? 32 : 68;
    if (!del && ci === w.length) { d = 1600; del = true; }
    else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; d = 320; }
    setTimeout(typeStep, d);
  }
  function reserveTyped() {
    var p = typed && typed.closest('.ld'); if (!p || !words.length) return;
    var keep = typed.textContent, max = 0;
    p.style.minHeight = '0';
    words.forEach(function (w) { typed.textContent = w; max = Math.max(max, p.offsetHeight); });
    typed.textContent = keep; p.style.minHeight = max + 'px';
  }
  var rto; window.addEventListener('resize', function () { clearTimeout(rto); rto = setTimeout(reserveTyped, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserveTyped);
  reserveTyped();
  if (typed && words.length) { typed.textContent = ''; typeStep(); }

  if (mt) {
    mt.addEventListener('click', function () {
      nm = !nm;
      save('motion', nm ? 'off' : 'on');
      applyMotion();
      if (nm) { revealEls.forEach(function (x) { x.classList.add('in'); }); if (typed && words.length) typed.textContent = words[0]; }
      else if (typed && words.length && !typing) { ci = 0; del = false; typeStep(); }
    });
  }

  /* ---------------- Gentle card tilt (mouse only, never while scrolling) ---------------- */
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    $$('.card').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (nm || performance.now() - lastScroll < 250) return;
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 3) + 'deg) rotateY(' + (x * 4) + 'deg)';
        el.style.setProperty('--sx', (x + 0.5) * 100 + '%');
        el.style.setProperty('--sy', (y + 0.5) * 100 + '%');
        tilted = el;
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; if (tilted === el) tilted = null; });
    });
  }

  /* ---------------- Contact: focus + send message ---------------- */
  $$('[data-focus]').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = document.getElementById(a.dataset.focus);
      if (t) setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }, 350);
    });
  });
  var mf = document.getElementById('msgform');
  if (mf) {
    var mst = document.getElementById('mst'), msend = document.getElementById('msend');
    var TO = '15y.pankaj@gmail.com';
    function say(t, k, html) { mst.dataset.k = k || ''; if (html) mst.innerHTML = t; else mst.textContent = t; }
    function gmail(n, e, m) {
      return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(TO) + '&su=' + encodeURIComponent('Portfolio message from ' + n) + '&body=' + encodeURIComponent(m + '\n\n' + n + '\n' + e);
    }
    function sendIt() {
      var n = mf.elements.name.value.trim(), e = mf.elements.email.value.trim(), m = mf.elements.message.value.trim();
      if (mf.elements._honey.value) return;
      if (!n) { say('Please add your name.', 'err'); mf.elements.name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { say('Please add a valid email so I can reply.', 'err'); mf.elements.email.focus(); return; }
      if (m.length < 5) { say('Please write a short message.', 'err'); mf.elements.message.focus(); return; }
      msend.disabled = true; say('Sending…', '');
      var done = false, ctl = ('AbortController' in window) ? new AbortController() : null;
      var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
      fetch('https://formsubmit.co/ajax/' + TO, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ name: n, email: e, message: m, _replyto: e, _subject: 'Portfolio message from ' + n, _template: 'table', _captcha: 'false' })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) {
          clearTimeout(tm);
          if (x.ok && (x.d.success === true || x.d.success === 'true')) { done = true; say('Thank you, ' + n.split(' ')[0] + '. Your message was sent. I will reply soon.', 'ok'); mf.reset(); }
          else throw new Error('rejected');
        })
        .catch(function () {
          clearTimeout(tm);
          if (!done) say('The message could not be sent from here. <a href="' + gmail(n, e, m) + '" target="_blank" rel="noopener">Open it in Gmail ↗</a> or write to <a href="mailto:' + TO + '">' + TO + '</a>.', 'err', true);
        })
        .then(function () { msend.disabled = false; });
    }
    mf.addEventListener('submit', function (ev) { ev.preventDefault(); sendIt(); });
    mf.elements.message.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); sendIt(); }
    });
  }

  /* ---------------- Copy email ---------------- */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.copy, done = function () { var o = b.textContent; b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = o; }, 1800); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, function () { fallback(); }); }
        else fallback();
      } catch (e) { fallback(); }
      function fallback() {
        var a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0';
        document.body.appendChild(a); a.select();
        try { document.execCommand('copy'); done(); } catch (e) { b.textContent = t; }
        a.remove();
      }
    });
  });
})();