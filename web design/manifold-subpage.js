(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('[data-nav]');
  const faq = document.querySelector('#faq, #questions');

  const initSectionJoins = () => {
    const joins = [...document.querySelectorAll('.jonctions > .jonction')];
    const sections = [...document.querySelectorAll('main section')]
      .filter((section) => section.getClientRects().length);
    const joinedSections = sections.filter((section) => section.matches('[data-jonction="feuille"]'));
    if (!joins.length || !joinedSections.length) return;

    const getTarget = (join) => {
      const previous = join.dataset.haut && document.getElementById(join.dataset.haut);
      if (previous) return { element: previous, edge: 'bottom' };

      const isEnd = join.dataset.feuille === 'haut';
      if (isEnd) {
        const initialTop = Number.parseFloat(join.style.top);
        if (Number.isFinite(initialTop)) {
          let closest = null;
          let closestDistance = Infinity;
          sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            ['top', 'bottom'].forEach((edge) => {
              const distance = Math.abs(rect[edge] + window.scrollY - initialTop);
              if (distance < closestDistance) {
                closest = { element: section, edge };
                closestDistance = distance;
              }
            });
          });
          if (closest) return closest;
        }
      }

      return {
        element: isEnd ? sections[sections.length - 1] : joinedSections[0],
        edge: isEnd ? 'bottom' : 'top'
      };
    };
    const targets = joins.map((join) => getTarget(join));
    const update = () => {
      const positions = joins.map((join, index) => {
        const target = targets[index];
        if (!target.element) return null;
        const rect = target.element.getBoundingClientRect();
        return [join, `${Math.round((rect[target.edge] + window.scrollY) * 100) / 100}px`];
      });
      positions.forEach((position) => {
        if (position && position[0].style.top !== position[1]) {
          position[0].style.top = position[1];
        }
      });
    };
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule, { once: true });
    if (document.fonts) document.fonts.ready.then(schedule);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(schedule);
      const main = document.querySelector('main');
      if (main) observer.observe(main);
      new Set(targets.map((target) => target.element).filter(Boolean)).forEach((target) => {
        observer.observe(target);
      });
    }
  };

  initSectionJoins();

  const initAboutTimeline = () => {
    const list = document.querySelector('#tlList');
    const bigYear = document.querySelector('#bigYear');
    if (!list || !bigYear) return;

    const items = [...list.querySelectorAll('.tl-item')];
    if (!items.length) return;

    const years = items.map((item) => item.querySelector('.tl-year').textContent.trim());
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeIndex = -2;
    let displayedYear = bigYear.textContent.trim();
    let yearAnimation = null;
    let yearRevision = 0;
    let frame = 0;

    const setYear = (year) => {
      if (year === displayedYear) return;
      displayedYear = year;
      yearRevision += 1;
      const revision = yearRevision;
      yearAnimation?.cancel();
      yearAnimation = null;

      if (motionPreference.matches) {
        bigYear.textContent = year;
        return;
      }

      if (bigYear.textContent.trim() === year) return;
      yearAnimation = bigYear.animate(
        [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-40%)', opacity: 0 }],
        { duration: 150, easing: 'ease-out', fill: 'forwards' }
      );
      yearAnimation.onfinish = () => {
        if (revision !== yearRevision) return;
        bigYear.textContent = year;
        yearAnimation = bigYear.animate(
          [{ transform: 'translateY(40%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 150, easing: 'ease-out', fill: 'forwards' }
        );
        yearAnimation.onfinish = () => {
          if (revision === yearRevision) yearAnimation = null;
        };
      };
    };

    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.5;
      const listRect = list.getBoundingClientRect();
      const itemTops = items.map((item) => item.getBoundingClientRect().top);
      const progress = Math.min(Math.max(readingLine - listRect.top, 0), listRect.height);
      let nextIndex = -1;
      itemTops.forEach((top, index) => {
        if (top <= readingLine) nextIndex = index;
      });

      list.style.setProperty('--progress', `${progress}px`);
      list.classList.toggle('is-progressing', progress > 0);
      if (nextIndex !== activeIndex) {
        items.forEach((item, index) => {
          item.classList.toggle('is-active', index === nextIndex);
          item.classList.toggle('is-passed', index < nextIndex);
        });
        setYear(years[Math.max(nextIndex, 0)]);
        activeIndex = nextIndex;
      }
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    motionPreference.addEventListener('change', (event) => {
      if (!event.matches || !yearAnimation) return;
      yearRevision += 1;
      yearAnimation.cancel();
      yearAnimation = null;
      bigYear.textContent = displayedYear;
    });

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(scheduleUpdate).observe(list);
    }
    scheduleUpdate();
  };

  initAboutTimeline();

  const initClocks = () => {
    const clocks = [...document.querySelectorAll('[data-tz]')];
    if (!clocks.length) return;
    const formatters = new Map();
    const update = () => {
      const now = new Date();
      clocks.forEach((clock) => {
        const zone = clock.dataset.tz;
        let formatter = formatters.get(zone);
        if (!formatter) {
          formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: zone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
          });
          formatters.set(zone, formatter);
        }
        const [hours, minutes] = formatter.format(now).split(':');
        clock.innerHTML = `<span aria-hidden="true">${hours}<span class="c">:</span>${minutes}</span><span class="sr-only"> ${hours}:${minutes}</span>`;
      });
    };
    update();
    window.setInterval(update, 30000);
  };

  initClocks();

  const updateNav = () => {
    if (!nav) return;
    nav.classList.toggle('is-pill', window.scrollY > 24);
    const midpoint = faq
      ? faq.getBoundingClientRect().top + window.scrollY + faq.offsetHeight / 2
      : Infinity;
    nav.classList.toggle('is-cede', window.scrollY >= midpoint);
  };

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  const menu = document.querySelector('#menu');
  const burger = document.querySelector('[data-burger]');
  const setMenuOpen = (open) => {
    burger?.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('is-menu', open);
    menu?.classList.toggle('is-open', open);
  };
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    setMenuOpen(open);
    if (open) menu?.querySelector('a, button')?.focus();
  });

  menu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && burger?.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      burger.focus();
      return;
    }
    if (event.key !== 'Tab' || !document.documentElement.classList.contains('is-menu')) return;
    const focusables = [...(menu?.querySelectorAll('a[href], button:not([disabled])') || [])]
      .filter((element) => element.getClientRects().length);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (burger?.getAttribute('aria-expanded') !== 'true') return;
    if (menu?.contains(event.target) || burger?.contains(event.target)) return;
    setMenuOpen(false);
  });

  const navItems = [...document.querySelectorAll('.nav__item[data-sub]')];
  const closeNavItems = (except) => {
    navItems.forEach((item) => {
      const open = item === except;
      item.classList.toggle('is-open', open);
      item.querySelector('.nav__sub-btn')?.setAttribute('aria-expanded', String(open));
    });
  };

  navItems.forEach((item) => {
    const button = item.querySelector('.nav__sub-btn');
    const setOpen = (open) => closeNavItems(open ? item : null);
    button?.addEventListener('click', () => setOpen(!item.classList.contains('is-open')));
    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && matchMedia('(hover:hover)').matches) setOpen(true);
    });
    item.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && matchMedia('(hover:hover)').matches && !item.contains(document.activeElement)) setOpen(false);
    });
    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget)) setOpen(false);
    });
  });

  nav?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openItem = navItems.find((item) => item.classList.contains('is-open'));
    if (!openItem) return;
    closeNavItems(null);
    openItem.querySelector('.nav__sub-btn')?.focus();
  });

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest?.('.nav__item[data-sub]')) return;
    closeNavItems(null);
  });

  document.querySelectorAll('[data-menu-sub]').forEach((button) => {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (panel) panel.hidden = !open;
    });
  });

  const logoLink = nav?.querySelector('.nav__logo');
  const logo = logoLink?.querySelector('img');
  if (logoLink && logo) {
    logoLink.setAttribute('aria-label', 'Manifold home');
    logo.src = 'assets/img/manifold-embossed-emblem-2000.webp';
    logo.alt = '';

    document
      .querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')
      .forEach((link) => link.remove());
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/webp';
    favicon.href = logo.src;
    document.head.append(favicon);
    const touchIcon = favicon.cloneNode();
    touchIcon.rel = 'apple-touch-icon';
    document.head.append(touchIcon);
  }

  const footer = document.querySelector('.pied__logo');
  const halves = [];
  if (footer) {
    const mark = document.createElement('div');
    mark.className = 'manifold-footer-wordmark';
    mark.setAttribute('role', 'img');
    mark.setAttribute('aria-label', 'Manifold');
    [['Mani', 'manifold-footer-half manifold-footer-half--left'], ['fold', 'manifold-footer-half manifold-footer-half--right']]
      .forEach(([word, className]) => {
        const half = document.createElement('span');
        half.className = className;
        half.setAttribute('aria-hidden', 'true');
        half.textContent = word;
        mark.append(half);
        halves.push(half);
      });
    footer.classList.add('manifold-footer-brand');
    footer.replaceChildren(mark);
  }

  let frame = 0;
  const updateFooter = () => {
    if (!footer || !halves.length || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const viewportHeight = window.innerHeight;
      const brandTop = footer.getBoundingClientRect().top + window.scrollY;
      const pageBottom = document.documentElement.scrollHeight - viewportHeight;
      const start = brandTop - viewportHeight * 0.86;
      const end = Math.min(brandTop - viewportHeight * 0.21, pageBottom);
      const raw = reduceMotion
        ? 1
        : end > start
          ? Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)))
          : Number(window.scrollY >= pageBottom - 1);
      const progress = raw * raw * (3 - 2 * raw);
      const spread = 1 - progress;
      halves[0].style.transform = reduceMotion ? 'none' : `translate3d(${-window.innerWidth * 0.5 * spread}px,0,0) rotate(${-12 * spread}deg)`;
      halves[1].style.transform = reduceMotion ? 'none' : `translate3d(${window.innerWidth * 0.5 * spread}px,0,0) rotate(${12 * spread}deg)`;
      const green = Math.round(164 + 91 * progress);
      const channel = Math.round(239 + 16 * progress);
      const color = `rgb(${green} ${channel} ${Math.round(192 + 63 * progress)})`;
      halves.forEach((half) => { half.style.color = color; });
    });
  };

  window.addEventListener('scroll', updateFooter, { passive: true });
  window.addEventListener('resize', updateFooter, { passive: true });
  updateFooter();

  if (reduceMotion) return;

  const characterObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in', 'is-char-revealed');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })
    : null;

  const prepareCharacterReveal = (element) => {
    if (!element || element.dataset.charRevealReady === 'true') return;
    element.dataset.charRevealReady = 'true';
    element.classList.add('char-reveal-heading');
    element.classList.remove('is-in');

    if (!element.hasAttribute('aria-label')) {
      element.setAttribute('aria-label', element.textContent.replace(/\s+/g, ' ').trim());
    }

    let order = 0;
    const wrapText = (parent) => {
      [...parent.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!node.textContent.trim()) return;
          const fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/u).forEach((part) => {
            if (!part) return;
            if (/^\s+$/u.test(part)) {
              fragment.append(document.createTextNode(part));
              return;
            }

            const word = document.createElement('span');
            word.className = 'char-reveal-word';
            word.setAttribute('aria-hidden', 'true');
            [...part].forEach((character) => {
              const letter = document.createElement('span');
              letter.className = 'char-reveal';
              letter.textContent = character;
              letter.style.setProperty('--char-order', Math.min(order, 48));
              order += 1;
              word.append(letter);
            });
            fragment.append(word);
          });
          node.replaceWith(fragment);
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE || node.matches('svg, .etoile, .sr-only, [aria-hidden="true"]')) return;
        wrapText(node);
      });
    };

    wrapText(element);
    if (characterObserver) characterObserver.observe(element);
    else element.classList.add('is-in', 'is-char-revealed');
  };

  document.querySelectorAll('main h1, main h2, .cta h2').forEach((heading) => prepareCharacterReveal(heading));

  document.querySelectorAll('main .lead, main .head__i, main .head__side, .pied-revele .cta__side, .pied-revele .lead').forEach((element) => {
    if (!element.hasAttribute('data-reveal')) element.setAttribute('data-reveal', '');
  });

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    : null;

  document.querySelectorAll('[data-reveal]:not(.char-reveal-heading)').forEach((element, index) => {
    element.classList.remove('is-in');
    element.style.setProperty('--d', `${(index % 5) * 70}ms`);
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-in');
  });

  const initContactForm = () => {
    const form = document.getElementById('fm');
    if (!form) return;

    const messages = document.getElementById('fm-messages');
    const messageFor = (key) => {
      const node = messages?.content.querySelector(`[data-m="${key}"]`);
      return node ? node.textContent : '';
    };

    const fields = {
      prenom: form.querySelector('[name="prenom"]'),
      nom: form.querySelector('[name="nom"]'),
      email: form.querySelector('[name="email"]'),
      telephone: form.querySelector('[name="telephone"]'),
      structure: form.querySelector('[name="structure"]'),
      message: form.querySelector('[name="message"]')
    };

    const setError = (name, text) => {
      const error = form.querySelector(`#fm-e-${name}`);
      if (error) error.textContent = text;
      const field = fields[name] || form.querySelector(`[name="${name}"]`);
      if (field) {
        if (text) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
      }
    };

    const clearErrors = () => {
      ['prenom', 'nom', 'email', 'telephone', 'structure', 'budget', 'message'].forEach((name) => setError(name, ''));
    };

    const value = (name) => (fields[name]?.value || '').trim();
    const budget = () => form.querySelector('input[name="budget"]:checked')?.value || '';

    const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));

    const collect = () => ({
      prenom: value('prenom'),
      nom: value('nom'),
      email: value('email'),
      indicatif: form.querySelector('[name="indicatif"]')?.value || '',
      telephone: value('telephone'),
      structure: value('structure'),
      besoins: [...form.querySelectorAll('input[name="besoins"]:checked')].map((input) => input.value),
      budget: budget(),
      message: value('message'),
      actualites: form.querySelector('[name="actualites"]')?.checked || false
    });

    const save = (payload) => {
      const entry = {
        ...payload,
        id: `MNF-${String(Date.now()).slice(-6)}`,
        createdAt: new Date().toISOString()
      };
      try {
        const existing = JSON.parse(localStorage.getItem('manifold_contact_enquiries') || '[]');
        existing.push(entry);
        localStorage.setItem('manifold_contact_enquiries', JSON.stringify(existing));
      } catch (error) {
        return entry;
      }
      return entry;
    };

    const showSuccess = (entry) => {
      const success = document.createElement('div');
      success.className = 'fm fm__fait';
      success.setAttribute('role', 'status');
      success.tabIndex = -1;
      const name = entry.prenom || entry.nom || 'there';
      success.innerHTML = `
        <p class="fm__t">Message sent</p>
        <p class="fm__qui">Thank you, ${escapeHtml(name)}.</p>
        <p>Your message has been recorded. We will get back to you within 1–2 working days.</p>
        <button class="btn btn--papaye" type="button">Send another message<span class="btn__arrow" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.6"></path></svg></span></button>
      `;
      form.hidden = true;
      form.after(success);
      success.focus();
      success.querySelector('button')?.addEventListener('click', () => {
        success.remove();
        form.hidden = false;
        form.reset();
        clearErrors();
        form.querySelector('[name="prenom"]')?.focus();
      });
    };

    form.addEventListener('input', (event) => {
      const name = event.target.name;
      if (name && ['prenom', 'nom', 'email', 'telephone', 'structure', 'budget', 'message'].includes(name)) {
        setError(name, '');
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearErrors();

      const honeypot = form.querySelector('[name="piege"]');
      if (honeypot?.value) return;

      let valid = true;
      if (!value('prenom')) { setError('prenom', messageFor('prenom')); valid = false; }
      if (!value('nom')) { setError('nom', messageFor('nom')); valid = false; }
      if (!value('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) {
        setError('email', messageFor('email'));
        valid = false;
      }
      if (!value('telephone')) {
        setError('telephone', messageFor('tel-vide'));
        valid = false;
      } else if (value('telephone').replace(/\D/g, '').length < 6) {
        setError('telephone', messageFor('tel'));
        valid = false;
      }
      if (!value('structure')) { setError('structure', messageFor('structure')); valid = false; }
      if (!budget()) { setError('budget', messageFor('budget')); valid = false; }
      if (!value('message')) { setError('message', messageFor('message')); valid = false; }

      if (!valid) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }

      showSuccess(save(collect()));
    });
  };

  initContactForm();
})();

