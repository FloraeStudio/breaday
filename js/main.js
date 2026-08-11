import { getProducts, getProductByHandle } from './data-service.js';
import { renderProducts, renderProductList, renderProductDetail, renderProductNotFound, renderPriceHtml, renderCart, renderCartEmpty } from './render.js';
import { loadLayout } from './partials.js';
import { getOrCreateCart, addToCart, updateCartLine, removeFromCart } from './cart-service.js';

// ---------- 產品渲染 ----------
// #product-grid:所有商品頁(products.html)的完整格線
// #featured-grid:首頁(index.html)的精選預覽,只取前 3 件
const FEATURED_COUNT = 3;

// 目前只有兩種分類:麵包(預設,後台 Product type 沒填的商品都算這裡)、咖啡。
// 之後要加第三種分類,在這裡多加一組 filter、products.html 多加一個分類頁籤按鈕即可。
const CATEGORY_FILTERS = {
  all: () => true,
  bread: (category) => !/coffee|咖啡/i.test(category),
  coffee: (category) => /coffee|咖啡/i.test(category),
};

const CATEGORY_META = {
  all: { title: '所有商品', desc: '當日現做，用心，讓吃也安心。' },
  bread: { title: '麵包', desc: '嚴選熊本小麥與看得安心的食材，每日現烤出爐。' },
  coffee: { title: '咖啡', desc: '搭配麵包一起享用，簡單沖煮、剛剛好的溫度。' },
};

async function initProducts() {
  const featuredGrid = document.getElementById('featured-grid');
  const fullList = document.getElementById('product-list');
  if (!featuredGrid && !fullList) return;

  let products = [];
  try {
    products = await getProducts();
  } catch (err) {
    console.error('讀取商品列表失敗:', err);
  }

  if (featuredGrid) renderProducts(featuredGrid, products.slice(0, FEATURED_COUNT));
  if (!fullList) return;

  const emptyState = document.getElementById('product-list-empty');
  const tabs = document.querySelectorAll('.menu-tab');
  const listTitle = document.querySelector('.product-list-title');
  const listDesc = document.querySelector('.product-list-desc');
  const breadcrumbCurrent = document.querySelector('.breadcrumb ol li:last-child');

  if (!products.length) {
    fullList.hidden = true;
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = '目前讀取不到商品，請稍後再試一次。';
    }
    return;
  }

  const renderFiltered = (filterKey) => {
    const matcher = CATEGORY_FILTERS[filterKey] || CATEGORY_FILTERS.all;
    const filtered = products.filter((p) => matcher(p.category || ''));
    renderProductList(fullList, filtered);
    fullList.hidden = filtered.length === 0;
    if (emptyState) emptyState.hidden = filtered.length !== 0;

    const meta = CATEGORY_META[filterKey] || CATEGORY_META.all;
    if (listTitle) listTitle.textContent = meta.title;
    if (listDesc) listDesc.textContent = meta.desc;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = meta.title;

    initScrollReveal();
  };

  renderFiltered('all');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('is-active')) return;
      tabs.forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      renderFiltered(tab.dataset.filter);
    });
  });
}

// ---------- 商品詳情頁(product.html) ----------
// 只有 #product-detail 存在時(也就是在 product.html 上)才會做事，
// 其他頁面呼叫這個函式一樣是直接 return，跟 initProducts() 的判斷方式一致。
function findMatchingVariant(variants, selectedOptions) {
  return variants.find((variant) =>
    variant.options.every((opt) => selectedOptions[opt.name] === opt.value)
  );
}

