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
  // todas las imágenes se colocan de entrada: la pantalla de carga espera a que estén listas
  hydrate(document);

  /* ══════════ Pantalla de carga ══════════
     Se queda hasta que TODAS las imágenes (embebidas y de prensa) están decodificadas y los
     videos de los encabezados pueden reproducirse sin cortes. La barra muestra el avance real.
     Tope de seguridad: 90 s (si la conexión es muy lenta, la web se muestra igual). */
  /* Login (gate.js, el mismo de las webs de ZLT; lo inserta el workflow al publicar).
     Mientras el login está en pantalla no arranca la carga: recién al ingresar se muestra
     la pantalla de carga y se espera el video en HD. Sin gate (HTML local) sigue de largo. */
  var GATE = new Promise(function (r) {
    var gated = !!document.querySelector('script[src$="gate.js"]');
    function ok() { try { return sessionStorage.getItem('zlt_gate_ok') === '1'; } catch (e) { return true; } }
    if (!gated || ok()) return r();
    (function chk() { if (ok() && !document.getElementById('zgate')) r(); else setTimeout(chk, 150); })();
  });
  var PRE = { tasks: [], done: [], add: function (p) { this.tasks.push(p); }, ready: function (f) { this.done.push(f); } };
  (function () {
    var bar = $('#pre .pbar i'), done = false, total = 0, ok = 0;
    document.documentElement.classList.add('loading');
    function paint() { if (bar) bar.style.width = (total ? Math.max(4, Math.round(ok / total * 100)) : 4) + '%'; }
    function track(p) { total++; paint(); return Promise.resolve(p).catch(function () {}).then(function () { ok++; paint(); }); }
    function withCap(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); }
    function imgReady(im) {
      if (!im.getAttribute('src')) return Promise.resolve();
      var p = (im.complete && im.naturalWidth) ? Promise.resolve()
        : new Promise(function (r) { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); });
      return p.then(function () { return im.decode ? im.decode().catch(function () {}) : null; });
    }
    function bgReady(el) {
      var m = /url\(["']?(.*?)["']?\)/.exec(el.style.backgroundImage || ''); if (!m) return Promise.resolve();
      var im = new Image(); im.src = m[1];
      return im.decode ? im.decode().catch(function () {}) : new Promise(function (r) { im.onload = im.onerror = r; });
    }
    function finish() {
      if (done) return; done = true; ok = total; paint();
      setTimeout(function () {
        document.body.classList.add('ready'); document.documentElement.classList.remove('loading');
        PRE.done.forEach(function (f) { try { f(); } catch (e) {} });   // p. ej. el video de la Home vuelve al principio
      }, 260);
    }
    setTimeout(function () {                       // cuando ya se registraron los videos
      var all = [];
      $$('img').forEach(function (im) { if (im.closest('#pre')) return; im.loading = 'eager'; all.push(track(withCap(imgReady(im), 30000))); });
      $$('[data-bg]').forEach(function (el) { all.push(track(withCap(bgReady(el), 30000))); });
      PRE.tasks.forEach(function (p) { all.push(track(p)); });
      var fonts = document.fonts && document.fonts.ready; if (fonts) all.push(track(withCap(fonts, 15000)));
      all.push(track(new Promise(function (r) { if (document.readyState === 'complete') r(); else addEventListener('load', r, { once: true }); })));
      GATE.then(function () { setTimeout(finish, 90000); return Promise.all(all); }).then(finish);
    }, 0);
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
    vids.forEach(function (v) {
      load(v); v.preload = 'auto'; v.load();
      PRE.add(new Promise(function (r) {
        if (v.readyState >= 4) return r();
        var t = setTimeout(r, 75000);
        function ok() { clearTimeout(t); v.removeEventListener('canplaythrough', ok); v.removeEventListener('error', bad); r(); }
        function bad() { if ((v._e || 0) + 1 >= EXT.length) ok(); }   // si falla también el respaldo, no traba la carga
        v.addEventListener('canplaythrough', ok); v.addEventListener('error', bad);
      }));
      io.observe(v);
    });
    var rt; addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () {
        seen.forEach(function (v) {
          var want = (portrait() ? v.dataset.v9 : v.dataset.v16) + '.' + EXT[v._e || 0];
          if (v._src !== want) { var t = v.currentTime; load(v); v.addEventListener('loadedmetadata', function f() { v.removeEventListener('loadedmetadata', f); try { v.currentTime = t; } catch (e) {} }); play(v); }
        });
      }, 300);
    });
  })();
  /* ══════════ Video de la Home, desde YouTube (API oficial del reproductor) ══════════
     Horizontal (data-yt16) en escritorio, vertical (data-yt9, el Short) en celular vertical.
     Siempre arranca solo y sin sonido, sin subtítulos (se descarga el módulo de CC) y sin controles de YouTube.
     La pantalla de carga espera a que el video esté reproduciendo en HD (720p o más) — el máximo que da
     YouTube para el tamaño de pantalla — y recién ahí se levanta; el video vuelve al segundo 0. */
  (function () {
    var wrap = $('#inicio .hv-yt'); if (!wrap) return;
    var box = wrap.closest('section'), host = $('.hv-yt-in', wrap);
    var HD = /^(hd720|hd1080|hd1440|hd2160|highres)$/;
    var player = null, cur = null, user = false, muted = true, ready = false, hdOk, hdP = new Promise(function (r) { hdOk = r; });
    function portrait() { return innerWidth < innerHeight && innerWidth < 900; }
    function want() { return portrait() ? (wrap.dataset.yt9 || wrap.dataset.yt16) : wrap.dataset.yt16; }
    function ratio() { return cur === wrap.dataset.yt9 && cur !== wrap.dataset.yt16 ? 9 / 16 : 16 / 9; }
    function fit() {                                   // "cover": llena el encabezado sin barras negras
      var f = $('iframe', wrap); if (!f) return;
      var r = box.getBoundingClientRect(), w = r.width, h = r.height, k = ratio();
      if (!w || !h) return;
      var fw = w / h > k ? w : h * k, fh = fw / k;
      fw *= 1.02; fh *= 1.02;                          // un pelo más grande: no se ve ningún borde
      f.style.width = fw + 'px'; f.style.height = fh + 'px';
    }
    function noCC() {
      if (!player) return;
      try { player.unloadModule('captions'); player.unloadModule('cc'); } catch (e) {}
      try { player.setOption('captions', 'track', {}); } catch (e) {}
    }
    function best() { try { player.setPlaybackQuality('hd1080'); } catch (e) {} }
    function setState() {
      box.classList.toggle('is-muted', muted);
      box.classList.toggle('is-paused', user);
    }
    function play() { if (player && ready && !user) { try { player.playVideo(); } catch (e) {} } }
    function watchHD() {                               // resuelve la pantalla de carga cuando hay HD
      (function chk() {
        var q = ''; try { q = player.getPlaybackQuality(); } catch (e) {}
        if (HD.test(q)) return hdOk();
        setTimeout(chk, 200);
      })();
    }
    function build() {
      cur = want();
      player = new YT.Player(host, {
        host: 'https://www.youtube-nocookie.com', videoId: cur, width: '100%', height: '100%',
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3,
          cc_load_policy: 0, cc_lang_pref: 'none', modestbranding: 1, playsinline: 1, showinfo: 0, vq: 'hd1080',
          hl: document.documentElement.lang || 'es', origin: location.protocol.indexOf('http') === 0 ? location.origin : undefined },
        events: {
          onReady: function () {
            ready = true; var f = $('iframe', wrap);
            if (f) { f.setAttribute('tabindex', '-1'); f.title = 'Video oficial de Nodo Flex'; }
            player.mute(); best(); noCC(); fit(); play();
          },
          onApiChange: noCC,
          onPlaybackQualityChange: function (e) { if (HD.test(e.data)) hdOk(); },
          onStateChange: function (e) {
            if (e.data === 1) { noCC(); best(); wrap.classList.add('on'); watchHD(); }
            if (e.data === 0) { player.seekTo(0, true); player.playVideo(); }        // loop sin salto a otro video
          },
          onError: function () { hdOk(); }             // si YouTube no lo deja ver, queda la imagen fija
        }
      });
      [800, 2500, 6000].forEach(function (t) { setTimeout(noCC, t); });
    }
    // la pantalla de carga espera el HD (tope 75 s, como los otros videos)
    PRE.add(new Promise(function (r) { hdP.then(r); GATE.then(function () { setTimeout(r, 75000); }); }));
    PRE.ready(function () {
      if (!player || !ready) return;
      try { player.seekTo(0, true); } catch (e) {}
      if (document.body.dataset.view === 'home') play();
    });
    GATE.then(function () {
    if (window.YT && YT.Player) build();
    else {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) prev(); build(); };
      var sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.async = true;
      sc.onerror = function () { hdOk(); };
      document.head.appendChild(sc);
    }
    });
    $$('.js-vplay', box).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!player || !ready) return;
        if (user || player.getPlayerState() !== 1) { user = false; play(); } else { user = true; player.pauseVideo(); }
        setState();
      });
    });
    $$('.js-vmute', box).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!player || !ready) return;
        if (muted) {
          $$('video').forEach(function (v) { v.muted = true; });
          players.forEach(function (o) { if (!o.muted) setMuted(o, true); });
          player.unMute(); player.setVolume(100); muted = false; user = false; play();
        } else { player.mute(); muted = true; }
        setState();
      });
    });
    setState();
    addEventListener('resize', function () {
      fit();
      if (!player || !ready) return;
      var w = want(); if (w === cur) return;          // giró el celular → cambia a la otra versión
      cur = w; wrap.classList.remove('on'); player.loadVideoById({ videoId: w, startSeconds: 0 });
      if (muted) player.mute(); fit();
    }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
    if (RM) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!player || !ready) return;
        if (e.isIntersecting) play();
        else { try { player.pauseVideo(); } catch (x) {} if (!muted) { player.mute(); muted = true; setState(); } }
      });
    }, { threshold: 0.2 }).observe(box);
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
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); document.body.classList.remove('mopen'); var mb = $('#mbtn'); if (mb) mb.setAttribute('aria-expanded', 'false'); } });
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
    closeAll(); document.body.classList.remove('mopen'); var mb = $('#mbtn'); if (mb) mb.setAttribute('aria-expanded', 'false');
    // preselección del motivo de consulta en el formulario general
    if (a.dataset.perfil) {
      var fg = $('#form-general');
      if (fg && fg._pane) {
        var inv = /inversor/i.test(a.dataset.perfil); fg._pane(inv ? 'inversor' : 'empresa');
        if (!inv) { var rb = $('select[name="rubro"]', fg); if (rb) $$('option', rb).forEach(function (o) { if (o.textContent === a.dataset.perfil) rb.value = o.value || o.textContent; }); }
      }
    }
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
    var all = $$('.fld input[required], .fld textarea[required], .fld select[required]', form);
    // selector «Soy empresa / Soy inversor»: cada uno muestra sus campos; los ocultos no se validan ni se envían
    function pane(name) {
      $$('.ftab', form).forEach(function (t) { var on = t.dataset.pane === name; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      $$('.fpane', form).forEach(function (p) {
        var on = p.dataset.pane === name; p.hidden = !on;
        $$('input,select,textarea', p).forEach(function (f) { f.disabled = !on; if (!on) { var fl = f.closest('.fld'); if (fl) fl.classList.remove('bad'); } });
      });
      form.dataset.perfil = name;
      form.classList.remove('failed');
    }
    form._pane = pane;
    $$('.ftab', form).forEach(function (t) { t.addEventListener('click', function () { pane(t.dataset.pane); }); });
    if ($('.ftab', form)) pane(form.dataset.perfil || 'empresa');
    var req = all;
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
      var bad = req.filter(function (el) { return !el.disabled && !mark(el); });
      if (bad.length) { bad[0].focus(); return; }
      var hp = form.querySelector('[name="_honey"]'); if (hp && hp.value) return;
      var perfil = form.dataset.perfil;
      var data = { _subject: ASUNTO[perfil] || ASUNTO.general, _template: 'table', origen: 'Web Nodo · ' + perfil, idioma: EN() ? 'EN' : 'ES' };
      $$('input[name],textarea[name],select[name]', form).forEach(function (el) {
        if (el.name.charAt(0) === '_' || el.disabled) return;
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
