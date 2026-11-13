(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- Тема ---------- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var themeBtn = $('#themeToggle');
  function theme() { return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light'); }
  function syncTheme() {
    var dark = theme() === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Включить дневную тему' : 'Включить ночную тему');
    themeBtn.title = dark ? 'Дневная тема' : 'Ночная тема';
    $$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', dark ? '#000000' : '#fbfbfd'); });
  }
  themeBtn.addEventListener('click', function () {
    var next = theme() === 'dark' ? 'light' : 'dark';
    root.classList.add('theme-anim');
    root.setAttribute('data-theme', next);
    store.set('essa-theme', next);
    syncTheme();
    setTimeout(function () { root.classList.remove('theme-anim'); }, 400);
  });
  if (mq.addEventListener) mq.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- Меню ---------- */
  var burger = $('#burger'), menu = $('#menu'), nav = $('.nav');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    root.classList.toggle('menu-lock', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1024) setMenu(false); });

  /* ---------- Прокрутка: прогресс, шапка, параллакс, «проявление» текста ---------- */
  var bar = $('#progress'), heroImg = $('#heroImg'), scrub = $('#scrub'), words = [];
  if (scrub && !reduce) {
    scrub.innerHTML = scrub.textContent.trim().split(/\s+/).map(function (w) { return '<span>' + w + '</span>'; }).join(' ');
    words = $$('span', scrub);
    scrub.classList.add('is-scrub');
  }
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    nav.classList.toggle('is-scrolled', y > 10);
    if (!reduce && heroImg && y < innerHeight * 1.2) {
      heroImg.style.transform = 'translate3d(0,' + (y * 0.12) + 'px,0) scale(' + (1.04 + y * 0.00008) + ')';
    }
    if (words.length) {
      var r = scrub.getBoundingClientRect();
      var p = (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35);
      var lit = Math.round(Math.max(0, Math.min(1, p)) * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < lit);
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Активный пункт меню ---------- */
  var links = $$('a[href^="#"]', menu);
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Появление и счётчики ---------- */
  function countUp(el) {
    var target = +el.dataset.count;
    if (reduce) { el.textContent = target; return; }
    var t0 = null;
    (function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / 1600, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  function observeReveal(els) {
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        $$('[data-count]', en.target).concat(en.target.matches('[data-count]') ? [en.target] : []).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  observeReveal($$('.reveal'));
  requestAnimationFrame(function () { root.classList.add('is-loaded'); });

  /* ---------- Объекты ---------- */
  var MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  var data = (window.PROJECTS || []).slice().sort(function (a, b) { return (b.y - a.y) || (MONTHS.indexOf(b.m) - MONTHS.indexOf(a.m)); });
  var list = $('#projectsList'), empty = $('#projectsEmpty'), more = $('#showMore'), search = $('#search'), tabs = $('#tabs');
  var pill = $('.tabs__pill', tabs);
  var CAT = { edu: 'Образование', civil: 'Общественные здания', housing: 'Жилые дома', eng: 'Инженерные сети' };
  var ROLE = { gp: 'Генеральный подрядчик', sub: 'Субподрядчик', design: 'Генпроектировщик / субподрядчик' };
  var PAGE = window.innerWidth >= 1600 ? 8 : 6;
  var st = { f: 'all', q: '', n: PAGE };

  $$('.tab', tabs).forEach(function (t) {
    var f = t.dataset.filter;
    $('sup', t).textContent = f === 'all' ? data.length : data.filter(function (p) { return p.cat === f; }).length;
  });
  function movePill() {
    var a = $('.tab.is-active', tabs);
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var q = st.q.trim().toLowerCase();
    var items = data.filter(function (p) {
      return (st.f === 'all' || p.cat === st.f) &&
        (!q || (p.title + ' ' + p.place + ' ' + p.client + ' ' + p.y + ' ' + CAT[p.cat]).toLowerCase().indexOf(q) !== -1);
    });
    list.innerHTML = items.slice(0, st.n).map(function (p, i) {
      return '<article class="pcard pcard--' + p.cat + '" style="--d:' + (i % PAGE) * 40 + 'ms">' +
        '<div class="pcard__head"><span class="pcard__year">' + p.y + '</span><span class="pcard__month">' + p.m + '</span></div>' +
        '<p class="pcard__cat">' + CAT[p.cat] + '</p>' +
        '<h3 class="pcard__title">' + esc(p.title) + '</h3>' +
        '<p class="pcard__place"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>' + esc(p.place) + '</p>' +
        '<details class="pcard__more"><summary>Заказчик и статус</summary>' +
        '<p>' + esc(p.client) + '</p><span class="pcard__role">' + ROLE[p.role] + '</span></details>' +
        '</article>';
    }).join('');
    empty.hidden = items.length > 0;
    more.parentNode.hidden = items.length <= st.n;
    more.textContent = 'Показать ещё ' + Math.min(PAGE, Math.max(items.length - st.n, 0)) + ' из ' + Math.max(items.length - st.n, 0);
  }

  tabs.addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t) return;
    $$('.tab', tabs).forEach(function (x) { var on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
    t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    st.f = t.dataset.filter; st.n = PAGE;
    movePill(); render();
  });
  var tid;
  search.addEventListener('input', function () {
    clearTimeout(tid);
    tid = setTimeout(function () { st.q = search.value; st.n = PAGE; render(); }, 150);
  });
  more.addEventListener('click', function () { st.n += PAGE; render(); });
  window.addEventListener('resize', movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  movePill(); render();

  /* ---------- Галерея и просмотр фото ---------- */
  var photos = window.GALLERY || [];
  var lb = $('#lightbox');
  if (photos.length >= 3) {
    var g = $('#galleryGrid');
    g.innerHTML = photos.map(function (ph, i) {
      return '<button class="gallery__item reveal" type="button" data-i="' + i + '">' +
        '<img src="' + (ph.thumb || ph.src) + '" alt="' + esc(ph.caption || '') + '" loading="lazy">' +
        (ph.caption ? '<span>' + esc(ph.caption) + '</span>' : '') + '</button>';
    }).join('');
    $('#gallery').hidden = false;
    observeReveal($$('.gallery__item', g));
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.gallery__item');
      if (b) openLb(photos[+b.dataset.i]);
    });
  }
  function openLb(ph) {
    if (!lb.showModal) { window.open(ph.src, '_blank'); return; }
    $('img', lb).src = ph.src; $('img', lb).alt = ph.caption || '';
    $('.lightbox__caption', lb).textContent = ph.caption || '';
    lb.showModal();
  }
  $('.lightbox__close', lb).addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  $('.hero__media').addEventListener('click', function () { if (photos[0]) openLb(photos[0]); });

  /* ---------- Бегущая строка заказчиков ---------- */
  var track = $('.marquee__track');
  if (track && !reduce) {
    track.innerHTML += track.innerHTML.replace(/<li>/g, '<li aria-hidden="true">');
    track.classList.add('is-running');
  }

  /* ---------- Форма ---------- */
  var form = $('#contactForm'), note = $('#formNote'), via = 'whatsapp';
  var phone = form.elements.phone;
  phone.addEventListener('input', function () {
    var d = phone.value.replace(/\D/g, '');
    if (!d) { phone.value = ''; return; }
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var o = '+7';
    if (d.length > 1) o += ' (' + d.slice(1, 4);
    if (d.length >= 4) o += ')';
    if (d.length > 4) o += ' ' + d.slice(4, 7);
    if (d.length > 7) o += '-' + d.slice(7, 9);
    if (d.length > 9) o += '-' + d.slice(9, 11);
    phone.value = o;
  });
  $$('button[type="submit"]', form).forEach(function (b) { b.addEventListener('click', function () { via = b.dataset.via; }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, name = f.name.value.trim(), tel = f.phone.value.replace(/\D/g, '');
    f.name.classList.toggle('is-invalid', !name);
    f.phone.classList.toggle('is-invalid', tel.length < 11);
    if (!name || tel.length < 11) {
      note.textContent = 'Укажите имя и номер телефона полностью.';
      note.className = 'form__note is-error';
      (!name ? f.name : f.phone).focus();
      return;
    }
    var text = 'Заявка с сайта Элитстройсервис-Актобе\nИмя: ' + name + '\nТелефон: ' + f.phone.value +
      '\nТип работ: ' + f.type.value + (f.message.value.trim() ? '\nО проекте: ' + f.message.value.trim() : '');
    if (via === 'email') {
      location.href = 'mailto:essa-aktobe@mail.ru?subject=' + encodeURIComponent('Заявка с сайта') + '&body=' + encodeURIComponent(text);
    } else {
      window.open('https://wa.me/77089897896?text=' + encodeURIComponent(text), '_blank', 'noopener');
    }
    note.textContent = 'Готово! Подтвердите отправку в открывшемся приложении.';
    note.className = 'form__note is-ok';
  });

  $('#year').textContent = new Date().getFullYear();
})();
