// ★ 之後接後端(BaaS 或客製 API)時，只改這個檔案。
//   回傳格式必須維持 { id, tags, name, price, image }，
//   render.js / main.js 不需要跟著改。

import { SHOPIFY_DOMAIN, STOREFRONT_TOKEN, API_VERSION } from './shopify-config.js';

const QUERY = `
  query getProducts {
    products(first: 20) {
      edges {
        node {
          id
          handle
          title
          tags
          productType
          priceRange { minVariantPrice { amount } }
          compareAtPriceRange { minVariantPrice { amount } }
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
  // category 來自 Shopify 後台商品的「Product type」欄位(不是 tags),
  // 之後要加新分類(例如「禮盒」),後台商品填對 Product type 就會自動歸類，前端不用再改。
  return data.products.edges.map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    tags: node.tags || [],
    category: node.productType || '麵包',
    name: node.title,
    price: node.priceRange.minVariantPrice.amount,
    compareAtPrice: node.compareAtPriceRange?.minVariantPrice?.amount ?? null,
    image: node.featuredImage?.url ?? '',
  }));
}

// ★ 商品詳情頁專用：用 handle（網址上的 slug）查單一商品完整資料，
//   包含多張圖片、完整描述、以及所有變體(variants，例如口味/尺寸)。
//   variants 才有 addToCart 需要的 merchandiseId，商品列表拿到的 id 不能直接拿去加入購物車。
const PRODUCT_QUERY = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      description
      tags
      images(first: 8) {
        edges { node { url altText } }
      }
      options { name values }
      variants(first: 20) {
        edges {
          node {
            id
            title
            availableForSale
            price { amount }
            compareAtPrice { amount }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

export async function getProductByHandle(handle) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query: PRODUCT_QUERY, variables: { handle } }),
  });

  const { data } = await res.json();
  const node = data?.product;
  if (!node) return null; // handle 不存在或商品已下架

  const images = node.images.edges.map(({ node: img }) => ({
    url: img.url,
    alt: img.altText || node.title,
  }));

  const variants = node.variants.edges.map(({ node: v }) => ({
    id: v.id,
    title: v.title,
    available: v.availableForSale,
    price: v.price.amount,
    compareAtPrice: v.compareAtPrice?.amount ?? null,
    options: v.selectedOptions, // [{ name, value }]
  }));

  return {
    id: node.id,
    handle: node.handle,
    name: node.title,
    tags: node.tags || [],
    description: node.description || '',
    images,
    options: node.options, // [{ name, values: [...] }]
    variants,
  };
}