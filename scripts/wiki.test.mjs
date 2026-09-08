import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const data = JSON.parse(await read('wiki/index.json'));
const publishedIds = ['anomaly', 'code', 'compression', 'evaluation', 'multimodal', 'weibo'];
const pages = ['access', 'index', 'publications', ...data.articles.map(a => a.id)].sort();

test('三个语言版本的学术服务统一为助教与合并审稿两项', async () => {
  for (const [file, heading] of [['index', 'Academic Service'], ['Chinese', '学术服务'], ['Russian', 'Академическая деятельность']]) {
    const source = (await read(file + '.qmd')).replaceAll('\r\n', '\n');
    const section = source.split('## ' + heading + '\n')[1]?.split('\n## ')[0];
    assert(section, file + ': missing service section');
    const entries = section.split('\n').filter(line => line.startsWith('- '));
    assert.equal(entries.length, 2, file);
    for (const venue of ['Scientific Reports', 'Discover Applied Sciences', 'JASSS', 'ICIC 2026']) assert(entries[1].includes(venue), file + ': ' + venue);
    assert(entries.every(line => line.includes('2026')), file);
  }
});

test('公开目录仅包含确认过的已发表论文', () => {
  assert.deepEqual(data.papers.map(p => p.id).sort(), publishedIds);
  assert(data.papers.every(p => p.status.startsWith('已') && p.authors.length > 1));
  assert.equal(data.articles.length, 7);
  for (const a of data.articles) {
    assert(a.papers.length && a.papers.every(id => publishedIds.includes(id)));
    assert(a.related.every(id => data.articles.some(other => other.id === id)));
    assert.equal(a.language, 'zh-CN');
  }
});

test('正文在源文件、网页输入、JSON 和纯文本中保持一致', async () => {
  const full = await read('llms-full.txt');
  for (const a of data.articles) {
    const body = (await read(`wiki/_articles/${a.id}.md`)).trim();
    assert.equal(a.bodyMarkdown, body);
    for (const name of [`wiki/${a.id}.qmd`, `wiki/raw/${a.id}.md`]) assert((await read(name)).includes(body));
    assert(full.includes(body));
    assert(!/\b[A-Z]:[\\/]|threadId|\.codex|arxiv\.org|BEGIN PRIVATE KEY/i.test(body));
    const page = await read(`docs/wiki/${a.id}.html`);
    assert(page.includes(a.title));
    assert(page.includes(`href="raw/${a.id}.md"`));
    assert(page.includes(`rel="canonical" href="${a.url}"`));
    assert(!page.includes('href="raw/' + a.id + '.html"'));
  }
});

test('发布目录不存在未索引或重复渲染的文章', async () => {
  const generated = (await readdir(path.join(root, 'wiki'))).filter(f => f.endsWith('.qmd')).map(f => f.slice(0, -4)).sort();
  const rendered = (await readdir(path.join(root, 'docs/wiki'))).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).sort();
  assert.deepEqual(generated, pages);
  assert.deepEqual(rendered, pages);
  const rawFiles = (await readdir(path.join(root, 'docs/wiki/raw'))).sort();
  assert.deepEqual(rawFiles, ['publications.md', ...data.articles.map(a => a.id + '.md')].sort());
});

test('机器端点与主页入口已进入发布目录', async () => {
  for (const name of ['llms.txt', 'llms-full.txt', 'wiki/index.json', 'wiki/wiki.css', 'wiki/search.js', 'robots.txt']) {
    assert.equal(await read(name), await read('docs/' + name));
  }
  for (const name of ['index', 'Chinese', 'Russian']) assert((await read(`docs/${name}.html`)).includes('./wiki/index.html'));
  const sitemap = await read('docs/sitemap.xml');
  assert(sitemap.includes('https://hreyulog.github.io/wiki/index.html') || sitemap.includes('https://hreyulog.github.io/wiki/'));
  assert(!/yulong1|lianyujun|\/raw\/.+\.html/.test(sitemap));
});
