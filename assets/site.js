
/* =============================================================
   SITE SCRIPT
   Degrades cleanly: with no GSAP, no Lenis or reduced motion the
   page is fully readable and every control still works.
   Scroll work goes through ScrollTrigger and IntersectionObserver.
   There is no scroll event listener anywhere in this file.
   Boots on DOMContentLoaded so the deferred libraries are present.
   ============================================================= */
const boot = () => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root   = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine   = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduce;
  let sheetOpen = false;
  if (G && ST) { G.registerPlugin(ST); ST.config({ ignoreMobileResize: true, limitCallbacks: true }); }
  if (motion) scrollTo(0, 0);

  /* ---------- theme ---------- */
  const themeBtn = $('#themeBtn');
  themeBtn && themeBtn.addEventListener('click', () => {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const cur  = root.getAttribute('data-theme') || (dark ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    themeBtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    ST && ST.refresh();
  });

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: .105, wheelMultiplier: .95, smoothWheel: true });
    if (ST) {
      lenis.on('scroll', ST.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const goTo = target => {
    if (lenis) lenis.scrollTo(target, { offset: -84, duration: 1.15 });
    else if (typeof target === 'string') $(target) && $(target).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    closeSheet();
    goTo(id === '#top' ? 0 : id);
  }));
  const toTop = $('#toTop');
  toTop && toTop.addEventListener('click', () => goTo(0));

  /* ---------- nav state, driven by ScrollTrigger ---------- */
  const nav = $('#nav'), bar = $('#progress');
  if (motion) {
    ST.create({
      start: 0, end: 'max',
      onUpdate: self => {
        const y = self.scroll();
        nav.classList.toggle('on', y > 40);
        nav.classList.toggle('hide', self.direction === 1 && y > 460 && !sheetOpen);
      }
    });
    G.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: () => document.body.scrollHeight - innerHeight, scrub: .25 }
    });
    $$('main section[id]').forEach(sec => {
      const link = $(`.nav-links a[href="#${sec.id}"]`);
      if (!link) return;
      ST.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: self => link.classList.toggle('cur', self.isActive)
      });
    });
  } else {
    new IntersectionObserver(es => nav.classList.toggle('on', !es[0].isIntersecting),
      { rootMargin: '-40px 0px 0px 0px' }).observe($('#top'));
  }

  /* ---------- mobile sheet ---------- */
  const sheet = $('#sheet'), burger = $('#burger');
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.inert = true;
    document.body.style.overflow = '';
    burger.setAttribute('aria-label', 'Open menu');
    burger.focus();
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<i class="ph ph-list" aria-hidden="true"></i>';
    lenis && lenis.start();
  }
  burger && burger.addEventListener('click', () => {
    sheetOpen = !sheetOpen;
    sheet.classList.toggle('open', sheetOpen);
    sheet.setAttribute('aria-hidden', String(!sheetOpen));
    sheet.inert = !sheetOpen;
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    if (sheetOpen) sheet.querySelector('a').focus();
    burger.setAttribute('aria-expanded', String(sheetOpen));
    burger.innerHTML = `<i class="ph ph-${sheetOpen ? 'x' : 'list'}" aria-hidden="true"></i>`;
    burger.setAttribute('aria-label', sheetOpen ? 'Close menu' : 'Open menu');
    if (sheetOpen) { nav.classList.remove('hide'); lenis && lenis.stop(); } else { lenis && lenis.start(); }
  });

  /* ---------- scroll reveals: content enters as you reach it ---------- */
  if (motion) {
    ST.batch('[data-rise]', {
      interval: .12, batchMax: 5,
      onEnter: b => G.to(b, { opacity: 1, y: 0, duration: .85, stagger: .07, ease: 'expo.out', overwrite: true }),
      start: 'top 88%'
    });
    G.set('[data-rise]', { opacity: 1, y: 16 });
  }

  /* ---------- count up: the numbers are the point of that band ---------- */
  $$('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (!motion) { el.textContent = to.toFixed(dec); return; }
    const o = { v: 0 };
    G.to(o, {
      v: to, duration: 1.5, ease: 'expo.out',
      onUpdate: () => { el.textContent = o.v.toFixed(dec); },
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });

  /* ---------- experience rail: draws the chronology as you read it ---------- */
  const rail = $('#railFill');
  if (rail) {
    if (motion) G.to(rail, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#xpList', start: 'top 72%', end: 'bottom 72%', scrub: .4 }
    });
    else rail.style.transform = 'scaleY(1)';
  }

  /* ---------- marquee: clone the group so the loop has no seam ---------- */
  const mt = $('#marqT');
  if (mt) {
    const c = mt.firstElementChild.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    mt.appendChild(c);
  }

  /* ---------- awards rail ---------- */
  const awRail = $('#awRail');
  if (awRail) {
    const step = () => (awRail.querySelector('.aw')?.offsetWidth || 280)
      + (parseFloat(getComputedStyle(awRail).columnGap) || 18);
    /* Chrome cancels native smooth scrolling inside a mandatory snap
       container, so the rail is tweened instead of scrollBy'd. */
    const nudge = dir => {
      const max = awRail.scrollWidth - awRail.clientWidth;
      const to = Math.max(0, Math.min(awRail.scrollLeft + dir * step(), max));
      if (motion) G.to(awRail, { scrollLeft: to, duration: .55, ease: 'power3.out', overwrite: true });
      else awRail.scrollLeft = to;
      sync();
    };
    /* a disabled arrow at the end of the rail is honest about where you are */
    const sync = () => requestAnimationFrame(() => {
      const max = awRail.scrollWidth - awRail.clientWidth;
      $('#awPrev').disabled = awRail.scrollLeft < 4;
      $('#awNext').disabled = awRail.scrollLeft > max - 4;
    });
    $('#awNext').addEventListener('click', () => nudge(1));
    $('#awPrev').addEventListener('click', () => nudge(-1));
    awRail.addEventListener('scrollend', sync, { passive: true });
    sync();
  }

  /* ---------- toast ---------- */
  const toast = $('#toast');
  let tHide;
  function say(msg) {
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%,0)';
    clearTimeout(tHide);
    tHide = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,24px)';
    }, 2000);
  }
  document.addEventListener('click', async e => {
    const b = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
    if (!b) return;
    const txt = b.dataset.copy;
    try {
      await navigator.clipboard.writeText(txt);
      say('Copied: ' + txt);
    } catch (err) {
      /* clipboard API needs a secure context; fall back to a selection, and
         failing that just show the value so it can be copied by hand */
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-200px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) {}
      ta.remove();
      say(ok ? 'Copied: ' + txt : txt);
    }
  });

  /* ---------- backend cell: a real controller, typed out ---------- */
  const CODE = [
    [['c', '// staff extension directory search']],
    [['k', 'public function '], ['f', 'search'], ['', '('], ['f', 'Request '], ['', '$request)']],
    [['', '{']],
    [['', '    $q = $request'], ['', '->'], ['f', 'string'], ['', '('], ['s', "'q'"], ['', ');']],
    [],
    [['', '    '], ['k', 'return '], ['f', 'Staff'], ['', '::'], ['f', 'query'], ['', '()']],
    [['', '        ->'], ['f', 'where'], ['', '('], ['s', "'unit'"], ['', ', '], ['s', "'like'"], ['', ', '], ['s', '"%{$q}%"'], ['', ')']],
    [['', '        ->'], ['f', 'orderBy'], ['', '('], ['s', "'unit'"], ['', ')']],
    [['', '        ->'], ['f', 'paginate'], ['', '(20);']],
    [['', '}']]
  ];
  const codeEl = $('#code');
  if (codeEl) {
    const tok = (c, t) => { const s = document.createElement('span'); if (c) s.className = c; s.textContent = t; return s; };
    const lines = CODE.map(tokens => {
      const ln = document.createElement('span');
      ln.style.display = 'block';
      ln.style.minHeight = '1.72em';
      codeEl.appendChild(ln);
      return { ln, tokens };
    });
    if (reduce) {
      lines.forEach(({ ln, tokens }) => tokens.forEach(([c, t]) => ln.appendChild(tok(c, t))));
    } else {
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      lines[0].ln.appendChild(cursor);
      let li = 0, ti = 0, ci = 0, cur = null, timer = null;
      const step = () => {
        if (li >= lines.length) { lines[lines.length - 1].ln.appendChild(cursor); return; }
        const { ln, tokens } = lines[li];
        if (ti >= tokens.length) {
          li++; ti = 0; ci = 0; cur = null;
          if (li < lines.length) lines[li].ln.appendChild(cursor);
          timer = setTimeout(step, 95); return;
        }
        const [c, t] = tokens[ti];
        if (!t.length || /^\s+$/.test(t)) { ln.insertBefore(tok(c, t), cursor); ti++; step(); return; }
        if (!cur) { cur = tok(c, ''); ln.insertBefore(cur, cursor); }
        cur.textContent += t[ci++];
        if (ci >= t.length) { ti++; ci = 0; cur = null; }
        timer = setTimeout(step, 13 + Math.random() * 30);
      };
      new IntersectionObserver((es, obs) => {
        if (!es[0].isIntersecting) return;
        obs.disconnect();
        step();
      }, { threshold: .35 }).observe(codeEl);
    }
  }

  /* =============================================================
     CERTIFICATES
     Twelve real certificates. Images live in certs/ with a 680px
     copy in certs/thumb/. Add one object to extend the grid.
     ============================================================= */
  const CERTS = [
    { file: 'nvidia-ai-infrastructure', group: 'nvidia', logo: 'nvidia', issuer: 'NVIDIA', via: 'Coursera',
      title: 'AI Infrastructure and Operations Fundamentals', date: '9 Jul 2026', iso: '2026-07-09',
      verify: 'https://coursera.org/verify/ZM5AXFJ7N99J', verifyOn: 'Coursera', w: 1122, h: 863 },
    { file: 'uol-managing-technology-projects', group: 'uol', seal: 'UoL', issuer: 'University of London', via: 'Coursera',
      title: 'Managing Technology Projects for Business Success', date: '24 Jun 2026', iso: '2026-06-24',
      verify: 'https://coursera.org/verify/HTTXGVZH5B1X', verifyOn: 'Coursera', w: 1065, h: 827 },
    { file: 'google-ux-design', group: 'google', logo: 'google', issuer: 'Google', via: 'Coursera',
      title: 'Foundations of User Experience (UX) Design', date: '27 Dec 2025', iso: '2025-12-27',
      verify: 'https://coursera.org/verify/1XY60LQZGCXS', verifyOn: 'Coursera', w: 1069, h: 824 },
    { file: 'ibm-web-development-fundamentals', group: 'ibm', seal: 'IBM', issuer: 'IBM SkillsBuild',
      title: 'Web Development Fundamentals', date: '9 Jun 2026', iso: '2026-06-09',
      verify: 'https://www.credly.com/badges/9feca5bb-174b-4b1b-8e37-41c8e4312dca', verifyOn: 'Credly', w: 1065, h: 800 },
    { file: 'google-gemini-certified-student', group: 'google', logo: 'google', issuer: 'Google for Education',
      title: 'Gemini Certified Student (University)', date: '7 Jun 2026', iso: '2026-06-07',
      note: 'Valid to Jun 2029', w: 1060, h: 823 },
    { file: 'hp-ai-for-business-professionals', group: 'hp', logo: 'hp', issuer: 'HP LIFE', via: 'HP Foundation',
      title: 'AI for Business Professionals', date: '7 Jun 2026', iso: '2026-06-07',
      id: 'fc10940e-fed0-4353-8e46-42594385e32b', idLabel: 'serial number', w: 1217, h: 862 },
    { file: 'ibm-customer-engagement-fundamentals', group: 'ibm', seal: 'IBM', issuer: 'IBM SkillsBuild',
      title: 'Customer Engagement Fundamentals', date: '10 Jun 2026', iso: '2026-06-10',
      verify: 'https://www.credly.com/badges/af05a1b1-4905-4c2c-862d-27a42aa1e3d6', verifyOn: 'Credly', w: 1116, h: 838 },
    { file: 'ibm-software-engineering-coding', group: 'ibm', seal: 'IBM', issuer: 'IBM SkillsBuild',
      title: 'Software Engineering and Coding', date: '10 Jun 2026', iso: '2026-06-10',
      id: 'ALM-COURSE_3822995', idLabel: 'course ID', w: 1155, h: 711 },
    { file: 'ibm-software-engineering-reliability', group: 'ibm', seal: 'IBM', issuer: 'IBM SkillsBuild',
      title: 'Apply Software Engineering Principles to Drive Reliability', date: '10 Jun 2026', iso: '2026-06-10',
      id: 'ISG-C110062G', idLabel: 'course ID', w: 1151, h: 706 },
    { file: 'ibm-agile-methodology', group: 'ibm', seal: 'IBM', issuer: 'IBM SkillsBuild', via: 'Codecademy',
      title: 'Software Development Methodology: What is Agile?', date: '10 Jun 2026', iso: '2026-06-10',
      id: 'URL-GZZKPAOXHXS', idLabel: 'course ID', w: 1155, h: 710 },
    { file: 'hp-data-science-analytics', group: 'hp', logo: 'hp', issuer: 'HP LIFE', via: 'HP Foundation',
      title: 'Data Science and Analytics', date: '7 Jun 2026', iso: '2026-06-07',
      id: 'f31553ab-3e5a-43f1-b58c-d40305408ca0', idLabel: 'serial number', w: 1218, h: 863 },
    { file: 'hp-critical-thinking-ai-era', group: 'hp', logo: 'hp', issuer: 'HP LIFE', via: 'HP Foundation',
      title: 'Critical Thinking in the AI Era', date: '7 Jun 2026', iso: '2026-06-07',
      id: '0dde7974-5001-48a6-8146-2580791104ac', idLabel: 'serial number', w: 1164, h: 822 }
  ];
  const GROUPS = [['all', 'All'], ['nvidia', 'NVIDIA'], ['google', 'Google'], ['uol', 'Univ. of London'], ['ibm', 'IBM SkillsBuild'], ['hp', 'HP LIFE']];
  const SHOWN = 8; /* two clean rows of four on a desktop grid */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shortId = id => id.length > 16 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
  const alt = c => `${c.title} certificate issued to Elvin Harrizon by ${c.issuer}`;
  const sealFor = c => c.logo
    ? `<img class="logo" src="https://cdn.simpleicons.org/${c.logo}/141413" alt="" width="26" height="26" loading="lazy">`
    : `<span class="mark">${esc(c.seal)}</span>`;

  const grid = $('#certGrid'), moreBtn = $('#certMore');
  let filter = 'all', expanded = false, cards = [];

  if (grid) {
    grid.innerHTML = CERTS.map((c, i) => {
      const action = c.verify
        ? `<a class="verify" href="${c.verify}" target="_blank" rel="noopener">Verify on ${c.verifyOn} <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`
        : c.id
          ? `<button class="copyid" type="button" data-copy="${esc(c.id)}"><i class="ph ph-copy" aria-hidden="true"></i><span class="sr">Copy ${c.idLabel} </span><span>${esc(shortId(c.id))}</span></button>`
          : `<span class="cert-note">${esc(c.note || '')}</span>`;
      return `<article class="cert glass" data-group="${c.group}">
  <button class="cert-img" type="button" data-open="${i}" aria-label="View certificate: ${esc(c.title)}">
    <img src="certs/thumb/${c.file}.jpg" alt="${esc(alt(c))}" width="680" height="${Math.round(680 * c.h / c.w)}" loading="lazy" decoding="async">
    <span class="zoom" aria-hidden="true"><i class="ph ph-magnifying-glass-plus"></i>View</span>
  </button>
  <div class="cert-body">
    <div class="cert-iss">${sealFor(c)}<span><b>${esc(c.issuer)}</b>${c.via ? `<small>via ${esc(c.via)}</small>` : ''}</span></div>
    <h4>${esc(c.title)}</h4>
    <div class="cert-foot"><time datetime="${c.iso}">${c.date}</time>${action}</div>
  </div>
</article>`;
    }).join('');
    cards = $$('.cert', grid);
    $('#certTotal').textContent = CERTS.length;
    $('#certFilters').innerHTML = GROUPS.map(([g, label]) => {
      const n = g === 'all' ? CERTS.length : CERTS.filter(c => c.group === g).length;
      return `<button class="filter${g === 'all' ? ' on' : ''}" type="button" data-filter="${g}" aria-pressed="${g === 'all'}">${label}<small>${n}</small></button>`;
    }).join('');
    apply(false);
  }

  function apply(animate) {
    let shown = 0;
    const visible = [];
    cards.forEach(card => {
      const match = filter === 'all' || card.dataset.group === filter;
      const fits = match && (expanded || shown < SHOWN);
      if (match) shown++;
      card.classList.toggle('hide', !fits);
      if (fits) visible.push(card);
    });
    const total = filter === 'all' ? CERTS.length : CERTS.filter(c => c.group === filter).length;
    if (moreBtn) {
      const need = total > SHOWN;
      moreBtn.parentElement.style.display = need ? '' : 'none';
      moreBtn.setAttribute('aria-expanded', String(expanded));
      moreBtn.innerHTML = expanded
        ? 'Show fewer <i class="ph ph-caret-up" aria-hidden="true"></i>'
        : `Show all ${total} certificates <i class="ph ph-caret-down" aria-hidden="true"></i>`;
    }
    if (animate && motion) {
      G.fromTo(visible, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .55, stagger: .035, ease: 'expo.out', overwrite: true });
      ST.refresh();
    } else if (animate) {
      visible.forEach(v => { v.style.opacity = '1'; v.style.transform = 'none'; });
    }
  }

  const filterBox = $('#certFilters');
  filterBox && filterBox.addEventListener('click', e => {
    const b = e.target.closest('.filter');
    if (!b) return;
    filter = b.dataset.filter;
    expanded = false;
    $$('.filter', filterBox).forEach(f => {
      const on = f === b;
      f.classList.toggle('on', on);
      f.setAttribute('aria-pressed', String(on));
    });
    apply(true);
  });
  moreBtn && moreBtn.addEventListener('click', () => { expanded = !expanded; apply(true); });

  /* ---------- certificate viewer ---------- */
  const lb = $('#lb'), lbImg = $('#lbImg');
  let at = 0, list = [], lastFocus = null;

  function openLb(i) {
    list = cards.map((c, n) => !c.classList.contains('hide') ? n : -1).filter(n => n > -1);
    at = list.indexOf(i) > -1 ? list.indexOf(i) : 0;
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.querySelector('main').inert = true;
    document.querySelector('header').inert = true;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('in'));
    lenis && lenis.stop();
    paint();
    $('#lbNext').focus();
  }
  function closeLb() {
    lb.classList.remove('in');
    document.querySelector('main').inert = false;
    document.querySelector('header').inert = false;
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, reduce ? 0 : 320);
    lenis && lenis.start();
    lastFocus && lastFocus.focus();
  }
  function paint() {
    const c = CERTS[list[at]];
    lbImg.src = `certs/${c.file}.jpg`;
    lbImg.alt = alt(c);
    lbImg.width = c.w; lbImg.height = c.h;
    $('#lbCount').textContent = `${at + 1} / ${list.length}`;
    $('#lbIssuer').textContent = c.issuer + (c.via ? ', via ' + c.via : '');
    $('#lbTitle').textContent = c.title;
    $('#lbMeta').textContent = c.date + (c.note ? '. ' + c.note : '');
    $('#lbActions').innerHTML = c.verify
      ? `<a class="btn btn-ghost btn-sm" href="${c.verify}" target="_blank" rel="noopener">Verify on ${c.verifyOn} <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`
      : c.id
        ? `<button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(c.id)}">Copy ${c.idLabel} <i class="ph ph-copy" aria-hidden="true"></i></button>`
        : '';
    const n = i => CERTS[list[(at + i + list.length) % list.length]];
    [n(1), n(-1)].forEach(x => { const p = new Image(); p.src = `certs/${x.file}.jpg`; });
  }
  const move = d => { at = (at + d + list.length) % list.length; paint(); };

  grid && grid.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) openLb(+b.dataset.open);
  });
  $('#lbNext').addEventListener('click', () => move(1));
  $('#lbPrev').addEventListener('click', () => move(-1));
  $$('[data-close]', lb).forEach(b => b.addEventListener('click', closeLb));
  addEventListener('keydown', e => {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
      return;
    }
    if (e.key === 'Escape' && sheetOpen) closeSheet();
  });

  // Keep keyboard navigation inside the open certificate viewer or mobile menu.
  addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const scope = !lb.hidden ? lb : sheetOpen ? sheet : null;
    if (!scope) return;
    const focusable = [...scope.querySelectorAll('a[href],button:not([disabled])')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- refresh reveals across resize ---------- */
  if (motion) {
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ST.refresh(), 240); });
    addEventListener('load', () => ST.refresh());
  }
};
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
