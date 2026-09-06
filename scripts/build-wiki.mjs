import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://hreyulog.github.io';
const catalog = JSON.parse(await readFile(path.join(root, 'wiki/_catalog.json'), 'utf8'));
const { articles, papers, updated } = catalog;
const allowed = new Set(['weibo', 'code', 'evaluation', 'compression', 'multimodal', 'anomaly']);
const paperMap = new Map(papers.map(p => [p.id, p]));
const articleMap = new Map(articles.map(a => [a.slug, a]));
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const write = (name, value) => writeFile(path.join(root, name), value.trimEnd() + '\n', 'utf8');
const json = value => JSON.stringify(value, null, 2);
const prohibited = /\b[A-Z]:[\\/]|threadId|\.codex|arxiv\.org|BEGIN PRIVATE KEY/i;

if (papers.length !== allowed.size || new Set(papers.map(p => p.id)).size !== papers.length || papers.some(p => !allowed.has(p.id) || !p.status.startsWith('已'))) {
  throw new Error('公开论文白名单不匹配。');
}
if (articleMap.size !== articles.length) throw new Error('文章标识重复。');
for (const a of articles) {
  if (!/^[a-z-]+$/.test(a.slug) || !a.papers.length || a.papers.some(id => !allowed.has(id)) || a.related.some(id => !articleMap.has(id))) {
    throw new Error(`文章元数据无效: ${a.slug}`);
  }
  a.body = (await readFile(path.join(root, `wiki/_articles/${a.slug}.md`), 'utf8')).trim();
  if (prohibited.test(json(a))) throw new Error(`公开范围检查未通过: ${a.slug}`);
}

await mkdir(path.join(root, 'wiki/raw'), { recursive: true });
const nav = '<nav class="wiki-nav" aria-label="研究页面导航"><a href="index.html">研究索引</a><a href="publications.html">已发表论文</a><a href="access.html">数据与引用</a><a href="../Chinese.html">个人主页 <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a></nav>';
const html = value => '\n```{=html}\n' + value + '\n```\n';
const front = (title, description, extra = '') => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n${extra}---\n`;
const person = { '@type': 'Person', name: '贺育隆', alternateName: 'Yulong He', url: base };
const schema = data => html('<script type="application/ld+json">' + json(data).replaceAll('<', '\\u003c') + '</script>');
const paperMarkdown = p => `### ${p.chineseTitle}\n\n${p.authors.join(', ')}. **${p.title}**. *${p.venue}*, ${p.year}.\n\n${p.kind} · ${p.status}。${p.versionNote || ''} [原始文献](${p.url})${p.recordUrl ? ` · [机构书目](${p.recordUrl})` : ''}\n`;
const records = [];

for (const a of articles) {
  const sources = a.papers.map(id => paperMap.get(id));
  const url = `${base}/wiki/${a.slug}.html`;
  const rawUrl = `${base}/wiki/raw/${a.slug}.md`;
  const bibliography = sources.map(paperMarkdown).join('\n');
  const raw = `# ${a.title}\n\n作者：贺育隆（Yulong He）\n更新日期：${updated}\n内容类型：已发表论文解读与技术思考\n主题：${a.topic}\n页面：${url}\n\n${a.summary}\n\n${a.body}\n\n## 依据文献\n\n${bibliography}\n\n## 延伸阅读\n\n${a.related.map(id => `- [${articleMap.get(id).title}](${base}/wiki/${id}.html)`).join('\n')}\n`;
  const related = a.related.map(id => `- [${articleMap.get(id).title}](${id}.qmd)`).join('\n');
  await write(`wiki/${a.slug}.qmd`, front(a.title, a.summary) + html(nav) + html(`<div class="note-meta"><span>${escape(a.topic)}</span><span>贺育隆</span><time datetime="${updated}">${updated}</time><span>约 ${a.minutes} 分钟</span><a href="raw/${a.slug}.md" download><i class="bi bi-file-earmark-text" aria-hidden="true"></i> 纯文本</a></div>`) + `\n${a.body}\n\n## 依据文献\n\n${bibliography}\n\n## 延伸阅读\n\n${related}\n` + schema({ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.summary, inLanguage: 'zh-CN', author: person, datePublished: updated, dateModified: updated, mainEntityOfPage: url, url, articleSection: a.topic, citation: sources.map(p => p.url), encoding: { '@type': 'MediaObject', contentUrl: rawUrl, encodingFormat: 'text/markdown' } }));
  await write(`wiki/raw/${a.slug}.md`, raw);
  records.push({ id: a.slug, title: a.title, summary: a.summary, topic: a.topic, language: 'zh-CN', author: person.name, contentType: '已发表论文解读与技术思考', updated, url, markdownUrl: rawUrl, bodyMarkdown: a.body, papers: sources.map(p => p.id), related: a.related });
}

