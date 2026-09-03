const header = document.getElementById('header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  });
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });
}

const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);

reveals.forEach(el => observer.observe(el));

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Hero label — typing effect with live syntax highlighting
const heroLabelEl = document.querySelector('.hero-label');
if (heroLabelEl) {
  const inner = heroLabelEl.dataset.label || 'Frontend Developer';

  // Tokens: each is { cls: 'span-class-or-null', text: 'string' }
  const tokens = [
    { cls: 'syn-kw',   text: 'main' },
    { cls: 'syn-punc', text: '()' },
    { cls: null,       text: ' ' },
    { cls: 'syn-punc', text: '{' },
    { cls: null,       text: '\n  ' },
    { cls: 'syn-fn',   text: 'printf' },
    { cls: 'syn-punc', text: '(' },
    { cls: 'syn-str',  text: `"${inner}"` },
    { cls: 'syn-punc', text: ');' },
    { cls: null,       text: '\n' },
    { cls: 'syn-punc', text: '}' },
  ];

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build full HTML immediately (used for reduced-motion or final state)
  const buildHTML = (tokenList) =>
    tokenList.map(t =>
      t.cls
        ? `<span class="${t.cls}">${t.text}</span>`
        : t.text.replace(/\n/g, '\n')  // keep newlines as-is (white-space:pre)
    ).join('');

  if (reduceMotion) {
    heroLabelEl.innerHTML = buildHTML(tokens);
  } else {

  // Flatten tokens into a sequence of { cls, char } pairs
  const chars = [];
  tokens.forEach(t => {
    for (const ch of t.text) {
      chars.push({ cls: t.cls, ch });
    }
  });

  heroLabelEl.innerHTML = '';
  let i = 0;
  const speed = 40;

  const tick = () => {
    if (i >= chars.length) return;
    const { cls, ch } = chars[i];
    i += 1;

    // Re-render from scratch up to index i — simple & correct
    const partial = [];
    let j = 0;
    tokens.forEach(t => {
      const tLen = t.text.length;
      const charsTyped = Math.max(0, Math.min(i - j, tLen));
      if (charsTyped > 0) {
        partial.push({ cls: t.cls, text: t.text.slice(0, charsTyped) });
      }
      j += tLen;
    });
    heroLabelEl.innerHTML = buildHTML(partial);

    window.setTimeout(tick, speed);
  };

    window.setTimeout(tick, 300);
  }
}

// Order modal
const orderModal = document.getElementById('order-modal');
const openBtn = document.getElementById('open-order-modal');
const closeBtn = document.getElementById('close-order-modal');
const orderForm = document.getElementById('order-form');

if (openBtn && orderModal) {
  openBtn.addEventListener('click', () => {
    orderModal.hidden = false;
  });

  closeBtn.addEventListener('click', () => {
    orderModal.hidden = true;
  });

  orderModal.addEventListener('click', (e) => {
    if (e.target === orderModal) orderModal.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !orderModal.hidden) orderModal.hidden = true;
  });
}

if (orderForm) {
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = orderForm.name.value.trim();
    const task = orderForm.task.value.trim();
    const contact = orderForm.contact.value.trim();

    if (!name || !task || !contact) return;

    // Формируем текст и открываем Telegram
    const text = `Новый заказ!\n\nПроект: ${name}\nЗадание: ${task}\nКонтакт: ${contact}`;
    const url = `https://t.me/ffeagle?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    orderForm.reset();
    orderModal.hidden = true;
  });
}
