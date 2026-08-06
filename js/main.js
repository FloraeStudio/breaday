import { getProducts } from './data-service.js';
import { renderProducts } from './render.js';

// ---------- 產品渲染 ----------
async function initProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const products = await getProducts();
  renderProducts(grid, products);
}

// ---------- 逐字浮現動畫 ----------
// 用 TreeWalker 只包住文字節點，<br> 等其他標籤原封不動，
// 所以 HTML 裡不用先手動拆成多個 <span class="line">。
function splitIntoChars(root, startIndex = 0) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  let i = startIndex;
  textNodes.forEach((textNode) => {
    const frag = document.createDocumentFragment();
    [...textNode.textContent].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.animationDelay = `${i * 0.035}s`;
      frag.appendChild(span);
      i++;
    });
    textNode.parentNode.replaceChild(frag, textNode);
  });
  return i;
}

function initCharReveal() {
  document.querySelectorAll('.char-reveal').forEach((el) => splitIntoChars(el));
}

// ---------- 滾動淡入 ----------
function initScrollReveal() {
  const targets = document.querySelectorAll('.scroll-reveal:not(.is-visible)');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  targets.forEach((el) => observer.observe(el));
}

// ---------- Hero 輪播(淡入淡出) + 捲動視差(帶阻尼緩動，避免卡頓) ----------
const HERO_INTERVAL = 4500;        // 每張停留時間(ms)
const HERO_SCROLL_PARALLAX = 26;   // 捲動視差最大位移(px)
const HERO_SCALE = 1.06;           // 圖片要比容器大一點，位移才不會露邊
const HERO_EASE = 0.08;            // 阻尼係數(0~1)：越小越滑順、跟手感越輕；越大越貼近即時捲動位置

function initHeroSlideshow() {
  const wrap = document.getElementById('hero-media');
  if (!wrap) return;
  const slides = wrap.querySelectorAll('.hero-slide');
  if (!slides.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let targetShift = 0;   // 依捲動位置算出的「目標」位移
  let currentShift = 0;  // 實際套用到畫面上的位移，每一幀慢慢逼近 targetShift

  const applyTransform = () => {
    slides.forEach((slide) => {
      slide.style.transform = `scale(${HERO_SCALE}) translateY(${currentShift}px)`;
    });
  };
  applyTransform();

  if (reduceMotion) return;

  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
  }, HERO_INTERVAL);

  const updateTarget = () => {
    const rect = wrap.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = rect.top / window.innerHeight;
    targetShift = progress * -HERO_SCROLL_PARALLAX;
  };
  window.addEventListener('scroll', updateTarget, { passive: true });

  const loop = () => {
    currentShift += (targetShift - currentShift) * HERO_EASE;
    applyTransform();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', async () => {
  initCharReveal();      // hero 標題：頁面一載入就逐字浮現
  initHeroSlideshow();   // hero 圖片：輪播 + 捲動視差
  await initProducts();  // 產品卡先插入 DOM
  initScrollReveal();    // 再統一掛上滾動淡入觀察者(含剛插入的產品卡)
});