// Infinite auto-scroll for .ag-vie.is-auto strips (clears inline transforms)
(() => {
  const init = () => {
    document.querySelectorAll('.ag-vie.is-auto .ag-vie__piste').forEach((piste) => {
      piste.style.transform = '';
      const distance = (piste.scrollWidth / 2) || piste.scrollWidth || 1;
      const duration = Math.max(20, Math.min(80, distance / 60));
      piste.style.setProperty('--ag-vie-duration', duration + 's');
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  window.addEventListener('load', init, { once: true });
})();

// Scroll-tied text fill for .ecriture__fantome (progresses with scroll)
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getItems = () => Array.from(document.querySelectorAll('.ecriture__mot')).filter(m => m.querySelector('.ecriture__fantome'));
  let items = getItems();
  if (!items.length) return;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const update = () => {
    if (!items.length) items = getItems();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    const start = vh * 0.85;
    const end = vh * 0.35;
    items.forEach((mot) => {
      const fantome = mot.querySelector('.ecriture__fantome');
      if (!fantome) return;
      if (reduceMotion) {
        fantome.style.setProperty('--ecriture-fill', '100%');
        return;
      }
      const rect = mot.getBoundingClientRect();
      const p = clamp01((start - rect.top) / Math.max(1, start - end));
      fantome.style.setProperty('--ecriture-fill', (p * 100).toFixed(2) + '%');
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  const init = () => { items = getItems(); update(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  window.addEventListener('load', init, { once: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

// Contact form wizard: one question at a time with pill inputs/options
(() => {
  const form = document.querySelector('form.fm--wizard');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.fm__step'));
  const prevBtn = form.querySelector('[data-fm-prev]');
  const nextBtn = form.querySelector('[data-fm-next]');
  const currentEl = form.querySelector('[data-fm-current]');
  const totalEl = form.querySelector('[data-fm-total]');
  const bar = form.querySelector('[data-fm-bar]');
  const messagesTpl = form.querySelector('#fm-messages');
  const failBox = form.querySelector('.fm__echec');
  const successBox = form.querySelector('.fm__success');

  let index = 0;
  if (totalEl) totalEl.textContent = String(steps.length);

  const getMsg = (key, fallback) => {
    if (!messagesTpl) return fallback;
    const root = messagesTpl.content || messagesTpl;
    const p = root.querySelector ? root.querySelector('[data-m="' + key + '"]') : null;
    return p ? p.textContent.trim() : fallback;
  };

  const setError = (step, message) => {
    const err = step.querySelector('.fm__err');
    if (!err) return;
    if (message) {
      err.textContent = message;
      err.classList.add('is-show');
    } else {
      err.textContent = '';
      err.classList.remove('is-show');
    }
  };

  const clearStepErrors = (step) => {
    setError(step, '');
    step.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  };

  const validateStep = (step) => {
    clearStepErrors(step);
    const req = step.dataset.required;
    if (!req) return true;

    if (req.indexOf(':checked') !== -1) {
      const ok = !!step.querySelector(req);
      if (!ok) {
        const nameEl = step.querySelector('input[type="radio"], input[type="checkbox"]');
        const name = nameEl ? nameEl.name : '';
        const key = name === 'budget' ? 'budget' : name;
        setError(step, getMsg(key, 'Please choose an option.'));
      }
      return ok;
    }

    const field = step.querySelector(req) || step.querySelector('input, textarea, select');
    if (!field) return true;
    const val = (field.value || '').trim();
    if (!val) {
      field.setAttribute('aria-invalid', 'true');
      const name = field.name || field.id || '';
      let key = 'required';
      if (name === 'prenom') key = 'prenom';
      else if (name === 'nom') key = 'nom';
      else if (name === 'email') key = 'email';
      else if (name === 'telephone') key = 'tel-vide';
      else if (name === 'structure') key = 'structure';
      else if (name === 'message') key = 'message';
      setError(step, getMsg(key, 'This field is required.'));
      try { field.focus({ preventScroll: true }); } catch (_) {}
      return false;
    }
    if (step.dataset.type === 'email' || field.type === 'email') {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) {
        field.setAttribute('aria-invalid', 'true');
        setError(step, getMsg('email', 'Please enter a valid email address.'));
        try { field.focus({ preventScroll: true }); } catch (_) {}
        return false;
      }
    }
    return true;
  };

  const showStep = (i, focus) => {
    if (focus === undefined) focus = true;
    index = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, idx) => {
      const active = idx === index;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
      s.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    if (currentEl) currentEl.textContent = String(index + 1);
    if (bar) bar.style.width = ((index + 1) / steps.length) * 100 + '%';
    if (prevBtn) prevBtn.disabled = index === 0;
    const isSubmitStep = !!steps[index].dataset.submit;
    if (nextBtn) nextBtn.style.display = isSubmitStep ? 'none' : '';
    if (focus) {
      const focusable = steps[index].querySelector('input:not([type="hidden"]):not([tabindex="-1"]), textarea, select, button.fm__submit');
      if (focusable) {
        try { focusable.focus({ preventScroll: true }); } catch (_) {}
      }
    }
  };

  if (prevBtn) prevBtn.addEventListener('click', () => showStep(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (!validateStep(steps[index])) return;
    showStep(index + 1);
  });

  form.addEventListener('change', (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'INPUT') return;
    if (target.name === 'actualites_choice') {
      const hidden = form.querySelector('#fm-actualites');
      if (hidden) hidden.value = target.value === 'yes' ? '1' : '';
    }
    const step = target.closest('.fm__step');
    if (!step || step !== steps[index]) return;
    if (target.type === 'radio' && !step.dataset.submit) {
      clearStepErrors(step);
      setTimeout(() => { if (steps[index] === step) showStep(index + 1, false); }, 180);
    }
  });

  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (target && target.tagName === 'TEXTAREA') return;
    if (steps[index] && steps[index].dataset.submit) return;
    e.preventDefault();
    if (!validateStep(steps[index])) return;
    showStep(index + 1);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(steps[i])) { showStep(i); return; }
    }
    const honeypot = form.querySelector('input[name="piege"]');
    if (honeypot && honeypot.value) return;

    const data = new FormData(form);
    const besoins = data.getAll('besoins').join(', ') || '—';
    const budgetMap = {
      'moins-5k': '< €5,000',
      '5k-15k': '€5,000–€15,000',
      '15k-50k': '€15,000–€50,000',
      'plus-50k': '> €50,000',
      'a-definir': 'Not sure yet'
    };
    const budget = budgetMap[data.get('budget')] || data.get('budget') || '—';
    const news = data.get('actualites') ? 'Yes' : (data.get('actualites_choice') === 'no' ? 'No' : '—');
    const body = [
      'First name: ' + (data.get('prenom') || ''),
      'Last name: ' + (data.get('nom') || ''),
      'Email: ' + (data.get('email') || ''),
      'Phone: ' + ((data.get('indicatif') || '') + ' ' + (data.get('telephone') || '')).trim(),
      'Organization: ' + (data.get('structure') || ''),
      'Needs: ' + besoins,
      'Budget: ' + budget,
      'Message: ' + (data.get('message') || ''),
      'News opt-in: ' + news
    ].join('\n');
    const subject = ('New project inquiry — ' + (data.get('prenom') || '') + ' ' + (data.get('nom') || '')).trim();
    const mailto = 'mailto:contact@manifold.marketing?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

    if (failBox) failBox.innerHTML = '';
    if (successBox) successBox.classList.add('is-show');
    try { window.location.href = mailto; } catch (_) {}
  });

  steps.forEach((s, i) => { if (i !== 0) { s.hidden = true; s.setAttribute('aria-hidden', 'true'); } });
  showStep(0, false);
})();
