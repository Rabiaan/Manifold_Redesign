(() => {
  const nav = document.querySelector('[data-nav]');
  const hero = document.querySelector('#hh');
  const faq = document.querySelector('#faq');
  const caseTrack = document.querySelector('#realisations .piste__cartes');
  const caseControls = document.querySelector('#realisations .piste__commandes');
  const newsTrack = document.querySelector('[data-news-track]');
  const newsControls = document.querySelector('.manifold-journal-controls');

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

  const initInteractiveHeadline = () => {
    const title = document.querySelector('#hh-t');
    if (!title) return;

    const word = title.querySelector('.mj__mots');
    if (!word) return;

    title.querySelectorAll('.mj__l2 .mj__c').forEach((letter) => {
      letter.classList.add('hero-interactive-letter--scale');
    });

    const canAnimate = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && (navigator.maxTouchPoints || 0) === 0;
    if (!canAnimate) return;

    const letters = [...title.querySelectorAll('.hero-interactive-letter--scale')].map((element) => ({
      element,
      scale: 1,
    }));
    const radius = 170;
    const maxTilt = 6;
    const maxLift = 6;
    let pointer = null;
    let wordTilt = 0;
    let wordLift = 0;
    let frame = 0;

    const animate = () => {
      frame = 0;
      const wordRect = title.getBoundingClientRect();
      const wordCenterX = wordRect.left + wordRect.width / 2;
      const wordCenterY = wordRect.top + wordRect.height / 2;
      const wordDx = pointer ? pointer.x - wordCenterX : 0;
      const wordDy = pointer ? pointer.y - wordCenterY : 0;
      const horizontalInfluence = pointer
        ? Math.max(0, 1 - Math.max(0, Math.abs(wordDx) - wordRect.width / 2) / 260)
        : 0;
      const verticalInfluence = pointer
        ? Math.max(0, 1 - Math.max(0, Math.abs(wordDy) - wordRect.height / 2) / 260)
        : 0;
      const wordInfluence = horizontalInfluence * verticalInfluence;
      const wordDirection = Math.max(-1, Math.min(1, wordDx / (wordRect.width / 2 + 40)));
      const targetTilt = maxTilt * wordInfluence * wordDirection;
      const targetLift = maxLift * wordInfluence * Math.abs(wordDirection);

      wordTilt += (targetTilt - wordTilt) * 0.16;
      wordLift += (targetLift - wordLift) * 0.16;
      let unsettled = Math.abs(targetTilt - wordTilt) > 0.02
        || Math.abs(targetLift - wordLift) > 0.05;
      if (!unsettled) {
        wordTilt = targetTilt;
        wordLift = targetLift;
      }

      const brightness = 1 - 0.04 * Math.min(1, Math.abs(wordTilt) / maxTilt);
      word.style.setProperty('--hero-word-tilt', `${wordTilt.toFixed(2)}deg`);
      word.style.setProperty('--hero-word-z', `${wordLift.toFixed(2)}px`);
      word.style.setProperty('--hero-word-brightness', brightness.toFixed(3));

      const updates = letters.map((letter) => {
        const rect = letter.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = pointer ? pointer.x - centerX : 0;
        const dy = pointer ? pointer.y - centerY : 0;
        const distance = Math.hypot(dx, dy);
        const proximity = pointer ? Math.max(0, 1 - distance / radius) : 0;
        const easedProximity = proximity * proximity * (3 - 2 * proximity);
        const scale = 1 + 0.15 * easedProximity;
        return { letter, scale, easedProximity };
      });

      updates.forEach(({ letter, scale, easedProximity }) => {
        letter.scale += (scale - letter.scale) * 0.22;
        if (Math.abs(scale - letter.scale) > 0.001) {
          unsettled = true;
        } else {
          letter.scale = scale;
        }
        letter.element.style.setProperty('--hero-letter-scale', letter.scale.toFixed(3));
        letter.element.style.zIndex = String(Math.round(easedProximity * 100));
      });

      if (unsettled) frame = window.requestAnimationFrame(animate);
    };

    const scheduleAnimation = () => {
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      pointer = { x: event.clientX, y: event.clientY };
      scheduleAnimation();
    }, { passive: true });

    const clearPointer = () => {
      if (!pointer) return;
      pointer = null;
      scheduleAnimation();
    };

    document.addEventListener('mouseleave', clearPointer);
    document.documentElement.addEventListener('pointerleave', clearPointer);
    document.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget) clearPointer();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearPointer();
    });
    window.addEventListener('blur', clearPointer);
    window.addEventListener('scroll', scheduleAnimation, { passive: true });
  };

  initInteractiveHeadline();
  initClocks();

  const navLogoLink = nav?.querySelector('.nav__logo');
  const navLogo = navLogoLink?.querySelector('img');
  if (navLogoLink && navLogo) {
    navLogoLink.setAttribute('aria-label', 'Manifold home');
    navLogo.src = 'assets/img/manifold-embossed-emblem-2000.webp';
    navLogo.alt = 'Manifold';

    document
      .querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')
      .forEach((link) => link.remove());
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/webp';
    favicon.href = navLogo.src;
    document.head.append(favicon);
    const touchIcon = favicon.cloneNode();
    touchIcon.rel = 'apple-touch-icon';
    document.head.append(touchIcon);
  }

  const navItems = [...(nav?.querySelectorAll('.nav__item[data-sub]') || [])];
  let navCloseTimer = 0;

  const setNavItemOpen = (item, open) => {
    if (open) {
      window.clearTimeout(navCloseTimer);
      navItems.forEach((other) => {
        const isOpen = other === item;
        other.classList.toggle('is-open', isOpen);
        other.querySelector('.nav__sub-btn')?.setAttribute('aria-expanded', String(isOpen));
      });
      return;
    }

    item.classList.remove('is-open');
    item.querySelector('.nav__sub-btn')?.setAttribute('aria-expanded', 'false');
  };

  navItems.forEach((item) => {
    const toggle = item.querySelector('.nav__sub-btn');
    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') setNavItemOpen(item, true);
    });
    item.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse' || item.contains(document.activeElement)) return;
      navCloseTimer = window.setTimeout(() => setNavItemOpen(item, false), 120);
    });
    item.addEventListener('focusin', () => setNavItemOpen(item, true));
    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget)) setNavItemOpen(item, false);
    });
    toggle?.addEventListener('click', () => {
      setNavItemOpen(item, !item.classList.contains('is-open'));
    });
  });

  nav?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openItem = navItems.find((item) => item.classList.contains('is-open'));
    if (!openItem) return;
    setNavItemOpen(openItem, false);
    openItem.querySelector('.nav__sub-btn')?.focus();
  });

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest?.('.nav__item[data-sub]')) return;
    navItems.forEach((item) => setNavItemOpen(item, false));
  });

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

  const footerContactButton = document.querySelector('.pied-revele .cta__side .btn');
  if (footerContactButton && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let buttonRect = null;
    const updateFillOrigin = (event) => {
      if (!buttonRect) return;
      footerContactButton.style.setProperty('--bx', `${event.clientX - buttonRect.left}px`);
      footerContactButton.style.setProperty('--by', `${event.clientY - buttonRect.top}px`);
    };

    footerContactButton.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      buttonRect = footerContactButton.getBoundingClientRect();
      footerContactButton.style.setProperty('--bd', `${Math.ceil(Math.hypot(buttonRect.width, buttonRect.height) * 2)}px`);
      updateFillOrigin(event);
    });
    footerContactButton.addEventListener('pointermove', updateFillOrigin, { passive: true });
    footerContactButton.addEventListener('pointerleave', () => {
      buttonRect = null;
      ['--bx', '--by', '--bd'].forEach((property) => footerContactButton.style.removeProperty(property));
    });
  }

  const footerBrand = document.querySelector('.pied__logo');
  let footerHalves = [];
  if (footerBrand) {
    const wordmark = document.createElement('div');
    wordmark.className = 'manifold-footer-wordmark';
    wordmark.setAttribute('role', 'img');
    wordmark.setAttribute('aria-label', 'Manifold');

    const leftHalf = document.createElement('span');
    leftHalf.className = 'manifold-footer-half manifold-footer-half--left';
    leftHalf.setAttribute('aria-hidden', 'true');
    leftHalf.textContent = 'Mani';

    const rightHalf = document.createElement('span');
    rightHalf.className = 'manifold-footer-half manifold-footer-half--right';
    rightHalf.setAttribute('aria-hidden', 'true');
    rightHalf.textContent = 'fold';

    wordmark.append(leftHalf, rightHalf);
    footerBrand.classList.add('manifold-footer-brand');
    footerBrand.replaceChildren(wordmark);
    footerHalves = [leftHalf, rightHalf];
  }

  const heroFilmSource = hero?.querySelector('.hh__carte');
  const heroVideo = heroFilmSource?.querySelector('.hh__reel');
  const heroVeil = heroFilmSource?.querySelector('.hh__voile');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const characterObserver = !reduceMotion && 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in', 'is-char-revealed');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })
    : null;

  const prepareCharacterReveal = (element, isVideoCopy = false) => {
    if (!element || element.dataset.charRevealReady === 'true' || reduceMotion) return;
    element.dataset.charRevealReady = 'true';
    element.classList.add(isVideoCopy ? 'char-reveal-copy' : 'char-reveal-heading');

    if (!isVideoCopy && !element.hasAttribute('aria-label')) {
      element.setAttribute('aria-label', element.textContent.replace(/\s+/g, ' ').trim());
    }

    const order = { value: 0 };
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
              letter.style.setProperty('--char-order', Math.min(order.value, 48));
              order.value += 1;
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
    if (isVideoCopy) return;
    if (characterObserver) characterObserver.observe(element);
    else element.classList.add('is-in', 'is-char-revealed');
  };

  if (!reduceMotion) {
    document.querySelectorAll('main section h2, .pied-revele section h2')
      .forEach((heading) => prepareCharacterReveal(heading));

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
  }

  const connectScroller = (track, controls, selector, directionKey) => {
    if (!track || !controls) return;
    const buttons = [...controls.querySelectorAll(selector)];
    const update = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      controls.hidden = maxScroll <= 1;
      buttons.forEach((button) => {
        const direction = Number(button.dataset[directionKey]);
        button.disabled = direction < 0 ? track.scrollLeft <= 1 : track.scrollLeft >= maxScroll - 1;
      });
    };

    controls.addEventListener('click', (event) => {
      const button = event.target.closest(selector);
      if (!button || !controls.contains(button)) return;
      const firstCard = track.firstElementChild;
      if (!firstCard) return;
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      track.scrollBy({
        left: Number(button.dataset[directionKey]) * (firstCard.getBoundingClientRect().width + gap),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  };

  connectScroller(caseTrack, caseControls, '[data-piste-direction]', 'pisteDirection');
  connectScroller(newsTrack, newsControls, '[data-news-direction]', 'newsDirection');

  const cursor = document.querySelector('.curseur');
  const cursorRibbon = cursor?.querySelector('.curseur__ruban');
  const cursorMain = cursor?.querySelector('.curseur__main');
  const cursorStar = cursor?.querySelector('.curseur__etoile');
  const customCursorEnabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion;

  if (cursor && cursorRibbon && cursorMain && customCursorEnabled) {
    let activeTarget = null;
    let pointerX = 0;
    let pointerY = 0;
    let pointerFrame = 0;

    const moveCursor = () => {
      pointerFrame = 0;
      cursorRibbon.style.transform = `translate3d(${pointerX - 15}px, ${pointerY - 13}px, 0)`;
      cursorMain.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
      if (cursorStar) cursorStar.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    };

    const updateCursorLabel = (target) => {
      const label = target?.dataset.verbe?.trim();
      if (!label) return;
      activeTarget = target;
      cursor.querySelectorAll('.curseur__piste span').forEach((item) => {
        item.textContent = label;
      });
      cursor.classList.remove('is-off');
      cursor.dataset.etat = 'texte';
    };

    document.addEventListener('pointermove', (event) => {
      if (!activeTarget) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(moveCursor);
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
      const target = event.target.closest?.('[data-verbe]');
      if (!target) return;
      updateCursorLabel(target);
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(moveCursor);
    });

    document.addEventListener('pointerout', (event) => {
      if (!activeTarget) return;
      const nextTarget = event.relatedTarget?.closest?.('[data-verbe]');
      if (nextTarget === activeTarget) return;
      if (nextTarget) {
        updateCursorLabel(nextTarget);
        return;
      }
      activeTarget = null;
      cursor.dataset.etat = 'off';
      cursor.classList.add('is-off');
    });
  }

  let heroFilm;
  let heroCopy;
  let heroFilmStart;

  const playHeroVideo = () => {
    if (!heroVideo) return;
    if (heroVideo.dataset.manifoldSourceLoaded !== 'true') {
      heroVideo.src = 'assets/img/manifold-main.mp4';
      heroVideo.dataset.manifoldSourceLoaded = 'true';
      heroVideo.load();
    }
    const playback = heroVideo.play();
    if (playback) {
      playback
        .then(() => {
          delete hero.dataset.videoState;
        })
        .catch((error) => {
          if (error.name === 'AbortError') return;
          console.error('Unable to play the Manifold hero showreel.', error);
          hero.dataset.videoState = 'error';
        });
    }
  };

  if (heroVideo) {
    heroVideo.preload = 'none';
    heroVideo.muted = true;
    heroVideo.loop = true;
    heroVideo.playsInline = true;
    heroVideo.replaceChildren();
    heroVideo.removeAttribute('src');
    heroVideo.poster = 'assets/img/manifold-cinema-lens-1600.webp';
    heroVideo.setAttribute('aria-label', 'Manifold hero showreel');
  }

  if (!reduceMotion && heroFilmSource && heroVideo && heroVeil) {
    heroFilm = document.createElement('div');
    heroFilm.className = 'manifold-hero-film';

    heroCopy = document.createElement('p');
    heroCopy.className = 'manifold-hero-copy';
    heroCopy.innerHTML = [
      '<span class="manifold-hero-copy-inner">',
      '<span class="manifold-hero-line">Ideas become images. Stories become worlds.</span>',
      '<span class="manifold-hero-line baila">Manifold</span>',
      '<span class="manifold-hero-line">brings imagination into motion.</span>',
      '</span>',
    ].join('');
    heroCopy.setAttribute('aria-hidden', 'true');
    prepareCharacterReveal(heroCopy, true);

    heroFilm.append(heroVideo, heroVeil, heroCopy);
    document.body.append(heroFilm);
    heroFilmSource.classList.add('manifold-hero-source');

    const originalHeroCopy = hero.querySelector('.hh__manif');
    if (originalHeroCopy) originalHeroCopy.remove();
  }

  if (!hero) return;

  let frame = 0;
  let heroTimeline = null;
  const HERO_FULL_AT = 0.85;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const measureHeroFilm = () => {
    if (!heroFilmSource) return;
    const startRect = heroFilmSource.getBoundingClientRect();
    heroFilmStart = {
      left: startRect.left,
      top: startRect.top,
      width: startRect.width,
      height: startRect.height,
    };
  };

  const buildHeroTimeline = () => {
    if (typeof gsap === 'undefined' || reduceMotion || !heroFilm || !heroCopy) return;

    if (heroTimeline) {
      heroTimeline.kill();
      heroTimeline = null;
    }

    measureHeroFilm();
    if (!heroFilmStart) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    gsap.set(heroFilm, {
      left: heroFilmStart.left,
      top: heroFilmStart.top,
      width: heroFilmStart.width,
      height: heroFilmStart.height,
      borderRadius: 24,
      visibility: 'visible',
    });
    gsap.set(heroCopy, { opacity: 0 });

    const state = { progress: 0 };

    heroTimeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    heroTimeline.to(heroFilm, {
      left: 0,
      top: 0,
      width: viewportWidth,
      height: viewportHeight,
      borderRadius: 0,
      duration: HERO_FULL_AT,
    }, 0);
    heroTimeline.to(state, {
      progress: 1,
      duration: 1,
      onUpdate: () => {
        const value = state.progress.toFixed(4);
        hero.style.setProperty('--manifold-hero-progress', value);
        heroFilm.style.setProperty('--manifold-hero-progress', value);
      },
    }, 0);
    heroTimeline.to(heroCopy, { opacity: 1, duration: 0.15 }, 0.7);

    heroTimeline.progress(0);
  };

  const updateScrollEffects = () => {
    if (frame) return;

    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const viewportHeight = window.innerHeight;
      const heroRect = hero.getBoundingClientRect();
      const faqRect = faq?.getBoundingClientRect();
      const heroTravel = Math.max(1, hero.offsetHeight - viewportHeight);
      const heroProgress = clamp(-heroRect.top / heroTravel, 0, 1);
      const heroVisible = heroRect.bottom > 0 && heroRect.top < viewportHeight;

      if (nav) {
        nav.classList.toggle('is-pill', window.scrollY > 24);
        const faqMidpoint = faqRect
          ? window.scrollY + faqRect.top + faqRect.height / 2
          : Number.POSITIVE_INFINITY;
        nav.classList.toggle('is-cede', window.scrollY >= faqMidpoint);
      }

      if (heroTimeline) {
        heroTimeline.progress(heroProgress);
      } else {
        hero.style.setProperty('--manifold-hero-progress', heroProgress.toFixed(4));
        if (heroFilm && heroFilmStart) {
          const left = heroFilmStart.left * (1 - heroProgress);
          const top = heroFilmStart.top * (1 - heroProgress);
          const width = heroFilmStart.width + (window.innerWidth - heroFilmStart.width) * heroProgress;
          const height = heroFilmStart.height + (viewportHeight - heroFilmStart.height) * heroProgress;
          heroFilm.style.left = `${left}px`;
          heroFilm.style.top = `${top}px`;
          heroFilm.style.width = `${width}px`;
          heroFilm.style.height = `${height}px`;
          heroFilm.style.borderRadius = `${24 * (1 - heroProgress)}px`;
          heroFilm.style.setProperty('--manifold-hero-progress', heroProgress.toFixed(4));
          if (heroCopy) {
            const copyProgress = clamp((heroProgress - 0.72) / 0.2, 0, 1);
            heroCopy.style.opacity = copyProgress.toFixed(3);
          }
        }
      }

      if (heroFilm) heroFilm.style.visibility = heroVisible ? 'visible' : 'hidden';
      if (heroCopy) heroCopy.setAttribute('aria-hidden', String(heroProgress < 0.7));
      if (heroCopy && heroProgress >= 0.7) heroCopy.classList.add('is-char-revealed');

      if (footerBrand && footerHalves.length) {
        const brandRect = footerBrand.getBoundingClientRect();
        const pageBottom = document.documentElement.scrollHeight - viewportHeight;
        const brandTop = brandRect.top + window.scrollY;
        const animationStart = brandTop - viewportHeight * 0.86;
        const animationEnd = Math.min(brandTop - viewportHeight * 0.21, pageBottom);
        const range = animationEnd - animationStart;
        const rawProgress = reduceMotion
          ? 1
          : range > 1
            ? clamp((window.scrollY - animationStart) / range, 0, 1)
            : Number(window.scrollY >= pageBottom - 1);
        const brandProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
        const spread = 1 - brandProgress;
        const green = Math.round(164 + 91 * brandProgress);
        const greenChannel = Math.round(239 + 16 * brandProgress);
        const color = `rgb(${green} ${greenChannel} ${Math.round(192 + 63 * brandProgress)})`;

        footerHalves[0].style.transform = reduceMotion
          ? 'none'
          : `translate3d(${-window.innerWidth * 0.5 * spread}px, 0, 0) rotate(${-12 * spread}deg)`;
        footerHalves[1].style.transform = reduceMotion
          ? 'none'
          : `translate3d(${window.innerWidth * 0.5 * spread}px, 0, 0) rotate(${12 * spread}deg)`;
        footerHalves.forEach((half) => {
          half.style.color = color;
        });
      }

      if (heroVideo) {
        if (heroVisible && heroVideo.paused) {
          playHeroVideo();
        } else if (!heroVisible && !heroVideo.paused) {
          heroVideo.pause();
        }
      }
    });
  };

  if (heroFilm && heroFilmSource) {
    measureHeroFilm();
    buildHeroTimeline();
  }

  let resizeTimer = 0;
  const handleResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (heroFilm && heroFilmSource) buildHeroTimeline();
      updateScrollEffects();
    }, 150);
  };

  window.addEventListener('scroll', updateScrollEffects, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
  updateScrollEffects();
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
