// 純畫面渲染，不碰資料來源。輸入資料格式固定為 { id, handle, tag, name, price, image }
// 大圖片、不規則格線（不對稱 bento），不做視差

function formatPrice(price) {
  return `NT$ ${Math.round(Number(price)).toLocaleString('zh-Hant-TW')}`;
}

export function renderPriceHtml(price, compareAtPrice) {
  const onSale = compareAtPrice && Number(compareAtPrice) > Number(price);
  if (!onSale) return `<span class="price-sale">${formatPrice(price)}</span>`;
  return `<span class="price-group">
      <span class="price-original">${formatPrice(compareAtPrice)}</span>
      <span class="price-sale">${formatPrice(price)}</span>
      <span class="price-badge">特惠</span>
    </span>`;
}

export function renderProducts(container, products) {
  container.innerHTML = products.map((p, index) => `
    <a href="product.html?handle=${encodeURIComponent(p.handle)}" class="product-card scroll-reveal" data-id="${p.id}" style="--i:${index}">
      <div class="product-media">
        <div class="product-media-img"${p.image ? ` style="background-image:url('${p.image}')"` : ''}></div>
        ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
      </div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${renderPriceHtml(p.price, p.compareAtPrice)}</div>
    </a>
  `).join('');
}

export function renderProductList(container, products) {
  container.innerHTML = products.map((p, index) => `
    <li class="product-row scroll-reveal" style="--i:${index}">
      <a href="product.html?handle=${encodeURIComponent(p.handle)}" class="product-row-link" data-id="${p.id}">
        <span class="product-row-media"${p.image ? ` style="background-image:url('${p.image}')"` : ''}></span>
        <span class="product-row-info">
          <span class="product-row-name">${p.name}</span>
          ${p.tag ? `<span class="product-row-tag">${p.tag}</span>` : ''}
        </span>
        <span class="product-row-price">${renderPriceHtml(p.price, p.compareAtPrice)}</span>
      </a>
    </li>
  `).join('');
}

// ---------- 商品詳情頁 ----------
// 輸入資料格式:{ id, handle, name, tag, description, images:[{url,alt}], options:[{name,values}], variants:[{id,title,available,price,options}] }
// 只負責畫出骨架,互動邏輯(切圖、選規格、加入購物車)交給 main.js 的 initProductDetail 處理，
// 這裡跟其他 render 函式一樣維持「只管畫面、不管資料/事件」的分工。
export function renderProductDetail(container, product) {
  const hasImages = product.images.length > 0;
  const mainImage = hasImages ? product.images[0] : null;

  const thumbsHtml = hasImages
    ? product.images.map((img, i) => `
        <button type="button" class="product-thumb${i === 0 ? ' is-active' : ''}" data-src="${img.url}" data-index="${i}" aria-label="第 ${i + 1} 張圖片" style="background-image:url('${img.url}')"></button>
      `).join('')
    : '';

  // Shopify 只有單一規格時，會自動生成一個叫「Title / Default Title」的假選項，
  // 這種情況不需要顯示規格選單，直接當單一商品賣。
  const hasRealOptions = product.options.some(
    (opt) => !(opt.name === 'Title' && opt.values.length === 1 && opt.values[0] === 'Default Title')
  );

  const optionsHtml = hasRealOptions
    ? product.options.map((opt) => `
        <div class="product-option" data-option-name="${opt.name}">
          <div class="product-option-label">${opt.name}</div>
          <div class="product-option-values">
            ${opt.values.map((v, i) => `
              <button type="button" class="option-swatch${i === 0 ? ' is-active' : ''}" data-option-name="${opt.name}" data-option-value="${v}">${v}</button>
            `).join('')}
          </div>
        </div>
      `).join('')
    : '';

  container.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery scroll-reveal">
        <div class="product-gallery-main">
          <div class="product-gallery-mark" aria-hidden="true">BREADAY</div>
          ${mainImage
      ? `<img class="product-gallery-img" id="pd-main-img" src="${mainImage.url}" alt="${mainImage.alt}">`
      : `<div class="product-gallery-img product-gallery-img-placeholder" id="pd-main-img"></div>`}
        </div>
        ${product.images.length > 1 ? `<div class="product-gallery-thumbs">${thumbsHtml}</div>` : ''}
      </div>

      <div class="product-info">
        <div class="section-index" aria-hidden="true">
          <span>DETAIL</span>
          <span>${(product.tag || 'PRODUCT').toUpperCase()}</span>
        </div>

        <div class="product-info-body scroll-reveal">
          ${product.tag ? `<div class="product-info-tag">${product.tag}</div>` : ''}
          <h1 class="product-info-title">${product.name}</h1>
          <div class="product-info-divider" aria-hidden="true"></div>
          <div class="product-info-price" id="pd-price">${product.variants[0] ? renderPriceHtml(product.variants[0].price, product.variants[0].compareAtPrice) : ''}</div>

          ${product.description ? `<p class="product-info-desc">${product.description}</p>` : ''}

          <div id="pd-options">${optionsHtml}</div>

          <p class="product-info-feedback" id="pd-feedback" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;
}

// 找不到商品(handle 錯誤、商品下架)時的空狀態畫面
export function renderProductNotFound(container) {
  container.innerHTML = `
    <div class="product-not-found scroll-reveal">
      <div class="section-index" aria-hidden="true">
        <span>404</span>
        <span>NOT FOUND</span>
      </div>
      <div class="product-not-found-body">
        <h1 class="product-info-title">找不到這項商品</h1>
        <p class="product-info-desc">這個商品可能已經下架，或連結有誤，歡迎回到商品列表看看其他選擇。</p>
        <a href="products.html" class="btn btn-accent">回到所有商品 →</a>
      </div>
    </div>
  `;
}

// ---------- 購物車頁(cart.html) ----------
// 輸入資料格式:cart-service.js 的 formatCart() 回傳的
// { id, checkoutUrl, subtotal, total, currency, lines:[{lineId, quantity, variantId, name, variantTitle, price, image}] }
// 不需要結帳功能，所以先刪除
