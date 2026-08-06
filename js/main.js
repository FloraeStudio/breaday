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

// ---------- Hero 輪播(淡入淡出) + 滑鼠視差 + 捲動視差 ----------
const HERO_INTERVAL = 4500;        // 每張停留時間(ms)
const HERO_MOUSE_PARALLAX = 14;    // 滑鼠視差最大位移(px)
const HERO_SCROLL_PARALLAX = 26;   // 捲動視差最大位移(px)
const HERO_SCALE = 1.08;           // 兩種位移疊加，圖片要比容器大更多才不會露邊

function initHeroSlideshow() {
  const wrap = document.getElementById('hero-media');
  if (!wrap) return;
  const slides = wrap.querySelectorAll('.hero-slide');
  if (!slides.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 只有滑鼠裝置才做滑鼠視差；觸控裝置(手機/平板)天生不會觸發 mousemove，這裡再明確判斷一次避免誤加監聽
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let mouseX = 0, mouseY = 0, scrollShift = 0;
  let ticking = false;

  const render = () => {
    slides.forEach((slide) => {
      slide.style.transform = `scale(${HERO_SCALE}) translate(${mouseX}px, ${mouseY + scrollShift}px)`;
    });
    ticking = false;
  };
  const requestRender = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };
  requestRender(); // 套用初始 scale，避免第一次互動前後跳一下

  if (reduceMotion) return; // 保留第一張靜態顯示，不做輪播/視差

  // 自動輪播淡入淡出
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
  }, HERO_INTERVAL);

  // 滑鼠視差：游標往哪，圖片反方向微微飄
  if (canHover) {
    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * HERO_MOUSE_PARALLAX;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * HERO_MOUSE_PARALLAX;
      requestRender();
    });
    wrap.addEventListener('mouseleave', () => {
      mouseX = 0;
      mouseY = 0;
      requestRender();
    });
  }

  // 捲動視差：只在 hero 還在視窗附近時計算，其餘時間略過(效能考量)
  window.addEventListener('scroll', () => {
    const rect = wrap.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = rect.top / window.innerHeight; // hero 頂端在視窗中的相對位置：約 1 → 0 → -1
    scrollShift = progress * -HERO_SCROLL_PARALLAX;
    requestRender();
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  initCharReveal();      // hero 標題：頁面一載入就逐字浮現
  initHeroSlideshow();   // hero 圖片：輪播 + 滑鼠視差 + 捲動視差
  await initProducts();  // 產品卡先插入 DOM
  initScrollReveal();    // 再統一掛上滾動淡入觀察者(含剛插入的產品卡)
});