async function initProductDetail() {
  const detailContainer = document.getElementById('product-detail');
  if (!detailContainer) return;

  const handle = new URLSearchParams(window.location.search).get('handle');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  const relatedSection = document.getElementById('product-related');

  if (!handle) {
    renderProductNotFound(detailContainer);
    if (relatedSection) relatedSection.hidden = true;
    return;
  }

  let product;
  try {
    product = await getProductByHandle(handle);
  } catch (err) {
    console.error('讀取商品詳情失敗:', err);
    product = null;
  }

  if (!product) {
    renderProductNotFound(detailContainer);
    if (relatedSection) relatedSection.hidden = true;
    return;
  }

  document.title = `${product.name} | BREADAY 台灣`;
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

  renderProductDetail(detailContainer, product);

  // ---- 規格選擇、數量、加入購物車的互動邏輯 ----
  const priceEl = document.getElementById('pd-price');
  const feedbackEl = document.getElementById('pd-feedback');
  const addBtn = document.getElementById('pd-add-btn');
  const qtyInput = document.getElementById('pd-qty');

  // 預設選取第一個仍有貨的變體；如果全部都沒貨，退回選第一個變體純顯示
  const initialVariant =
    product.variants.find((v) => v.available) ?? product.variants[0];
  const selectedOptions = {};
  (initialVariant?.options ?? []).forEach((opt) => {
    selectedOptions[opt.name] = opt.value;
  });

  function updateForVariant(variant) {
    if (!variant) {
      if (priceEl) priceEl.textContent = '此規格組合無貨';
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = '無法購買';
      }
      return;
    }
    if (priceEl) priceEl.innerHTML = renderPriceHtml(variant.price, variant.compareAtPrice);
    if (addBtn) {
      addBtn.disabled = !variant.available;
      addBtn.textContent = variant.available ? '加入購物車' : '已售完';
    }
  }
  updateForVariant(initialVariant);

  // 規格按鈕(口味/尺寸等):點擊切換同一組內的 is-active,並重新比對變體
  detailContainer.querySelectorAll('.option-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { optionName, optionValue } = btn.dataset;
      detailContainer
        .querySelectorAll(`.option-swatch[data-option-name="${optionName}"]`)
        .forEach((sibling) => sibling.classList.toggle('is-active', sibling === btn));
      selectedOptions[optionName] = optionValue;
      updateForVariant(findMatchingVariant(product.variants, selectedOptions));
      if (feedbackEl) feedbackEl.textContent = '';
    });
  });

  // 圖片縮圖切換:淡出再淡入主圖,不做無限循環動畫，切換完就靜止
  const mainImg = document.getElementById('pd-main-img');
  detailContainer.querySelectorAll('.product-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      if (thumb.classList.contains('is-active') || !mainImg) return;
      detailContainer
        .querySelectorAll('.product-thumb')
        .forEach((t) => t.classList.toggle('is-active', t === thumb));
      mainImg.style.opacity = '0';
      window.setTimeout(() => {
        if (mainImg.tagName === 'IMG') mainImg.src = thumb.dataset.src;
        else mainImg.style.backgroundImage = `url('${thumb.dataset.src}')`;
        mainImg.style.opacity = '1';
      }, 300);
    });
  });

  // 數量加減按鈕
  detailContainer.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!qtyInput) return;
      const current = parseInt(qtyInput.value, 10) || 1;
      const next = btn.dataset.action === 'inc' ? current + 1 : Math.max(1, current - 1);
      qtyInput.value = next;
    });
  });

  // 加入購物車:呼叫 cart-service 的 Shopify Cart API，成功後給明確回饋，
  // 並附上「前往結帳」連結(cart.checkoutUrl 是 Shopify 官方結帳頁，購物車頁完成前先用這個銜接)
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const variant = findMatchingVariant(product.variants, selectedOptions);
      if (!variant || !variant.available) return;
      const quantity = Math.max(1, parseInt(qtyInput?.value, 10) || 1);

      addBtn.disabled = true;
      const originalLabel = addBtn.textContent;
      addBtn.textContent = '加入中...';
      if (feedbackEl) feedbackEl.textContent = '';

      try {
        const cart = await addToCart(variant.id, quantity);
        if (feedbackEl) {
          feedbackEl.innerHTML = `
          <span class="pd-feedback-success">
            <span>已加入購物車</span>
            <span class="pd-feedback-sep" aria-hidden="true">・</span>
            <a href="cart.html" class="pd-checkout-link">查看購物車 →</a>
          </span>
        `;
        }
        renderCartCount(cart);
      } catch (err) {
        console.error('加入購物車失敗:', err);
        if (feedbackEl) feedbackEl.innerHTML = `<span class="pd-feedback-error">加入購物車失敗，請稍後再試一次。</span>`;
      } finally {
        addBtn.disabled = !variant.available;
        addBtn.textContent = originalLabel;
      }
    });
  }

  // ---- 你可能也喜歡:從商品列表挑幾件、排除自己 ----
  const relatedGrid = document.getElementById('related-grid');
  if (relatedGrid) {
    try {
      const all = await getProducts();
      const related = all.filter((p) => p.handle !== product.handle).slice(0, 3);
      if (related.length) {
        renderProducts(relatedGrid, related);
      } else if (relatedSection) {
        relatedSection.hidden = true;
      }
    } catch (err) {
      console.error('讀取相關商品失敗:', err);
      if (relatedSection) relatedSection.hidden = true;
    }
  }
}

