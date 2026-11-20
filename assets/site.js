
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
  /* limitCallbacks stays off. With it on, a trigger that a jump skips over
     (the nav links, Back to top) never fires onEnter, and anything that
     starts hidden and waits for it, the blog photos and the stickers, stays
     hidden for good. */
  if (G && ST) { G.registerPlugin(ST); ST.config({ ignoreMobileResize: true }); }
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
    /* #top is <main>, which never leaves the viewport, so an observer on
       it never fired; read the scroll position instead */
    const onScroll = () => nav.classList.toggle('on', scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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

  /* ---------- deck motion: the cover word, stickers, blog tiles ----------
     All scroll-driven and transform-led, the way the reference deck moves
     between slides. Each one says something: the cover word slides off as
     the cover leaves, a sticker lands when its headline arrives, and the
     photos of a post come in as a set. Nothing here runs under reduced
     motion or without GSAP, and none of it touches the LCP elements'
     opacity. */
  if (motion) {
    /* the cover word drifts left and the portrait lifts away as the hero
       scrolls out; parents only, so the CSS intro on the letters and the
       photo is never fought over */
    const hero = $('.hero');
    if (hero) {
      G.to('.giant', {
        xPercent: -9, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .4 }
      });
      G.to('.hero-photo', {
        y: -60, rotation: 3, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .4 }
      });
    }

    /* stickers slap on when their headline comes into view; GSAP reads
       the -6deg from the stylesheet as the resting angle */
    $$('.sec-h .sticker').forEach(s => {
      G.from(s, {
        scale: .2, rotation: -34, autoAlpha: 0, duration: .7, ease: 'back.out(2.2)',
        scrollTrigger: { trigger: s, start: 'top 88%', once: true }
      });
    });

    /* gallery tiles come in by the row they sit on: the gallery is taller
       than a screen, so one trigger for all of it would play the bottom
       row out of sight. batch groups the tiles that arrive together. */
    const gTiles = $$('.gallery .tile');
    if (gTiles.length) {
      G.set(gTiles, { autoAlpha: 0, y: 40, scale: .96 });
      ST.batch(gTiles, {
        start: 'top 90%', once: true,
        onEnter: b => G.to(b, { autoAlpha: 1, y: 0, scale: 1, duration: .85, stagger: .08, ease: 'expo.out', overwrite: true })
      });
      /* and each photo drifts inside its frame as it crosses the screen,
         the slow depth of the deck's slides. The image is scaled up just
         enough that the drift never shows an edge; the clip stays still
         so its controls do not move under a finger. */
      $$('.gallery button.tile img').forEach(img => {
        G.fromTo(img, { yPercent: -6, scale: 1.14 }, {
          yPercent: 6, scale: 1.14, ease: 'none',
          scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: .5 }
        });
      });
    }
  }

  /* ---------- work: orbit carousel ----------
     One master timeline holds every transition back to back, one unit
     of time per project, and the page scroll scrubs it. So the swing
     is under the reader's hand: a wheel notch moves the screenshot a
     little way round the orbit, and nothing fires on its own. A short
     scrub lag smooths the steps of a mouse wheel, and a soft snap
     settles on the nearest project once the wheel stops.

     The first cut of this fired a fixed 1.2s timeline whenever the
     scroll crossed a threshold and then snapped the scrollbar after
     it. On a mouse wheel that read as scroll, nothing, lurch, jump.

     The stylesheet ships the plain vertical stack and waits for
     .orb-on before it applies any of the orbit layout, so with no
     GSAP, under reduced motion, or on a narrow window the section
     stays a list of readable cards. gsap.matchMedia adds and removes
     the class together with the tweens, so crossing the breakpoint
     tears the whole thing down rather than leaving a pinned stage
     nobody can scroll. */
  const orb = $('#orb');
  if (orb) {
    const projs = $$('.proj', orb);
    const n = projs.length;
    const canvas = $('#orbCanvas'), arcEl = $('#orbArc'), live = $('#orbLive');
    const thumbs = $('#orbThumbs'), pager = $('#orbPager');
    const headWrap = orb.querySelector('.wrap');

    /* design stage, and the circle the screenshots travel on. The
       pivot sits far above the stage: it is the transform-origin set
       on .proj-shot, expressed in stage coordinates. */
    const CW = 1100, CH = 520;
    const ORB_X = 275, ORB_Y = -417, ORB_R = 661, ARC_W = 150;
    const SWING = 56;            // degrees a screenshot travels: enough to clear the stage
    const VISIBLE = 3;           // thumbnails in the strip window
    const THUMB = 144;           // thumbnail pitch, stage px
    const PER = 0.7;             // viewport heights of scroll per transition

    const HIDE_R = 'inset(0% 0% 0% 100%)';  // thin line, wipes in from the right
    const HIDE_L = 'inset(0% 100% 0% 0%)';  // heavy line, wipes in from the left
    const SHOW   = 'inset(0% 0% 0% 0%)';

    /* where the band rests behind each project, as [start, end] angles
       in degrees: 0 points right, 90 straight down from the pivot. */
    /* Right end kept clear of the title column: at 70 degrees the band's
       outer edge reaches x 527, and the titles start at 532, and an orange
       title over the orange band simply disappears. Left end runs well
       past the screenshot, so the band reads as a swoosh sweeping out
       from behind it instead of hiding under it. */
    const REST = [[71, 132], [73, 128], [70, 136], [72, 130], [71, 134]];
    const SWEEP = [46, 136];     // stretched, mid-swap
    const restFor = i => REST[((i % REST.length) + REST.length) % REST.length];

    /* a thick stroke along the orbit circle, tapering at both ends */
    const arcPath = (a0, a1, steps = 44) => {
      const outer = [], inner = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
        const h = (ARC_W / 2) * Math.pow(Math.sin(Math.PI * t), 0.45);
        const c = Math.cos(a), s = Math.sin(a);
        outer.push(`${(ORB_X + c * (ORB_R + h)).toFixed(1)} ${(ORB_Y + s * (ORB_R + h)).toFixed(1)}`);
        inner.push(`${(ORB_X + c * (ORB_R - h)).toFixed(1)} ${(ORB_Y + s * (ORB_R - h)).toFixed(1)}`);
      }
      return 'M' + outer.join('L') + 'L' + inner.reverse().join('L') + 'Z';
    };
    const arc = { a0: REST[0][0], a1: REST[0][1] };
    const drawArc = () => arcEl && arcEl.setAttribute('d', arcPath(arc.a0, arc.a1));

    const parts = i => {
      const p = projs[i];
      return {
        proj: p,
        shot: p.querySelector('.proj-shot'),
        eye:  p.querySelector('.eye'),
        t1:   p.querySelector('.t1'),
        t2:   p.querySelector('.t2'),
        body: p.querySelector('.proj-body')
      };
    };

    /* ---- pager and thumbnail strip, built from the markup ---- */
    projs.forEach((p, i) => {
      const label = p.dataset.label || `Project ${i + 1}`;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', label);
      dot.innerHTML = '<i aria-hidden="true"></i>';
      dot.addEventListener('click', () => go(i));
      pager.appendChild(dot);

      const cell = document.createElement('div');
      cell.className = 'orb-thumb';
      const btn = document.createElement('button');
      btn.type = 'button';
      const src = p.querySelector('.proj-shot img').getAttribute('src');
      btn.innerHTML = `<img src="${src}" alt="" width="144" height="90" loading="lazy" decoding="async"><span></span>`;
      btn.querySelector('span').textContent = label;
      btn.addEventListener('click', () => go(i));
      cell.appendChild(btn);
      thumbs.appendChild(cell);
    });
    const dots = $$('button', pager);
    const thumbBtns = $$('.orb-thumb button', thumbs);

    /* Nothing below touches the DOM until the carousel is running.
       Without this guard the first paint would hide four of the five
       projects with an inline style, and the fallback stack would be
       a single card with no way to reach the rest. */
    let on = false, at = 0, st = null, master = null, jump = null;
    const steps = Math.max(1, n - 1);

    const marks = () => {
      dots.forEach((d, i) => {
        d.toggleAttribute('aria-current', i === at);
        d.setAttribute('aria-selected', String(i === at));
      });
      thumbBtns.forEach((b, i) => b.toggleAttribute('aria-current', i === at));
      /* keep the current thumbnail inside the window */
      const start = n <= VISIBLE ? 0 : Math.max(0, Math.min(at - 1, n - VISIBLE));
      thumbs.style.transform = `translateX(${-start * THUMB}px)`;
      if (live) live.textContent = `Project ${at + 1} of ${n}: ${projs[at].dataset.label || ''}`;
      $('#orbPrev').disabled = at === 0;
      $('#orbNext').disabled = at === n - 1;
    };

    /* Every tween states both ends, so scrubbing backwards, or jumping
       several projects at once, lands on the same frames as playing
       through. Outgoing parts render their start only when reached;
       incoming parts pre-render theirs, which is what parks each
       waiting screenshot round the far side of the orbit. */
    const build = () => {
      const tl = G.timeline({ paused: true });
      projs.forEach((p, i) => G.set(p, { visibility: i === 0 ? 'visible' : 'hidden' }));
      const first = parts(0);
      G.set(first.shot, { rotation: 0, autoAlpha: 1 });
      G.set([first.eye, first.body], { autoAlpha: 1, y: 0 });
      G.set(first.t1, { clipPath: SHOW });
      G.set(first.t2, { clipPath: SHOW });
      arc.a0 = REST[0][0]; arc.a1 = REST[0][1];
      drawArc();
      tl.addLabel('p0', 0);

      for (let i = 0; i < n - 1; i++) {
        const a = parts(i), b = parts(i + 1), t = i;
        const from = restFor(i), rest = restFor(i + 1);
        const out = { immediateRender: false };
        tl
          /* screenshot: out over the top, the next swings in from the far side */
          .fromTo(a.shot, { rotation: 0 }, { rotation: SWING, duration: .55, ease: 'power2.in', ...out }, t)
          .fromTo(a.shot, { autoAlpha: 1 }, { autoAlpha: 0, duration: .22, ease: 'power1.in', ...out }, t + .33)
          .set(a.proj, { visibility: 'hidden' }, t + .55)
          .set(b.proj, { visibility: 'visible' }, t + .28)
          .fromTo(b.shot, { rotation: -SWING }, { rotation: 0, duration: .72, ease: 'power3.out' }, t + .28)
          .fromTo(b.shot, { autoAlpha: 0 }, { autoAlpha: 1, duration: .25, ease: 'power1.out' }, t + .28)
          /* title: thin clips away right, heavy left, then the next wipes in */
          .fromTo(a.t1, { clipPath: SHOW }, { clipPath: HIDE_R, duration: .4, ease: 'power2.in', ...out }, t)
          .fromTo(a.t2, { clipPath: SHOW }, { clipPath: HIDE_L, duration: .4, ease: 'power2.in', ...out }, t + .05)
          .fromTo(a.eye, { autoAlpha: 1 }, { autoAlpha: 0, duration: .25, ...out }, t)
          .fromTo(b.eye, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .35, ease: 'power2.out' }, t + .5)
          .fromTo(b.t1, { clipPath: HIDE_R }, { clipPath: SHOW, duration: .5, ease: 'power3.out' }, t + .48)
          .fromTo(b.t2, { clipPath: HIDE_L }, { clipPath: SHOW, duration: .5, ease: 'power3.out' }, t + .5)
          /* card: cross-fade, then its rows rise in turn. Opacity only on
             the card itself: it carries a backdrop blur, and moving it
             would re-blur the backdrop every frame. */
          .fromTo(a.body, { autoAlpha: 1 }, { autoAlpha: 0, duration: .3, ease: 'power1.in', ...out }, t + .05)
          .fromTo(b.body, { autoAlpha: 0 }, { autoAlpha: 1, duration: .25, ease: 'power1.out' }, t + .38)
          .fromTo(b.body.children, { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: .38, stagger: .035, ease: 'power2.out' }, t + .38)
          /* band: trails between the two, then settles on the next span */
          .fromTo(arc, { a0: from[0], a1: from[1] },
            { a0: SWEEP[0], a1: SWEEP[1], duration: .55, ease: 'power2.inOut', onUpdate: drawArc, ...out }, t)
          .fromTo(arc, { a0: SWEEP[0], a1: SWEEP[1] },
            { a0: rest[0], a1: rest[1], duration: .45, ease: 'power3.out', onUpdate: drawArc, ...out }, t + .55)
          .addLabel('p' + (i + 1), t + 1);
      }
      return tl;
    };

    /* buttons, keys and swipes glide the scrollbar to the matching
       stretch, and the scrub carries the stage along with it */
    function go(to) {
      if (!on || !st) return;
      to = Math.max(0, Math.min(n - 1, to));
      if (to === at) return;
      const y0 = st.scroll(), y1 = st.start + ((st.end - st.start) * to) / steps;
      const o = { y: y0 };
      jump && jump.kill();
      jump = G.to(o, {
        y: y1, duration: .3 + .22 * Math.abs(to - at), ease: 'power2.inOut',
        onUpdate: () => st.scroll(o.y), onComplete: () => { jump = null; }
      });
    }
    const step = d => go(at + d);

    $('#orbPrev').addEventListener('click', () => step(-1));
    $('#orbNext').addEventListener('click', () => step(1));

    orb.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    let sw = null;
    canvas.addEventListener('pointerdown', e => { if (on) sw = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      const s = sw; sw = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.4) step(dx < 0 ? 1 : -1);
    });
    canvas.addEventListener('pointercancel', () => { sw = null; });

    /* Shrink any title line that would run past its column. The sizes
       in the markup are starting points; the real width depends on the
       face having loaded. Written back into the custom property so the
       stacked fallback, which ignores it, is untouched. */
    const fitTitles = () => {
      const head = orb.querySelector('.proj-head');
      if (!head) return;
      const max = head.clientWidth;
      $$('.t1, .t2', orb).forEach(el => {
        el.style.removeProperty('--fs');
        const w = el.scrollWidth;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (w > max) el.style.setProperty('--fs', `${Math.floor(fs * max / w)}px`);
      });
    };

    if (motion) {
      const mm = G.matchMedia();
      mm.add('(min-width: 1021px)', () => {
        root.classList.add('orb-on');
        orb.setAttribute('tabindex', '0');
        on = true;
        at = 0;

        /* fit the fixed design stage to whatever room is left under
           the section heading. Measured on resize only. */
        const fit = () => {
          const pad = parseFloat(getComputedStyle(headWrap).paddingLeft) || 24;
          const availW = orb.clientWidth - pad * 2;
          const availH = innerHeight - orb.querySelector('.orb-head').offsetHeight - 48;
          orb.style.setProperty('--orb-s', String(Math.max(.45, Math.min(availW / CW, availH / CH))));
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(orb);
        document.fonts.ready.then(() => { if (on) fitTitles(); });
        fitTitles();

        master = build();
        marks();

        st = ST.create({
          trigger: orb,
          start: 'top top',
          end: () => '+=' + Math.round(steps * innerHeight * PER),
          pin: true,
          anticipatePin: 1,
          /* Refresh this one first. Every trigger further down the page was
             created earlier in this file, so by default they measured before
             this pin existed and all sat 2520px too high: the nav lit the
             wrong section and the experience rail was drawn before you
             reached it. */
          refreshPriority: 1,
          invalidateOnRefresh: true,
          animation: master,
          scrub: .7,
          snap: {
            snapTo: 'labels',
            /* Nearest project, never where the momentum would have landed.
               With velocity projection on, PageDown, Space or a quick
               trackpad flick flung the stage straight to the last project
               and the three between were never seen. */
            inertia: false,
            duration: { min: .2, max: .6 },
            delay: .05,
            ease: 'power1.inOut'
          },
          onUpdate: self => {
            const s = Math.round(self.progress * steps);
            if (s !== at) { at = s; marks(); }
          }
        });
        ST.sort();
        ST.refresh();

        return () => {
          on = false;
          ro.disconnect();
          jump && jump.kill(); jump = null;
          st && st.kill(); st = null;
          master && master.kill(); master = null;
          at = 0;
          root.classList.remove('orb-on');
          orb.removeAttribute('tabindex');
          orb.style.removeProperty('--orb-s');
          $$('.proj, .proj-shot, .eye, .t1, .t2, .proj-body, .proj-body > *', orb)
            .forEach(el => G.set(el, { clearProps: 'all' }));
        };
      });
    }
  }

  /* ---------- magnetic buttons and glass specular highlight ----------
     Both were declared in the markup and the stylesheet but never had
     any script behind them. Pointer driven, never scroll driven, and
     written straight to transform so there is no layout work. */
  if (fine && !reduce) {
    $$('.mag').forEach(el => {
      let raf = 0, tx = 0, ty = 0;
      /* the independent `translate` property, not `transform`: the button's
         :active rule owns `transform` and the two would overwrite each other */
      const apply = () => { raf = 0; el.style.translate = `${tx}px ${ty}px`; };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        tx = (e.clientX - (r.left + r.width / 2)) * .22;
        ty = (e.clientY - (r.top + r.height / 2)) * .32;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => {
        tx = ty = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });

    $$('.glass').forEach(el => {
      let raf = 0, mx = 50, my = 0;
      const apply = () => { raf = 0; el.style.setProperty('--mx', mx + '%'); el.style.setProperty('--my', my + '%'); };
      el.addEventListener('pointerenter', () => el.classList.add('lit'));
      el.addEventListener('pointerleave', () => el.classList.remove('lit'));
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width) * 100;
        my = ((e.clientY - r.top) / r.height) * 100;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
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
  /* Two clean rows of four on a desktop grid. On a phone the grid is a
     single column, where eight cards is roughly 3400px of scrolling before
     the page continues, so start with four and let the button do the rest. */
  const SHOWN = matchMedia('(max-width: 700px)').matches ? 4 : 8;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shortId = id => id.length > 16 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
  const alt = c => `${c.title} certificate issued to Elvin Harrizon by ${c.issuer}`;
  const sealFor = c => c.logo
    ? `<img class="logo" src="https://cdn.simpleicons.org/${c.logo}/16201B" alt="" width="26" height="26" loading="lazy">`
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

  /* ---------- blog photo viewer ----------
     A native <dialog>: showModal gives the focus trap, Escape and the
     inert page for free. Every photo button carries its full-size path,
     caption and description, so the viewer reads from the markup and a
     new photo needs no script change. */
  const pv = $('#pv');
  if (pv && typeof pv.showModal === 'function') {
    const tiles = $$('#blog button.tile');
    const n = tiles.length;
    const pvImg = $('#pvImg'), pvCount = $('#pvCount');
    let k = 0, opener = null;

    const show = () => {
      const t = tiles[k];
      pvImg.src = t.dataset.full;
      pvImg.alt = `Photo ${k + 1} of ${n}`;
      pvImg.width = +t.dataset.w; pvImg.height = +t.dataset.h;
      /* Size the picture to fit the screen, so the panel wraps it. Left to
         the width attribute, a portrait photo sat in a panel as wide as a
         landscape one, with black bars down both sides. */
      const w = +t.dataset.w, h = +t.dataset.h;
      const s = Math.min((Math.min(innerWidth * .94, 1100) - 24) / w, Math.min(innerHeight * .78, 840) / h, 1);
      pvImg.style.width = Math.round(w * s) + 'px';
      pvImg.style.height = Math.round(h * s) + 'px';
      pvCount.textContent = `${k + 1} / ${n}`;
      /* warm the neighbours so the arrows feel instant */
      [tiles[(k + 1) % n], tiles[(k - 1 + n) % n]].forEach(x => { const im = new Image(); im.src = x.dataset.full; });
    };
    const move = d => { k = (k + d + n) % n; show(); };

    tiles.forEach((t, i) => t.addEventListener('click', () => {
      k = i; opener = t;
      show();
      pv.showModal();
      root.style.overflow = 'hidden';
      lenis && lenis.stop();
    }));
    pv.addEventListener('close', () => {
      root.style.overflow = '';
      lenis && lenis.start();
      opener && opener.focus();
    });
    $('#pvPrev').addEventListener('click', () => move(-1));
    $('#pvNext').addEventListener('click', () => move(1));
    $('#pvClose').addEventListener('click', () => pv.close());
    /* a click on the backdrop lands on the dialog element itself */
    pv.addEventListener('click', e => { if (e.target === pv) pv.close(); });
    pv.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    });
  }

  /* ---------- refresh reveals across resize ---------- */
  if (motion) {
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ST.refresh(), 240); });
    addEventListener('load', () => ST.refresh());
  }
};
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