const topics = [...new Set(articles.map(a => a.topic))];
const list = articles.map((a, i) => `<article class="note-row" data-note="${a.slug}" data-topic="${escape(a.topic)}"><span class="note-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div class="note-copy"><div class="note-kicker"><span>${escape(a.topic)}</span><span>${a.slug === 'research-approach' ? '研究总览' : paperMap.get(a.papers[0]).year + ' · ' + paperMap.get(a.papers[0]).kind}</span></div><h2><a href="${a.slug}.html">${escape(a.title)}</a></h2><p>${escape(a.summary)}</p></div><span class="note-time">${a.minutes} 分钟<i class="bi bi-arrow-up-right" aria-hidden="true"></i></span></article>`).join('\n');
const indexBody = html(nav + `
<section class="wiki-intro" aria-label="研究概览">
  <div><p class="wiki-byline">贺育隆 · 研究笔记</p><p class="wiki-lead">从复杂数据中建立表示，<br>用可检验的方法形成判断。</p><p class="wiki-description">关注观点动力学、代码智能与高效机器学习。这里从已发表论文出发，记录问题如何被定义、方法为什么这样选，以及结论的适用边界。</p></div>
  <figure class="author-portrait"><img src="../images/yulong.jpg" width="144" height="144" alt="贺育隆的个人照片"><figcaption>贺育隆 / Yulong He</figcaption></figure>
</section>
<div class="wiki-facts"><span><strong>${papers.length}</strong> 篇已发表论文</span><span><strong>${articles.length}</strong> 篇中文解读</span><span>更新于 ${updated}</span></div>
<section class="reading-path" aria-labelledby="path-title"><h2 id="path-title">从这里开始</h2><div><a href="research-approach.html">研究方法<i class="bi bi-arrow-up-right" aria-hidden="true"></i></a><a href="code-evaluation.html">代码评测<i class="bi bi-arrow-up-right" aria-hidden="true"></i></a><a href="publications.html">论文与出处<i class="bi bi-arrow-up-right" aria-hidden="true"></i></a></div></section>
<section class="note-index" aria-label="文章索引">
<form class="wiki-filters" role="search" id="wiki-search" hidden>
  <div class="search-field"><label for="query">搜索文章</label><div><i class="bi bi-search" aria-hidden="true"></i><input id="query" name="q" type="search" placeholder="主题、方法或关键词" autocomplete="off"></div></div>
  <div class="topic-field"><label for="topic">研究主题</label><select id="topic" name="topic"><option value="">全部主题</option>${topics.map(t => `<option>${escape(t)}</option>`).join('')}</select></div>
  <button class="clear-search" type="reset" aria-label="重置筛选" title="重置筛选"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
</form>
<p id="result-count" class="result-count" role="status" aria-live="polite">全部 ${articles.length} 篇文章</p>
${list}
<p id="no-results" class="no-results" hidden>没有匹配的文章。请更换关键词或研究主题。</p>
</section>
<footer class="wiki-bottom"><p>论文结果属于共同作者的合作成果；文中的方法归纳与工程思考不代表新增实验结论。</p><a href="access.html">数据与引用</a> · <a href="../llms.txt">机器可读索引</a></footer>
<script src="search.js" defer></script>`);
await write('wiki/index.qmd', front('研究与技术思考', '贺育隆的中文研究 Wiki：从已发表论文理解观点动力学、代码智能、高效机器学习与可靠评测。', 'toc: false\npage-layout: full\n') + indexBody + schema({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: '贺育隆 · 研究与技术思考', inLanguage: 'zh-CN', url: `${base}/wiki/`, author: person, hasPart: records.map(r => ({ '@type': 'Article', name: r.title, url: r.url })) }));

const publicationsBody = `\n这里只收录已发表的合作成果，按年份列出。中文标题用于导读，引用时请使用原始题名与完整作者名单。\n\n${papers.map(p => `${paperMarkdown(p)}\n[中文解读](${articles.find(a => a.papers.length === 1 && a.papers[0] === p.id).slug}.qmd)\n`).join('\n')}\n`;
await write('wiki/publications.qmd', front('已发表论文', '贺育隆已发表论文的中文索引、原始文献与技术解读。') + html(nav) + publicationsBody);
await write('wiki/raw/publications.md', '# 已发表论文\n' + publicationsBody.replace(/\]\(([-a-z]+)\.qmd\)/g, `](${base}/wiki/$1.html)`));

