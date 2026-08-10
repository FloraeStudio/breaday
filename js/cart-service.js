// ★ 購物車邏輯層，統一經由 Shopify Cart API 操作。
//   Cart ID 存在 localStorage，跨頁面／重新整理都會保留同一台購物車。
//   跟 data-service.js 共用同一組 Shopify 連線設定（避免兩處各存一份、之後改設定要改兩次）。

import { SHOPIFY_DOMAIN, STOREFRONT_TOKEN, API_VERSION } from './shopify-config.js';

const CART_ID_KEY = 'breaday_cart_id';

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 50) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              image { url }
              product { title }
              priceV2 { amount currencyCode }
            }
          }
        }
      }
    }
  }
`;

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error('Shopify Cart API error:', json.errors);
    throw new Error(json.errors[0]?.message ?? 'Shopify API 發生未知錯誤');
  }
  return json.data;
}

// 強制結帳頁使用繁體中文，不依賴訪客瀏覽器語言設定或 Shopify 的地區自動偵測
// （後台 Markets 目前沒有「強制預設語言」選項，這裡直接在網址層解決最穩定）
function withForcedLocale(checkoutUrl) {
  if (!checkoutUrl) return checkoutUrl;
  const url = new URL(checkoutUrl);
  url.searchParams.set('locale', 'zh-TW');
  return url.toString();
}

// 把 API 回傳的 cart 物件轉成前端好用的簡化格式
function formatCart(cart) {
  if (!cart) return null;
  return {
    id: cart.id,
    checkoutUrl: withForcedLocale(cart.checkoutUrl),
    subtotal: cart.cost.subtotalAmount.amount,
    total: cart.cost.totalAmount.amount,
    currency: cart.cost.totalAmount.currencyCode,
    lines: cart.lines.edges.map(({ node }) => ({
      lineId: node.id,
      quantity: node.quantity,
      variantId: node.merchandise.id,
      name: node.merchandise.product.title,
      variantTitle: node.merchandise.title,
      price: node.merchandise.priceV2.amount,
      image: node.merchandise.image?.url ?? '',
    })),
  };
}

async function createCart() {
  const query = `
    mutation cartCreate {
      cartCreate {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    ${CART_FRAGMENT}
  `;
  const data = await shopifyFetch(query);
  const cart = data.cartCreate.cart;
  localStorage.setItem(CART_ID_KEY, cart.id);
  return cart;
}

async function fetchCartById(cartId) {
  const query = `
    query getCart($id: ID!) {
      cart(id: $id) { ...CartFields }
    }
    ${CART_FRAGMENT}
  `;
  const data = await shopifyFetch(query, { id: cartId });
  return data.cart; // 若購物車過期或不存在，Shopify 會回傳 null
}

// 取得目前購物車；若 localStorage 沒有記錄、或記錄的購物車已失效，會自動建一台新的
async function getOrCreateCart() {
  const savedId = localStorage.getItem(CART_ID_KEY);
  if (savedId) {
    const existing = await fetchCartById(savedId);
    if (existing) return formatCart(existing);
    localStorage.removeItem(CART_ID_KEY); // 舊 ID 失效，清掉重建
  }
  const created = await createCart();
  return formatCart(created);
}

// 加入商品。variantId 是 ProductVariant 的 GID，不是 Product 的 ID，
// 商品詳情頁要另外查 variants 欄位才拿得到，不能直接用商品列表的 id。
async function addToCart(variantId, quantity = 1) {
  const cart = await getOrCreateCart();
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    ${CART_FRAGMENT}
  `;
  const data = await shopifyFetch(query, {
    cartId: cart.id,
    lines: [{ merchandiseId: variantId, quantity }],
  });
  if (data.cartLinesAdd.userErrors.length) {
    throw new Error(data.cartLinesAdd.userErrors.map((e) => e.message).join('; '));
  }
  return formatCart(data.cartLinesAdd.cart);
}

// 修改某個購物車項目的數量（quantity 設為 0 等同刪除）
async function updateCartLine(lineId, quantity) {
  const cart = await getOrCreateCart();
  const query = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    ${CART_FRAGMENT}
  `;
  const data = await shopifyFetch(query, {
    cartId: cart.id,
    lines: [{ id: lineId, quantity }],
  });
  return formatCart(data.cartLinesUpdate.cart);
}

async function removeFromCart(lineId) {
  const cart = await getOrCreateCart();
  const query = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    ${CART_FRAGMENT}
  `;
  const data = await shopifyFetch(query, { cartId: cart.id, lineIds: [lineId] });
  return formatCart(data.cartLinesRemove.cart);
}

export { getOrCreateCart, addToCart, updateCartLine, removeFromCart };