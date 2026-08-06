// 共用 Header / Footer:每個頁面只留一個空殼 <header id="site-header">/
// <footer id="site-footer">,實際內容從 partials/header.html、partials/footer.html
// 抓回來填進去。之後要改導覽列或頁尾,只要改這兩個檔案,不用逐頁修改。
//
// 注意:用 fetch() 讀取本機檔案,瀏覽器需要透過 http(s) 伺服器開啟頁面
// (例如 `npx serve` 或 `python3 -m http.server`),直接雙擊開 index.html
// (file:// 協定)會抓不到,這點跟專案原本用 <script type="module"> 的
// 限制是一樣的。

async function loadPartial(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} 回應狀態 ${res.status}`);
    target.innerHTML = await res.text();
  } catch (err) {
    console.error(`載入 ${url} 失敗:`, err);
  }
}

// 每個頁面在 <body data-page="home|about|products|contact"> 標記自己是誰,
// header.html 裡對應的 <a data-page="..."> 就會被加上 .is-active(固定底線)
function markActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll('nav a[data-page]').forEach((link) => {
    if (link.dataset.page === page) link.classList.add('is-active');
  });
}

export async function loadLayout() {
  await Promise.all([
    loadPartial('site-header', 'partials/header.html'),
    loadPartial('site-footer', 'partials/footer.html'),
  ]);
  markActiveNav();
}