// ---------- 購物車頁(cart.html) ----------
async function initCartPage() {
  const cartBody = document.getElementById('cart-body');
  if (!cartBody) return;

  function renderCurrentCart(cart) {
    if (!cart.lines.length) {
      renderCartEmpty(cartBody);
      renderCartCount(cart);
      return;
    }
    renderCart(cartBody, cart);
    renderCartCount(cart);
    initScrollReveal();
    bindCartRowEvents();
  }

  // 統一處理「改數量/刪除」的更新流程:先在該列標記 is-updating(立即視覺回饋),
  // updateCartLine/removeFromCart 本身就會回傳更新後的購物車,直接拿來重繪，
  // 不用再另外呼叫 getOrCreateCart() 多打一次 API
  async function applyLineUpdate(lineId, updateFn) {
    const row = cartBody.querySelector(`.cart-row[data-line-id="${lineId}"]`);
    if (row) row.classList.add('is-updating');
    try {
      const cart = await updateFn();
      renderCurrentCart(cart);
    } catch (err) {
      console.error('更新購物車失敗:', err);
      if (row) row.classList.remove('is-updating');
    }
  }

  function bindCartRowEvents() {
    cartBody.querySelectorAll('.qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { lineId, action } = btn.dataset;
        const input = cartBody.querySelector(`.cart-qty-input[data-line-id="${lineId}"]`);
        const current = parseInt(input.value, 10) || 1;
        const next = action === 'inc' ? current + 1 : Math.max(1, current - 1);
        applyLineUpdate(lineId, () => updateCartLine(lineId, next));
      });
    });

    cartBody.querySelectorAll('.cart-qty-input').forEach((input) => {
      input.addEventListener('change', () => {
        const { lineId } = input.dataset;
        const next = Math.max(1, parseInt(input.value, 10) || 1);
        applyLineUpdate(lineId, () => updateCartLine(lineId, next));
      });
    });

    cartBody.querySelectorAll('.cart-row-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyLineUpdate(btn.dataset.lineId, () => removeFromCart(btn.dataset.lineId));
      });
    });
  }

  try {
    const cart = await getOrCreateCart();
    renderCurrentCart(cart);
  } catch (err) {
    console.error('讀取購物車失敗:', err);
    cartBody.innerHTML = `<p class="cart-empty-text">購物車讀取失敗，請重新整理再試一次。</p>`;
  }
}

// ---------- 購物車數量徽章(header,所有頁面共用) ----------
function renderCartCount(cart) {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  badge.textContent = count > 0 ? `(${count})` : '';
  badge.hidden = count === 0;
}

async function initCartCount() {
  try {
    renderCartCount(await getOrCreateCart());
  } catch (err) {
    console.error('讀取購物車數量失敗:', err);
  }
}