const access = `\n本页提供研究文章的可引用文本与结构化目录。网页、纯文本与数据索引使用同一套公开内容。\n\n## 公开范围\n\n收录六篇已发表论文及相关中文解读，不收录未发表项目、内部材料或原始对话。此处是经过主题整理的研究笔记，不是完整聊天记录或个人档案。论文的发表状态与事实以所链接的出版社、论文集及机构记录为准。最近核对日期：${updated}。\n\n## 读取入口\n\n- [简要目录](../llms.txt)：文章地址、主题与公开范围。\n- [完整纯文本](../llms-full.txt)：全部七篇解读及其依据文献。\n- [结构化索引](index.json)：文章正文、摘要、关联文章和完整论文元数据。\n- [论文目录纯文本](raw/publications.md)：原始题名与作者名单。\n\n每篇文章也有独立的 Markdown 地址，位于本目录的 \`raw/\` 下，不需要登录。\n\n## 引用与归属\n\n引用研究结果时，应引用原始论文并保留所有作者；引用这里的方法归纳时，可以引用对应文章链接与更新日期。中文解读不是原论文的逐字翻译。个人思考与论文已报告的发现分别表述，不应把前者提取为已验证的实验结果。\n\n## 数据字段\n\n\`index.json\` 的 \`articles\` 包含 \`id\`、\`title\`、\`summary\`、\`topic\`、\`bodyMarkdown\`、\`url\`、\`markdownUrl\`、\`updated\`、\`papers\` 和 \`related\`。\`papers\` 字段关联顶层论文目录中的稳定标识。\n\n顶层 \`papers\` 提供原始题名、完整作者、年份、发表载体、文献类型、状态及文献地址。微博论文目前为出版社的早期在线发表版本，其状态说明保留在 \`versionNote\` 中。\n\n## 版本与维护\n\n文章源文件与元数据共同生成网页及数据文件，避免两个版本产生差异。新增研究需要先确认公开发表状态，再纳入此目录。网站代码可在[个人主页仓库](https://github.com/hreyulog/hreyulog.github.io)查看。\n`;
await write('wiki/access.qmd', front('数据与引用', '研究 Wiki 的公开范围、引用方式与机器可读入口。') + html(nav) + access);
await write('wiki/index.json', json({ schemaVersion: '1.0', title: '贺育隆 · 研究与技术思考', language: 'zh-CN', updated, home: `${base}/wiki/`, scope: '仅包含已发表论文及相关中文解读；不包含未发表项目、内部材料或原始对话。', interpretation: '技术思考不是新增实验结论；论文结果属于共同作者。', author: person, articles: records, papers }) + '\n');
await write('llms.txt', `# 贺育隆 · 研究与技术思考\n\n> 全中文研究 Wiki。仅收录已发表论文及相关技术思考；不包含未发表项目、内部材料或原始对话。\n\n更新：${updated}\n\n## 入口\n\n- [网页](${base}/wiki/)\n- [结构化索引](${base}/wiki/index.json)\n- [完整纯文本](${base}/llms-full.txt)\n- [论文目录](${base}/wiki/raw/publications.md)\n- [公开范围与引用](${base}/wiki/access.html)\n\n## 文章\n\n${records.map(r => `- [${r.title}](${r.markdownUrl}): ${r.summary}`).join('\n')}\n\n## 归属\n\n论文结果属于完整作者名单中的共同作者。中文解读中的方法认识不是新增的实证结果。发表信息和结果以原始论文为准。\n`);
await write('llms-full.txt', '# 贺育隆 · 研究与技术思考\n\n' + `更新：${updated}。仅含已发表成果与相关解读，非对话记录。\n\n` + (await Promise.all(articles.map(a => readFile(path.join(root, `wiki/raw/${a.slug}.md`), 'utf8')))).join('\n\n---\n\n'));

// Keep the source sitemap aligned with Quarto's published page paths.
const pages = ['/', '/Chinese.html', '/Russian.html', '/wiki/', ...articles.map(a => `/wiki/${a.slug}.html`), '/wiki/publications.html', '/wiki/access.html'];
await write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(p => `  <url><loc>${base}${p}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log(`Wiki built: ${articles.length} articles, ${papers.length} published papers.`);
