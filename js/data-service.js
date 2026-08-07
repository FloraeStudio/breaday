// ★ 之後接後端(BaaS 或客製 API)時，只改這個檔案。
//   回傳格式必須維持 { id, tag, name, price, image }，
//   render.js / main.js 不需要跟著改。

import { SHOPIFY_DOMAIN, STOREFRONT_TOKEN, API_VERSION } from './shopify-config.js';

const QUERY = `
  query getProducts {
    products(first: 20) {
      edges {
        node {
          id
          title
          tags
          priceRange { minVariantPrice { amount } }
          featuredImage { url }
        }
      }
    }
  }
`;

export async function getProducts() {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query: QUERY }),
  });

  const { data } = await res.json();

  // 轉換成 render.js 原本吃的格式，維持介面不變
  return data.products.edges.map(({ node }) => ({
    id: node.id,
    tag: node.tags?.[0] ?? '',
    name: node.title,
    price: node.priceRange.minVariantPrice.amount,
    image: node.featuredImage?.url ?? '',
  }));
}