// ---------- 04 職人日常圖庫(about.html) ----------
// 3 個分類縮圖，每個分類可放多張照片(data-images 逗號分隔)，
// 選了分類後自動輪播該分類照片，小點點可直接跳，大圖本身也能點手動切換。
function initCraftGallery() {
  const frame = document.getElementById('craft-frame');
  if (!frame) return;

  const mainImg = document.getElementById('craft-main-img');
  const dotsWrap = document.getElementById('craft-dots');
  const captionTitle = document.getElementById('craft-caption-title');
  const captionDesc = document.getElementById('craft-caption-desc');
  const caption = document.getElementById('craft-caption');
  const thumbs = document.querySelectorAll('.craft-thumb');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CRAFT_INTERVAL = 4000;
  let images = [];
  let current = 0;
  let timer = null;

  function renderDots() {
    dotsWrap.innerHTML = images
      .map((_, i) => `<button type="button" class="craft-dot${i === current ? ' is-active' : ''}" data-i="${i}" aria-label="第 ${i + 1} 張"></button>`)
      .join('');
    dotsWrap.querySelectorAll('.craft-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(Number(dot.dataset.i));
        restartTimer();
      });
    });
  }

  function showImage(index) {
    current = (index + images.length) % images.length;
    mainImg.classList.add('is-swapping');
    window.setTimeout(() => {
      mainImg.src = images[current];
      mainImg.classList.remove('is-swapping');
    }, 300);
    dotsWrap.querySelectorAll('.craft-dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === current);
    });
  }

  function restartTimer() {
    if (timer) window.clearInterval(timer);
    if (reduceMotion || images.length <= 1) return;
    timer = window.setInterval(() => showImage(current + 1), CRAFT_INTERVAL);
  }

  function setCategory(thumb) {
    images = thumb.dataset.images.split(',').map((s) => s.trim()).filter(Boolean);
    current = 0;
    mainImg.src = images[0];
    mainImg.alt = thumb.dataset.title || '';
    if (captionTitle) captionTitle.textContent = thumb.dataset.title || '';
    if (captionDesc) captionDesc.textContent = thumb.dataset.desc || '';
    if (caption) {
      caption.classList.add('is-updating');
      window.setTimeout(() => caption.classList.remove('is-updating'), 250);
    }
    renderDots();
    restartTimer();
  }

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      if (thumb.classList.contains('is-active')) return;
      thumbs.forEach((t) => {
        t.classList.toggle('is-active', t === thumb);
        t.setAttribute('aria-selected', t === thumb ? 'true' : 'false');
      });
      setCategory(thumb);
    });
  });

  frame.addEventListener('click', () => {
    showImage(current + 1);
    restartTimer();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (timer) window.clearInterval(timer);
    } else {
      restartTimer();
    }
  });

  const initialThumb = document.querySelector('.craft-thumb.is-active') || thumbs[0];
  if (initialThumb) setCategory(initialThumb);
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

// 跟 initCharReveal 一樣拆字，但這組給「捲動才觸發」用：
// 拆字動作在頁面載入時就先做好（.char span 建立時預設 animation-play-state: paused，
// 详見 sections.css），實際播放靠 CSS 的 .is-visible .char-reveal-scroll .char 規則觸發，
// 不需要額外的 JS 監聽，跟外層 .scroll-reveal 共用同一個 IntersectionObserver 的觸發時機
function initScrollCharReveal() {
  document.querySelectorAll('.char-reveal-scroll').forEach((el) => splitIntoChars(el));
}

// ---------- 滾動淡入 ----------
// rootMargin 給下緣一個「正值」,等於把偵測範圍往下延伸超出實際畫面,
// 元素還沒真的滑進視窗、離可視範圍還有一小段距離時就先觸發動畫,
// 這樣使用者滑到看見它的當下,動畫多半已經跑完,不會有「動畫追不上滑動速度」的落差感
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
    { threshold: 0, rootMargin: '0px 0px 5% 0px' }
  );
  targets.forEach((el) => observer.observe(el));
}

// ---------- Hero 輪播(淡入淡出) + 捲動視差(帶阻尼緩動，避免卡頓) ----------
const HERO_INTERVAL = 4500;        // 每張停留時間(ms)
const HERO_SCROLL_PARALLAX = 150;   // 圖片捲動視差最大位移(px)
const HERO_COPY_RATIO = -1.1;      // 文字視差幅度，比圖片更大且方向相反，往上滑感覺文字往前衝
const HERO_MARK_RATIO = -1.1;     // BREADAY 浮水印視差幅度，同樣反方向，貼著文字一起往上
const HERO_SCALE = 1.06;           // 圖片要比容器大一點，位移才不會露邊
const HERO_EASE = 0.08;            // 阻尼係數(0~1)：越小越滑順、跟手感越輕；越大越貼近即時捲動位置

