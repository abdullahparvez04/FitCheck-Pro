/**
 * ui-effects.js
 * Purely decorative interaction layer for FitCheck.
 * Does NOT touch form submission, API calls, or any existing state/logic —
 * it only adds visual polish (parallax, spotlight, ripple, motes, reveal).
 * Safe to remove without affecting functionality.
 */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Ambient glow parallax (background orbs drift toward cursor) ---- */
  if (!reduceMotion) {
    let targetX = 50, targetY = 50, curX = 50, curY = 50;
    window.addEventListener('pointermove', (e) => {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    }, { passive: true });

    function tick() {
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      root.style.setProperty('--mx', curX + '%');
      root.style.setProperty('--my', curY + '%');
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- 2. Card spotlight — tracks cursor position within each glass-surface ---- */
  document.querySelectorAll('.glass-surface').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--sx', x + '%');
      card.style.setProperty('--sy', y + '%');
    });
  });

  /* ---- 3. Magnetic + ripple button interaction ---- */
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    if (!reduceMotion) {
      submitBtn.addEventListener('pointermove', (e) => {
        const rect = submitBtn.getBoundingClientRect();
        const relX = (e.clientX - rect.left - rect.width / 2) * 0.08;
        const relY = (e.clientY - rect.top - rect.height / 2) * 0.25;
        submitBtn.style.transform = `translate(${relX}px, ${relY - 2}px)`;
      });
      submitBtn.addEventListener('pointerleave', () => {
        submitBtn.style.transform = '';
      });
    }

    submitBtn.addEventListener('click', (e) => {
      const rect = submitBtn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 1.2;
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      submitBtn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }

  /* ---- 4. Drag-active visual class (cosmetic only — script.js still handles logic) ---- */
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-active'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', () => dropZone.classList.remove('drag-active'));
  }

  /* ---- 5. Drifting dust motes ---- */
  const motesContainer = document.getElementById('dustMotes');
  if (motesContainer && !reduceMotion) {
    const MOTE_COUNT = 14;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const mote = document.createElement('span');
      const left = Math.random() * 100;
      const duration = 14 + Math.random() * 12;
      const delay = Math.random() * -20;
      const size = 2 + Math.random() * 2.5;
      mote.style.left = left + 'vw';
      mote.style.bottom = '-10px';
      mote.style.width = mote.style.height = size + 'px';
      mote.style.animationDuration = duration + 's';
      mote.style.animationDelay = delay + 's';
      motesContainer.appendChild(mote);
    }
  }

  /* ---- 6. Scroll reveal for any element opting in via [data-reveal] ---- */
  const revealTargets = document.querySelectorAll('[data-reveal]');
  if (revealTargets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---- 7. Re-trigger the results entrance animation each time it unhides ---- */
  const resultsSection = document.getElementById('resultsSection');
  if (resultsSection) {
    const mo = new MutationObserver(() => {
      if (!resultsSection.classList.contains('hidden')) {
        resultsSection.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        resultsSection.offsetHeight; // force reflow to restart animation
        resultsSection.style.animation = '';
      }
    });
    mo.observe(resultsSection, { attributes: true, attributeFilter: ['class'] });
  }
})();
