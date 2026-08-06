import { products } from './data/products.js';

// ★ 之後接後端(BaaS 或客製 API)時，只改這個檔案。
//   回傳格式必須維持 { id, tag, name, price, image }，
//   render.js / main.js 不需要跟著改。
export async function getProducts() {
  return products;
}
