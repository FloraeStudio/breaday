// mock 商品資料，之後接後端只需改 data-service.js 的 getProducts() 實作
export const products = [
  { id: 'p01', tag: '本週新品', name: '熊本熔岩起司包', price: 65,  image: 'assets/images/product/product-01.webp' },
  { id: 'p02', tag: '人氣款',   name: '厚切奶油吐司',   price: 120, image: 'assets/images/product/product-02.webp' },
  { id: 'p03', tag: '每日限量', name: '天然酵母鄉村麵包', price: 180, image: 'assets/images/product/product-03.webp' },
  { id: 'p04', tag: '',        name: '蜂蜜全麥餐包(6入)', price: 150, image: 'assets/images/product/product-04.webp' },
  { id: 'p05', tag: '甜點系',  name: '熊本紅豆奶油卷', price: 55,  image: 'assets/images/product/product-05.webp' },
  { id: 'p06', tag: '',        name: '法式可頌',       price: 60,  image: 'assets/images/product/product-06.webp' },
];
