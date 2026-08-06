// 純畫面渲染，不碰資料來源。輸入資料格式固定為 { id, tag, name, price, image }
// 大圖片、不規則格線（不對稱 bento），不做視差
export function renderProducts(container, products) {
  container.innerHTML = products.map((p, index) => `
    <a href="#" class="product-card scroll-reveal" data-id="${p.id}" style="--i:${index}">
      <div class="product-media">
        <div class="product-media-img"${p.image ? ` style="background-image:url('${p.image}')"` : ''}></div>
        ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
      </div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">NT$ ${p.price}</div>
    </a>
  `).join('');
}

export function renderProductList(container, products) {
  container.innerHTML = products.map((p, index) => `
    <li class="product-row scroll-reveal" style="--i:${index}">
      <a href="#" class="product-row-link" data-id="${p.id}">
        <span class="product-row-media"${p.image ? ` style="background-image:url('${p.image}')"` : ''}></span>
        <span class="product-row-info">
          <span class="product-row-name">${p.name}</span>
          ${p.tag ? `<span class="product-row-tag">${p.tag}</span>` : ''}
        </span>
        <span class="product-row-price">NT$ ${p.price}</span>
      </a>
    </li>
  `).join('');
}