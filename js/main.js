(function () {
  'use strict';

  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Тема: день / ночь ---------- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function currentTheme() {
    return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
  }
  function applyThemeMeta() {
    var dark = currentTheme() === 'dark';
    var btn = document.getElementById('themeToggle');
    btn.setAttribute('aria-label', dark ? 'Включить дневную тему' : 'Включить ночную тему');
    btn.setAttribute('title', dark ? 'Дневная тема' : 'Ночная тема');
  }
  document.getElementById('themeToggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('essa-theme', next);
    applyThemeMeta();
  });
  mq.addEventListener && mq.addEventListener('change', applyThemeMeta);
  applyThemeMeta();

  /* ---------- Шапка и мобильное меню ---------- */
  var header = document.querySelector('.header');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1024) setMenu(false); });

  /* ---------- Подсветка активного раздела ---------- */
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) spy.observe(s);
    });
  }

  /* ---------- Появление блоков и счётчики ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUp(el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = target + suffix; return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        en.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Объекты ---------- */
  var data = (window.PROJECTS || []).slice().sort(function (a, b) { return b.y - a.y; });
  var list = document.getElementById('projectsList');
  var empty = document.getElementById('projectsEmpty');
  var moreBtn = document.getElementById('showMore');
  var search = document.getElementById('search');
  var chips = document.getElementById('chips');
  var CAT = { edu: 'Образование', civil: 'Социальные и коммерческие', housing: 'Жилые дома', eng: 'Инженерные сети' };
  var ROLE = { gp: 'Генеральный подрядчик', sub: 'Субподрядчик', design: 'Генпроектировщик / субподрядчик' };
  var PAGE = 9, state = { filter: 'all', q: '', shown: PAGE };

  chips.querySelectorAll('.chip').forEach(function (c) {
    var f = c.dataset.filter;
    c.querySelector('.chip__count').textContent = f === 'all' ? data.length : data.filter(function (p) { return p.cat === f; }).length;
  });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var q = state.q.trim().toLowerCase();
    var items = data.filter(function (p) {
      if (state.filter !== 'all' && p.cat !== state.filter) return false;
      if (!q) return true;
      return (p.title + ' ' + p.place + ' ' + p.client + ' ' + p.y).toLowerCase().indexOf(q) !== -1;
    });
    var visible = items.slice(0, state.shown);
    list.innerHTML = visible.map(function (p) {
      return '<article class="project project--' + p.cat + '">' +
        '<div class="project__top"><span class="project__cat">' + CAT[p.cat] + '</span>' +
        '<time class="project__date">' + p.m + ' ' + p.y + '</time></div>' +
        '<h3 class="project__title">' + esc(p.title) + '</h3>' +
        '<dl class="project__meta">' +
        '<div><dt>Место</dt><dd>' + esc(p.place) + '</dd></div>' +
        '<div><dt>Заказчик</dt><dd>' + esc(p.client) + '</dd></div>' +
        '</dl>' +
        '<span class="project__role">' + ROLE[p.role] + '</span>' +
        '</article>';
    }).join('');
    empty.hidden = items.length > 0;
    moreBtn.parentNode.hidden = items.length <= state.shown;
    moreBtn.textContent = 'Показать ещё (' + Math.max(items.length - state.shown, 0) + ')';
  }

  chips.addEventListener('click', function (e) {
    var c = e.target.closest('.chip');
    if (!c) return;
    chips.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('is-active', x === c); x.setAttribute('aria-pressed', String(x === c)); });
    state.filter = c.dataset.filter;
    state.shown = PAGE;
    render();
  });
  var tId;
  search.addEventListener('input', function () {
    clearTimeout(tId);
    tId = setTimeout(function () { state.q = search.value; state.shown = PAGE; render(); }, 150);
  });
  moreBtn.addEventListener('click', function () { state.shown += PAGE; render(); });
  render();

  /* ---------- Форма заявки ---------- */
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  var via = 'whatsapp';
  form.querySelectorAll('button[type="submit"]').forEach(function (b) {
    b.addEventListener('click', function () { via = b.dataset.via; });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var name = f.name.value.trim(), phone = f.phone.value.trim();
    [f.name, f.phone].forEach(function (i) { i.classList.toggle('is-invalid', !i.value.trim()); });
    if (!name || !phone) {
      note.textContent = 'Пожалуйста, укажите имя и телефон.';
      note.className = 'form__note is-error';
      return;
    }
    var text = 'Заявка с сайта Элитстройсервис-Актобе\n' +
      'Имя: ' + name + '\nТелефон: ' + phone + '\nТип работ: ' + f.type.value +
      (f.message.value.trim() ? '\nОписание: ' + f.message.value.trim() : '');
    if (via === 'email') {
      window.location.href = 'mailto:essa-aktobe@mail.ru?subject=' + encodeURIComponent('Заявка с сайта') + '&body=' + encodeURIComponent(text);
    } else {
      window.open('https://wa.me/77089897896?text=' + encodeURIComponent(text), '_blank', 'noopener');
    }
    note.textContent = 'Спасибо! Сообщение подготовлено — подтвердите отправку в открывшемся приложении.';
    note.className = 'form__note is-ok';
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
