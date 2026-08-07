// ★ 唯一需要改網域／token／API 版號的地方。
//   data-service.js、cart-service.js 都從這裡匯入，避免兩處各存一份設定。

export const SHOPIFY_DOMAIN = 'breaday-demo-py3t6qjq.myshopify.com'; // 依照 https://admin.shopify.com/store/網域名稱/.... 修改
export const STOREFRONT_TOKEN = '017980e1bb991f36ca80d29c0b744477';
export const API_VERSION = '2026-04'; // 每季（1/4/7/10月）回來確認一次是否需要更新