function initHeroSlideshow() {
  const wrap = document.getElementById('hero-media');
  const heroSection = document.querySelector('.hero');
  const heroCopy = document.querySelector('.hero-copy');
  const heroMark = document.querySelector('.hero-media-mark');
  if (!wrap) return;
  const slides = wrap.querySelectorAll('.hero-slide');
  if (!slides.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let targetShift = 0;
  let currentShift = 0;

  const applyTransform = () => {
    slides.forEach((slide) => {
      slide.style.transform = `scale(${HERO_SCALE}) translateY(${currentShift}px)`;
    });
    if (heroCopy) {
      heroCopy.style.transform = `translateY(${currentShift * HERO_COPY_RATIO}px)`;
    }
    if (heroMark) {
      heroMark.style.transform = `translateY(${currentShift * HERO_MARK_RATIO}px)`;
      const fade = 1 - Math.min(1, Math.abs(currentShift) / (HERO_SCROLL_PARALLAX * 0.85));
      heroMark.style.opacity = fade;
    }
  };
  applyTransform();

  if (reduceMotion) return;

  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
  }, HERO_INTERVAL);

  // rect 的讀取直接放進 rAF 迴圈，不掛在 scroll 事件上。
  // 這樣讀取頻率會跟螢幕更新率同步(通常 60~120Hz)，
  // 不會被瀏覽器的 scroll 事件節流或過量觸發影響，滾動時比較不會頓。
  const updateTarget = () => {
    const rect = (heroSection || wrap).getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = rect.top / window.innerHeight;
    targetShift = progress * -HERO_SCROLL_PARALLAX;
  };

  const loop = () => {
    updateTarget();
    currentShift += (targetShift - currentShift) * HERO_EASE;
    applyTransform();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- 通用捲動視差:給任何帶 data-parallax="速度" 的元素用 ----------
// 速度是 0~1 的相對值,數字越大位移越明顯。之後 Products / Contact 要加視差,
// 直接在該元素上補一個 data-parallax 屬性即可,不用再寫新的滾動邏輯。
const PARALLAX_STRENGTH = 420; // 振幅倍率：原本 300 對 About 頁新增的出血大圖/職人日常區塊來說不夠明顯，
// 拉高到 420，同一組 data-parallax 數值(0.06~0.16)會等比例位移更多，跟 Hero 的 ±150px 手感更接近

function initParallax() {
  const els = document.querySelectorAll('[data-parallax]');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = Array.from(els).map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0.1,
    fixed: el.dataset.parallaxFixed ? parseFloat(el.dataset.parallaxFixed) : null,
    scale: el.dataset.parallaxScale ? parseFloat(el.dataset.parallaxScale) : null,
    current: 0,
    target: 0,
  }));

  const update = () => {
    items.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (item.fixed !== null) {
        // 跟 Hero 同一套公式：只看元素頂部的捲動進度，幅度是直接的 px 數
        const progress = rect.top / window.innerHeight;
        item.target = progress * -item.fixed;
      } else {
        const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
        item.target = (centerOffset / window.innerHeight) * -PARALLAX_STRENGTH * item.speed;
      }
    });
  };

  const loop = () => {
    update();
    items.forEach((item) => {
      item.current += (item.target - item.current) * 0.08;
      const scalePart = item.scale ? ` scale(${item.scale})` : '';
      item.el.style.transform = `translateY(${item.current}px)${scalePart}`;
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- 全站平滑滾動(Lenis) ----------
// Lenis 會接管滑鼠滾輪，用阻尼內插的方式更新真正的 scrollY，
// 所以其他效果(initScrollReveal 的 IntersectionObserver、initParallax
// 讀取的 getBoundingClientRect)完全不用改，會自動跟著變平滑。
function initSmoothScroll() {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

async function safeInit(fn, label) {
  try {
    await fn();
  } catch (err) {
    console.error(`${label} 初始化失敗:`, err);
  }
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    const subject = encodeURIComponent(`來自官網的聯絡表單 - ${name}`);
    const body = encodeURIComponent(`姓名：${name}\nEmail：${email}\n\n${message}`);
    // TODO: 換成實際收件信箱
    window.location.href = `mailto:hello@breaday.tw?subject=${subject}&body=${body}`;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initSmoothScroll();
  await safeInit(loadLayout, 'loadLayout');
  initCharReveal();
  initScrollCharReveal();
  initHeroSlideshow();
  await safeInit(initProducts, 'initProducts');
  await safeInit(initProductDetail, 'initProductDetail');
  await safeInit(initCartPage, 'initCartPage');
  await safeInit(initCartCount, 'initCartCount');
  initContactForm();
  initCraftGallery();
  initScrollReveal();
  initParallax();
});