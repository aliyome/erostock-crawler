const fs = require('fs');
const axios = require('axios');
const { JSDOM } = require('jsdom');

/// fetchDom は指定したURLのDOMを返します
const fetchDom = async url => {
  const res = await axios.get(url);
  if (res.status !== 200) {
    console.error(res.status);
    return [];
  }
  const dom = new JSDOM(res.data);
  return dom;
};

/// getPageSummary はエロストックのエロスト一覧ページのDOMから各素材の情報を取得します
/// 素材一覧ページ： https://erostock.net/sozai/page/${page_num}
const getPageSummary = dom => {
  const articles = dom.window.document.querySelectorAll('article');
  const list = [];
  articles.forEach((html, key, parent) => {
    const title = html.textContent.trim();
    const url = html.querySelector('a').href;
    const thumb = html.querySelector('img').src;
    const id = /\/sozai\/(.*)/.exec(url)[1];
    list.push({ id, title, url, thumb, description: null });
    console.log({ id, title, url, thumb });
  });
  return list;
};

/// fetchPageSummary はエロストックのエロスト一覧ページのDOMから各素材の情報を取得します
/// 素材一覧ページ： https://erostock.net/sozai/page/${page_num}
const fetchPageSummary = async url => {
  const dom = await fetchDom(url);
  if (dom == []) {
    return [];
  }
  const summary = getPageSummary(dom);
  return summary;
};

/// fetchDescription はエロストックの素材詳細ページのURLから説明文を取得します
/// 素材詳細ページ例： https://erostock.net/sozai/santa_hat
const fetchDescription = async url => {
  const dom = await fetchDom(url);
  // 不要な文字列を消すために不要な要素を消す
  dom.window.document.querySelector('.entry-content p a').remove();
  const description = dom.window.document
    .querySelector('.entry-content p')
    .textContent.replace(/\r?\n/g, '')
    .trim();

  return description;
};

/// writeHeaderLine はcsvヘッダをファイルに書き込みます
const writeHeaderLine = fd => {
  fs.writeSync(fd, `id,title,description,url,thumb\n`);
};

/// writeLine はcsvに1行追記します
const writeLine = (fd, val) => {
  fs.writeSync(fd, `${val.id},${val.title},${val.description},${val.url},${val.thumb}\n`);
};

/// main
const main = async () => {
  const result = new Map();
  const fd = fs.openSync('result.csv', 'w');
  writeHeaderLine(fd);

  for (let i = 0; i < 50; i++) {
    const page_url = `https://erostock.net/sozai/page/${i}`;
    console.log(page_url);

    const page_summary = await fetchPageSummary(page_url);
    if (page_summary === []) {
      break;
    }

    for (const s of page_summary) {
      const description = await fetchDescription(s.url);
      s.description = description;
      result.set(s.id, s);
      writeLine(fd, s);
    }
  }

  fs.closeSync(fd);
};

main().catch(console.error);
