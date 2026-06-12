/* ============================================================
   SILVERNEST HOME CARE — Main JS
   Nav scroll, mobile drawer, scroll animations, form handling
   ============================================================ */

'use strict';

/* ── NAV ──────────────────────────────────────────────────────── */
(function initNav() {
  const nav       = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const drawer    = document.querySelector('.nav__drawer');
  const overlay   = document.querySelector('.nav__overlay');

  if (!nav) return;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  function openDrawer() {
    drawer?.classList.add('open');
    overlay?.classList.add('open');
    hamburger?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
    hamburger?.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', () => {
    drawer?.classList.contains('open') ? closeDrawer() : openDrawer();
  });

  overlay?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('.nav__drawer-link').forEach(l => l.addEventListener('click', closeDrawer));
})();

/* ── SCROLL ANIMATIONS ────────────────────────────────────────── */
(function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => io.observe(el));
})();

/* ── COUNTER ANIMATION ────────────────────────────────────────── */
(function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target   = parseFloat(el.dataset.count);
      const suffix   = el.dataset.suffix || '';
      const prefix   = el.dataset.prefix || '';
      const duration = 1600;
      const start    = performance.now();

      function update(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => io.observe(el));
})();

/* ── TOAST ────────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  let toast = document.getElementById('sn-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sn-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast--${type} visible`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('visible'), 4500);
}

/* ── FORM SUBMISSION ──────────────────────────────────────────── */
function initForm(formId, scriptUrl) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Stamp load time for bot time-check
  const loadedField = form.querySelector('[name="form_loaded"]');
  if (loadedField) loadedField.value = Date.now();

  // Clear error state on input
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => field.closest('.form-group')?.classList.remove('has-error'));
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const origText  = submitBtn?.textContent || 'Submit';

    // Client validation
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        valid = false;
        markError(field, 'This field is required.');
      }
    });

    const emailField = form.querySelector('[type="email"]');
    if (emailField?.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
      valid = false;
      markError(emailField, 'Please enter a valid email address.');
    }

    if (!valid) {
      form.querySelector('.has-error [required], .has-error [type="email"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

    const payload = new URLSearchParams(new FormData(form));
    const url = scriptUrl || form.dataset.scriptUrl || '';

    // Dev mode — no script URL configured yet
    if (!url || url.includes('YOUR_APPS_SCRIPT_URL')) {
      console.log('[SilverNest dev] Payload:', Object.fromEntries(new FormData(form)));
      await delay(900);
      onSuccess(form, loadedField, submitBtn, origText);
      return;
    }

    try {
      const res  = await fetch(url, { method: 'POST', body: payload });
      const json = await res.json();
      if (json.status === 'success' || json.status === 'ok') {
        onSuccess(form, loadedField, submitBtn, origText);
      } else {
        showToast(json.message || 'Something went wrong. Please try again.', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      }
    } catch {
      showToast('Network error — please call us directly or try again.', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
    }
  });
}

function markError(field, message) {
  const group = field.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  let err = group.querySelector('.form-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'form-error';
    group.appendChild(err);
  }
  err.textContent = message;
}

function onSuccess(form, loadedField, submitBtn, origText) {
  const redirect = form.dataset.redirect;
  if (redirect) {
    window.location.href = redirect;
  } else {
    showToast('Thank you! We\'ll be in touch within 24 hours.', 'success');
    form.reset();
    if (loadedField) loadedField.value = Date.now();
  }
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── ACTIVE NAV HIGHLIGHT ─────────────────────────────────────── */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link, .nav__drawer-link').forEach(link => {
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (href === page || (page === '' && href === 'index.html')) {
      link.style.color = 'var(--sage)';
    }
  });
})();
