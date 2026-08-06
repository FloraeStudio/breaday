// 純畫面渲染，不碰資料來源。輸入資料格式固定為 { id, tag, name, price, image }
// PARALLAX_SPEEDS：每張卡片的圖片視差速度依序輪替，避免整排格線同步位移、
// 看起來像同一塊板子在動,速度差異刻意保持小,維持日系的克制感。
const PARALLAX_SPEEDS = [0.12, 0.08, 0.16, 0.1, 0.14, 0.09];

export function renderProducts(container, products) {
  container.innerHTML = products.map((p, index) => `
    <a href="#" class="product-card scroll-reveal" data-id="${p.id}" style="--i:${index}">
      <div class="product-media">
        <div class="product-media-img"${p.image ? ` style="background-image:url('${p.image}')"` : ''} data-parallax="${PARALLAX_SPEEDS[index % PARALLAX_SPEEDS.length]}" data-parallax-scale="1.18"></div>
        ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
      </div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">NT$ ${p.price}</div>
    </a>
  `).join('');
}
