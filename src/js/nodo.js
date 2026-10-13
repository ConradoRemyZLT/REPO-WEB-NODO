/* ════════════════════════════════════════════════════════════
   NODO · capa de interacción
   Basada en ZLT-WEB-V2 (reveals, galerías, YouTube, idioma, mapa,
   formulario) + lo propio de Nodo: vistas por dirección (#/, #/empresas,
   #/inversores), imágenes de un solo registro, masterplan y configurador.
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var EN = function () { return document.body.classList.contains('en'); };
  var CFG = window.NODO_CFG || {};

  /* ══════════ Imágenes: viajan una vez en #nodo-img y se colocan al acercarse ══════════ */
  var IMG = {};
  try { IMG = JSON.parse($('#nodo-img').textContent); } catch (e) { }
  function put(el) {
    if (el.dataset.done) return;
    var k = el.dataset.img || el.dataset.bg, src = IMG[k];
    if (!src) return;
    el.dataset.done = '1';
    if (el.dataset.img && el.tagName === 'IMG') el.src = src;
    else el.style.backgroundImage = 'url(' + src + ')';
  }
  function hydrate(root) { $$('[data-img],[data-bg]', root).forEach(put); }
  // primero lo que se ve al cargar
  $$('[data-eager],.vhero [data-bg],.hdr [data-img]').forEach(put);
  var hio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { hydrate(e.target); hio.unobserve(e.target); } });
  }, { rootMargin: '900px 0px' });
  $$('section, .foot').forEach(function (s) { hio.observe(s); });

  /* ══════════ Preloader ══════════ */
  (function () {
    var bar = $('#pre .pbar i'), done = false;
    function finish() { if (done) return; done = true; if (bar) bar.style.width = '100%'; setTimeout(function () { document.body.classList.add('ready'); }, 220); }
    if (bar) requestAnimationFrame(function () { bar.style.width = '70%'; });
    if (document.readyState === 'complete') setTimeout(finish, 300);
    else addEventListener('load', function () { setTimeout(finish, 200); });
    setTimeout(finish, 2500);
  })();

  /* ══════════ Reveals ══════════ */
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('revealed'); rio.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  $$('[data-reveal],.hline').forEach(function (el) { rio.observe(el); });

  /* ══════════ Header ══════════ */
  var hdr = $('#hdr'), last = 0;
  function onScroll() {
    var y = scrollY;
    hdr.classList.toggle('scrolled', y > 40);
    if (!document.body.classList.contains('mopen')) hdr.classList.toggle('hide', y > 420 && y > last + 6);
    last = y;
    var tp = $('#top'); if (tp) tp.classList.toggle('on', y > innerHeight * 0.8);
    var dn = $('#dotnav'); if (dn) dn.classList.toggle('on', y > innerHeight * 0.6);
    var wa = $('.wa-fab'); if (wa) wa.classList.toggle('on', y > innerHeight * 0.6);
    var p = $('#prog'), h = document.documentElement.scrollHeight - innerHeight;
    if (p) p.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ══════════ Galerías + lightbox ══════════ */
  var LB = { list: [], i: 0 };
  $$('[data-gallery]').forEach(function (g) {
    var vp = $('.gviewport', g), slides = $$('.gslide', g);
    var cur = $('.gc-cur', g), line = $('.gline i', g), prev = $('.gprev', g), next = $('.gnext', g);
    var n = slides.length;
    if (!vp || !n) return;
    function index() {
      var c = vp.scrollLeft + vp.clientWidth / 2, best = 0, bd = 1e9;
      slides.forEach(function (s, k) { var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c); if (d < bd) { bd = d; best = k; } });
      return best;
    }
    function sync() {
      var i = index();
      slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      if (cur) cur.textContent = i + 1;
      if (line) { line.style.width = (100 / n) + '%'; line.style.transform = 'translateX(' + (i * 100) + '%)'; }
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === n - 1;
    }
    function go(k) {
      k = Math.max(0, Math.min(n - 1, k));
      vp.scrollTo({ left: slides[k].offsetLeft - (vp.clientWidth - slides[k].offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { go(index() - 1); });
    if (next) next.addEventListener('click', function () { go(index() + 1); });
    var raf;
    vp.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    var down = false, sx = 0, sl = 0, moved = 0;
    vp.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; down = true; moved = 0; sx = e.clientX; sl = vp.scrollLeft; vp.classList.add('dragging'); });
    vp.addEventListener('pointermove', function (e) { if (!down) return; var d = e.clientX - sx; moved = Math.abs(d); vp.scrollLeft = sl - d; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      vp.addEventListener(ev, function () { if (!down) return; down = false; vp.classList.remove('dragging'); requestAnimationFrame(function () { go(index()); }); });
    });
    var imgs = slides.map(function (s) { return $('img', s); });
    slides.forEach(function (s, k) {
      s.addEventListener('click', function () { if (moved > 6) { moved = 0; return; } LB.list = imgs; LB.i = k; openLB(); });
    });
    g._sync = sync;
    sync();
    addEventListener('resize', sync, { passive: true });
  });
  $$('[data-zoomset]').forEach(function (set) {
    var imgs = $$('img', set);
    imgs.forEach(function (im, k) { im.parentElement.addEventListener('click', function () { LB.list = imgs; LB.i = k; openLB(); }); });
  });
  var lb = $('#lb'), lbImg = lb && $('img', lb), lbC = lb && $('.lbc', lb);
  function paintLB() { var s = LB.list[LB.i]; if (!s) return; put(s); lbImg.src = s.currentSrc || s.src; lbImg.alt = s.alt || ''; lbC.textContent = (LB.i + 1) + ' / ' + LB.list.length; }
  function openLB() { paintLB(); lb.classList.add('on'); document.body.style.overflow = 'hidden'; muteAll(); }
  function closeLB() { lb.classList.remove('on'); document.body.style.overflow = ''; }
  function stepLB(d) { LB.i = (LB.i + d + LB.list.length) % LB.list.length; paintLB(); }
  if (lb) {
    $('.lbx', lb).addEventListener('click', closeLB);
    $('.lbn', lb).addEventListener('click', function (e) { e.stopPropagation(); stepLB(1); });
    $('.lbp', lb).addEventListener('click', function (e) { e.stopPropagation(); stepLB(-1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) closeLB(); });
    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowRight') stepLB(1); if (e.key === 'ArrowLeft') stepLB(-1);
    });
  }

  /* ══════════ YouTube (banner + ficha), por postMessage como en la v2 ══════════ */
  var YT_ORIGIN = /youtube(-nocookie)?\.com$/;
  var players = [];
  var NATIVE = { hero: [1920, 1080], proj: [1280, 720] };
  function ytPost(f, func, args) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: args || [] }), '*'); } catch (e) { } }
  function ytListen(f, id) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: id, channel: 'widget' }), '*'); } catch (e) { } }
  function noCC(f) { ytPost(f, 'unloadModule', ['captions']); ytPost(f, 'unloadModule', ['cc']); }
  function fitPlayer(p) {
    if (!p.frame) return;
    var host = p.kind === 'hero' ? p.el.querySelector('.vhero-frame') : p.el;
    var r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    var n = NATIVE[p.kind], s = Math.max(r.width / n[0], r.height / n[1]);
    p.frame.style.setProperty('--vs', s);
  }
  function fitAll() { players.forEach(fitPlayer); }
  addEventListener('resize', fitAll, { passive: true });
  function ytURL(id, muted) {
    return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=' + (muted ? 1 : 0) + '&loop=1&playlist=' + id +
      '&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&hl=es&enablejsapi=1';
  }
  function mount(p, muted) {
    if (p.frame) p.frame.remove();
    var f = document.createElement('iframe');
    f.src = ytURL(p.id, muted); f.title = p.title || 'Video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture';
    f.setAttribute('frameborder', '0'); f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true');
    (p.kind === 'hero' ? p.el.querySelector('.vhero-frame') : p.el).appendChild(f);
    p.frame = f; p.muted = muted; p.playing = false;
    p.el.classList.toggle('muted', muted); p.el.classList.remove('playing');
    fitPlayer(p);
    f.addEventListener('load', function () {
      ytListen(f, p.id); setTimeout(function () { ytListen(f, p.id); }, 600);
      [0, 800, 2500, 6000].forEach(function (t) { setTimeout(function () { noCC(f); }, t); });
    });
  }
  function setMuted(p, muted) {
    if (!p.frame) return;
    ytPost(p.frame, muted ? 'mute' : 'unMute'); if (!muted) ytPost(p.frame, 'setVolume', [100]);
    p.muted = muted; p.el.classList.toggle('muted', muted);
  }
  function muteAll(except) { players.forEach(function (o) { if (o !== except && !o.muted) setMuted(o, true); }); }
  addEventListener('message', function (e) {
    var h; try { h = new URL(e.origin).hostname; } catch (x) { return; }
    if (!YT_ORIGIN.test(h)) return;
    var d; try { d = JSON.parse(e.data); } catch (x) { return; }
    if (!d || d.event !== 'infoDelivery' || !d.info) return;
    players.forEach(function (p) {
      if (!p.frame || p.frame.contentWindow !== e.source) return;
      if (d.info.playerState === 1 && !p.playing) {
        p.playing = true; p.t0 = Date.now(); noCC(p.frame);
        ytPost(p.frame, 'setPlaybackQuality', [p.kind === 'hero' ? 'hd1080' : 'hd720']);
        (function hd() {
          if (!p.frame || p.el.classList.contains('playing')) return;
          if (/^(hd720|hd1080|hd1440|hd2160|highres)$/.test(p.q || '') || Date.now() - p.t0 > 5000) { fitPlayer(p); p.el.classList.add('playing'); }
          else setTimeout(hd, 150);
        })();
      }
      if (d.info.playbackQuality) p.q = d.info.playbackQuality;
      if (typeof d.info.muted === 'boolean') { p.muted = d.info.muted; p.el.classList.toggle('muted', p.muted); }
    });
  });
  /* ══════════ Videos de los encabezados (archivos en videos/, junto al HTML) ══════════
     Arrancan solos y sin sonido. MP4 (H.264) donde se pueda; si no, WebM (VP9).
     En celular vertical usan la versión 9x16. */
  (function () {
    var vids = $$('video.hv[data-v16]'); if (!vids.length) return;
    var probe = document.createElement('video');
    var EXT = [];
    if (probe.canPlayType('video/mp4; codecs="avc1.640028"')) EXT.push('mp4');
    if (probe.canPlayType('video/webm; codecs="vp9"')) EXT.push('webm');
    if (!EXT.length) EXT = ['mp4'];
    function portrait() { return innerWidth < innerHeight && innerWidth < 900; }
    function boxOf(v) { return v.closest('section'); }
    function setState(v) {
      var b = boxOf(v); if (!b) return;
      b.classList.toggle('is-muted', v.muted);
      b.classList.toggle('is-paused', v.paused && !!v._user);
    }
    function load(v) {
      var base = portrait() ? v.dataset.v9 : v.dataset.v16, src = base + '.' + EXT[v._e || 0];
      if (v._src === src) return;
      v._src = src; v.classList.remove('on'); v.src = src;
    }
    function play(v) {
      if (v._user) return;              // si la persona lo pausó, no se reanuda solo
      load(v);
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () { waitGesture(); });
    }
    var waiting = false, seen = new Set();
    function waitGesture() {
      if (waiting) return; waiting = true;
      var evs = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
      var go = function () { evs.forEach(function (ev) { removeEventListener(ev, go, true); }); waiting = false; seen.forEach(play); };
      evs.forEach(function (ev) { addEventListener(ev, go, { capture: true, passive: true }); });
    }
    vids.forEach(function (v) {
      v.muted = true; v.defaultMuted = true; v.playsInline = true;
      v.addEventListener('playing', function () { v.classList.add('on'); setState(v); });
      v.addEventListener('pause', function () { setState(v); });
      v.addEventListener('volumechange', function () { setState(v); });
      v.addEventListener('error', function () {          // formato que el navegador no lee → el otro
        if ((v._e || 0) + 1 < EXT.length) { v._e = (v._e || 0) + 1; v._src = null; play(v); }
      });
      var box = boxOf(v);
      $$('.js-vplay', box).forEach(function (b) {
        b.addEventListener('click', function () {
          if (v.paused) { v._user = false; play(v); } else { v._user = true; v.pause(); }
          setState(v);
        });
      });
      $$('.js-vmute', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var unmute = v.muted;
          if (unmute) {
            vids.forEach(function (o) { if (o !== v) o.muted = true; });
            $$('iframe').forEach(function (f) { try { f.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*'); } catch (e) {} });
            v._user = false; v.muted = false; play(v);
          } else v.muted = true;
          setState(v);
        });
      });
      setState(v);
    });
    if (RM) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { seen.add(v); play(v); }
        else { seen.delete(v); if (!v.paused) v.pause(); if (!v.muted) v.muted = true; }
      });
    }, { threshold: 0.2 });
    vids.forEach(function (v) { io.observe(v); });
    var rt; addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () {
        seen.forEach(function (v) {
          var want = (portrait() ? v.dataset.v9 : v.dataset.v16) + '.' + EXT[v._e || 0];
          if (v._src !== want) { var t = v.currentTime; load(v); v.addEventListener('loadedmetadata', function f() { v.removeEventListener('loadedmetadata', f); try { v.currentTime = t; } catch (e) {} }); play(v); }
        });
      }, 300);
    });
  })();
  $$('.pv-auto').forEach(function (el) {
    var p = { el: el, id: el.dataset.yt, kind: 'proj', muted: true, title: 'Avance de obra' };
    players.push(p);
    if (window.ResizeObserver) new ResizeObserver(function () { fitPlayer(p); }).observe(el);
    if (RM) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { if (!p.frame) mount(p, true); else ytPost(p.frame, 'playVideo'); }
        else if (p.frame) { ytPost(p.frame, 'pauseVideo'); if (!p.muted) setMuted(p, true); }
      });
    }, { threshold: 0.42 }).observe(el);
  });
  $$('.js-sound').forEach(function (b) {
    if (b.closest('.tour-box')) return;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var host = b.closest('.vhero') || b.closest('.pv-auto');
      var p = players.filter(function (o) { return o.el === host; })[0]; if (!p) return;
      if (!p.frame) mount(p, false);
      var want = !p.muted; setMuted(p, want);
      if (!want) { muteAll(p); ytPost(p.frame, 'playVideo'); }
    });
  });

  /* ══════════ Recorrido 360° (Kuula), a pedido ══════════ */
  var TOUR = 'https://kuula.co/share/collection/{id}?logo=1&info=1&fs=1&vr=0&zoom=1&initload=0&thumbs=-1&inst=es';
  function tourMount(box, sound) {
    var old = box.querySelector('iframe'), f = document.createElement('iframe');
    f.src = TOUR.replace('{id}', box.dataset.tour); f.setAttribute('frameborder', '0'); f.setAttribute('allowfullscreen', '');
    f.title = 'Recorrido 360°'; f.allow = 'xr-spatial-tracking; gyroscope; accelerometer; fullscreen' + (sound ? '; autoplay' : '');
    box.appendChild(f); if (old) old.remove(); box.classList.add('on'); box.classList.toggle('muted', !sound);
  }
  $$('.tour-box').forEach(function (box) {
    var st = $('.tour-start', box); if (st) st.addEventListener('click', function () { tourMount(box, false); muteAll(); });
    var snd = $('.js-sound', box); if (snd) snd.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var w = box.classList.contains('muted'); tourMount(box, w); if (w) muteAll(); });
    var fs = $('.js-fs', box); if (fs) fs.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); if (!box.querySelector('iframe')) tourMount(box, false);
      if (document.fullscreenElement) document.exitFullscreen(); else if (box.requestFullscreen) box.requestFullscreen();
    });
  });

  /* ══════════ Masterplan interactivo ══════════ */
  (function () {
    var mp = $('#mp'); if (!mp) return;
    var tip = $('#mp-tip'), stages = $$('#etapas .stage');
    function setEtapa(e) {
      mp.dataset.etapa = e;
      stages.forEach(function (s) { s.classList.toggle('on', s.dataset.etapa === String(e)); });
    }
    stages.forEach(function (s) { s.addEventListener('click', function () { setEtapa(s.dataset.etapa); }); });
    $$('.lot', mp).forEach(function (lot) {
      lot.addEventListener('pointerenter', function () {
        var n = lot.dataset.n, e = lot.dataset.e, en = EN();
        var name = n === '2' ? 'Nodo Flex · 14.400 m²' : ((en ? 'Lot ' : 'Lote ') + n);
        tip.innerHTML = '<small>' + (en ? 'Phase ' : 'Etapa ') + e + (n === '2' ? (en ? ' · under construction, completion March 2027' : ' · en construcción, finaliza en marzo 2027') : '') + '</small>' + name;
        var b = lot.getBBox(), sv = lot.ownerSVGElement.getBoundingClientRect(), r = mp.getBoundingClientRect();
        var k = sv.width / 1280;
        tip.style.left = (b.x + b.width / 2) * k + 'px'; tip.style.top = b.y * k + 'px';
        tip.classList.add('on');
      });
      lot.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
      lot.addEventListener('click', function () { setEtapa(lot.dataset.e); });
    });
  })();

  /* ══════════ Configurador de superficie ══════════ */
  (function () {
    var cfg = $('#cfg'); if (!cfg) return;
    var bays = $$('.bay', cfg), lab = $('#cfg-label'), pct = $('#cfg-pct'), rest = $('#cfg-rest');
    function fmt(n) { return n.toLocaleString(EN() ? 'en-US' : 'es-AR'); }
    function pick(m2) {
      var nb = Math.round(m2 / 600);
      bays.forEach(function (b, i) { b.classList.toggle('sel', i < nb); });
      $$('.cfg-btn', cfg).forEach(function (b) { b.classList.toggle('on', +b.dataset.m2 === m2); });
      var x0 = 40, w = 38.3333 * nb;
      lab.setAttribute('x', x0 + w / 2); lab.textContent = fmt(m2) + ' m²';
      pct.textContent = Math.round(m2 / 14400 * 100) + '%';
      rest.textContent = fmt(14400 - m2) + ' m²';
      cfg.dataset.m2 = m2;
    }
    $$('.cfg-btn', cfg).forEach(function (b) { b.addEventListener('click', function () { pick(+b.dataset.m2); }); });
    pick(2400);
    cfg._repaint = function () { pick(+cfg.dataset.m2 || 2400); };
  })();

  /* ══════════ Mapas (uno por vista, se crean al verse) ══════════ */
  function makeMap(el) {
    if (el._map) { el._map.invalidateSize(); return; }
    if (typeof L === 'undefined') { el.innerHTML = '<div class="map-fallback">No se pudo cargar el mapa.</div>'; return; }
    var M = CFG.mapa || {}, nodo = M.nodo || [-31.3857, -64.0703];
    var map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
    map.attributionControl.setPrefix('');
    var base = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Esri' }).addTo(map);
    var failed = 0, swapped = false;
    base.on('tileerror', function () { if (swapped || ++failed < 4) return; swapped = true; map.removeLayer(base); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map); });
    var pin = L.divIcon({ className: 'npin', html: '<span>' + (CFG.pinSvg || 'NODO') + '</span>', iconSize: [96, 40], iconAnchor: [48, 20] });
    var mk = L.marker(nodo, { icon: pin, zIndexOffset: 1000 }).addTo(map);
    mk.bindPopup('<b>Parque Logístico Nodo</b><br>Autovía Nacional 19, km 13');
    var refs = [];
    function ref(ll, es, en) {
      if (!ll) return;
      var m = L.marker(ll, { icon: L.divIcon({ className: 'rpin', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map);
      m.bindTooltip('<span class="l-es">' + es + '</span><span class="l-en">' + en + '</span>', { permanent: true, direction: 'right', className: 'nlabel', offset: [10, 0] });
      refs.push(ll);
      L.polyline([ll, nodo], { color: '#fff', weight: 1.5, opacity: .75, dashArray: '4 6' }).addTo(map);
    }
    ref(M.aeropuerto, 'Aeropuerto Internacional · 20 km', 'International Airport · 20 km');
    ref(M.centro, 'Centro de Córdoba', 'Córdoba city centre');
    map.fitBounds(L.latLngBounds(refs.concat([nodo])).pad(0.18));
    el._map = map;
    setTimeout(function () { map.invalidateSize(); }, 350);
  }
  var mio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) makeMap(e.target); }); }, { rootMargin: '300px 0px' });
  $$('[data-map]').forEach(function (m) { mio.observe(m); });

  /* ══════════ Prensa ══════════ */
  function fechas() {
    var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    $$('[data-date]').forEach(function (el) {
      var p = el.dataset.date.split('-'), m = +p[1] - 1, dd = +p[2];
      el.textContent = EN() ? MON[m] + ' ' + dd + ', ' + p[0] : dd + ' ' + MES[m] + ' ' + p[0];
    });
  }
  fechas();
  var pm = $('#press-more');
  if (pm) pm.addEventListener('click', function () { $$('#press .pcard.hid').forEach(function (c) { c.classList.remove('hid'); c.classList.add('revealed'); }); pm.parentElement.remove(); });

  /* ══════════ Menús ══════════ */
  var items = $$('.mi[data-menu]'), ct = null;
  function closeAll() { items.forEach(function (i) { i.classList.remove('open'); }); }
  var fine = matchMedia('(pointer:fine)').matches;
  items.forEach(function (it) {
    var b = $('.tl', it);
    if (fine) {
      it.addEventListener('mouseenter', function () { clearTimeout(ct); items.forEach(function (i) { i.classList.toggle('open', i === it); }); });
      it.addEventListener('mouseleave', function () { ct = setTimeout(closeAll, 160); });
    }
    b.addEventListener('click', function (e) { e.preventDefault(); var o = it.classList.contains('open'); closeAll(); if (!o) it.classList.add('open'); });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.mi')) closeAll(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); document.body.classList.remove('mopen'); } });
  var mbtn = $('#mbtn');
  $$('.mov a, .mov .m-group-h').forEach(function (el, k) { el.style.transitionDelay = (0.14 + k * 0.02) + 's'; });
  if (mbtn) mbtn.addEventListener('click', function () { var o = document.body.classList.toggle('mopen'); mbtn.setAttribute('aria-expanded', o); });

  /* ══════════ Idioma ══════════ */
  function setLang(l) {
    var go = function () {
      document.body.classList.toggle('en', l === 'en'); document.documentElement.lang = l;
      try { localStorage.setItem('nodo-lang', l); } catch (e) { }
      fechas(); var c = $('#cfg'); if (c && c._repaint) c._repaint(); setTitle();
    };
    if (document.startViewTransition && !RM) document.startViewTransition(go); else go();
    var ls = $('#langsel'); if (ls) ls.classList.remove('open');
  }
  var lbtn = $('#langbtn');
  if (lbtn) {
    lbtn.addEventListener('click', function (e) { e.stopPropagation(); $('#langsel').classList.toggle('open'); });
    $$('.lang-menu button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });
    document.addEventListener('click', function (e) { if (!e.target.closest('#langsel')) $('#langsel').classList.remove('open'); });
  }
  try {
    var qs = new URLSearchParams(location.search).get('lang');
    var sv = qs || localStorage.getItem('nodo-lang');
    if (sv === 'en') { document.body.classList.add('en'); document.documentElement.lang = 'en'; fechas(); }
  } catch (e) { }

  /* ══════════ Vistas: #/  ·  #/empresas  ·  #/inversores ══════════ */
  var VIEWS = { empresas: 'e-', inversores: 'i-' };
  var TITLES = {
    home: ['Nodo | Parque Logístico en Córdoba · Nodo Flex', 'Nodo | Logistics Park in Córdoba · Nodo Flex'],
    empresas: ['Nodo Flex para empresas | Nave AAA flexible en Córdoba', 'Nodo Flex for companies | Flexible AAA warehouse in Córdoba'],
    inversores: ['Nodo Flex para inversores | Renta 100% administrada', 'Nodo Flex for investors | Fully managed income']
  };
  function setTitle() { var v = document.body.dataset.view || 'home'; document.title = TITLES[v][EN() ? 1 : 0]; }
  function parse(h) {
    var parts = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (VIEWS[parts[0]]) return { view: parts[0], sec: parts[1] ? VIEWS[parts[0]] + parts[1] : null };
    return { view: 'home', sec: parts[0] || null };
  }
  function buildDots(view) {
    var dn = $('#dotnav'); if (!dn) return;
    dn.innerHTML = '';
    $$('.view[data-view="' + view + '"] section[id]').forEach(function (s) {
      var a = document.createElement('a');
      var id = s.id, route = view === 'home' ? '#/' + id : '#/' + view + '/' + id.slice(2);
      a.href = route; a.dataset.id = id;
      a.innerHTML = '<span>' + (s.getAttribute('aria-label') || id) + '</span>';
      dn.appendChild(a);
    });
  }
  var sio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      $$('#dotnav a').forEach(function (d) { d.classList.toggle('active', d.dataset.id === e.target.id); });
      var dk = e.target.classList.contains('dk') || e.target.classList.contains('vhero');
      document.body.classList.toggle('on-dark', dk);
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('main section[id]').forEach(function (s) { sio.observe(s); });

  var curView = null;
  function route(smooth) {
    var r = parse(location.hash), changed = r.view !== curView;
    if (changed) {
      curView = r.view;
      document.body.dataset.view = r.view;
      $$('.hpill').forEach(function (p) { p.classList.toggle('on', p.dataset.pill === r.view); });
      setTitle();
      buildDots(r.view);
      // al mostrar una vista, sus galerías y videos recién tienen tamaño
      requestAnimationFrame(function () {
        $$('.view[data-view="' + r.view + '"] [data-gallery]').forEach(function (g) { if (g._sync) g._sync(); });
        fitAll();
        var c = $('#cfg'); if (c && c._repaint) c._repaint();
      });
    }
    var t = r.sec && document.getElementById(r.sec);
    if (t) {
      hydrate(t);
      requestAnimationFrame(function () { t.scrollIntoView({ behavior: (smooth && !changed && !RM) ? 'smooth' : 'auto', block: 'start' }); });
    } else if (changed) {
      scrollTo(0, 0);
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    closeAll(); document.body.classList.remove('mopen');
    // preselección del motivo de consulta en el formulario general
    if (a.dataset.perfil) { var r = $('#form-general input[value="' + a.dataset.perfil + '"]'); if (r) r.checked = true; }
    var h = a.getAttribute('href');
    if (h === location.hash || (h === '#/' && !location.hash)) route(true);
    else { history.pushState(null, '', h); route(true); }
  });
  addEventListener('popstate', function () { route(false); });
  addEventListener('hashchange', function () { route(false); });
  route(false);

  /* ══════════ Volver arriba ══════════ */
  var top = $('#top');
  if (top) top.addEventListener('click', function () { scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); });

  /* ══════════ Formularios (FormSubmit, como la v2) ══════════ */
  var ASUNTO = { general: '[Nodo] Consulta desde la web', empresa: '[Nodo Flex · Empresa] Consulta desde la web', inversor: '[Nodo Flex · Inversor] Consulta desde la web' };
  $$('form.cform').forEach(function (form) {
    var req = $$('.fld input[required], .fld textarea[required], .fld select[required]', form);
    function valid(el) {
      var v = (el.value || '').trim(); if (!v) return false;
      if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (el.type === 'tel') return v.replace(/\D/g, '').length >= 7;
      return v.length >= 2;
    }
    function mark(el) { var ok = valid(el); el.closest('.fld').classList.toggle('bad', !ok); return ok; }
    req.forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value.trim()) mark(el); });
      el.addEventListener('input', function () { if (el.closest('.fld').classList.contains('bad')) mark(el); });
      el.addEventListener('change', function () { if (el.closest('.fld').classList.contains('bad')) mark(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.classList.contains('sending')) return;
      form.classList.remove('failed');
      var bad = req.filter(function (el) { return !mark(el); });
      if (bad.length) { bad[0].focus(); return; }
      var hp = form.querySelector('[name="_honey"]'); if (hp && hp.value) return;
      var perfil = form.dataset.perfil;
      var data = { _subject: ASUNTO[perfil] || ASUNTO.general, _template: 'table', origen: 'Web Nodo · ' + perfil, idioma: EN() ? 'EN' : 'ES' };
      $$('input[name],textarea[name],select[name]', form).forEach(function (el) {
        if (el.name.charAt(0) === '_' ) return;
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
        var v = (el.value || '').trim(); if (v) data[el.name] = v;
      });
      data._replyto = data.email;
      form.classList.add('sending');
      fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () { form.classList.remove('sending'); form.classList.add('sent'); form.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' }); })
        .catch(function () { form.classList.remove('sending'); form.classList.add('failed'); });
    });
  });
})();
