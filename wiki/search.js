(async () => {
  const form = document.getElementById('wiki-search');
  if (!form) return;
  const query = document.getElementById('query');
  const topic = document.getElementById('topic');
  const count = document.getElementById('result-count');
  const empty = document.getElementById('no-results');
  const rows = [...document.querySelectorAll('[data-note]')];
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('zh-CN');
  try {
    const response = await fetch('index.json');
    if (!response.ok) throw new Error('index unavailable');
    const data = await response.json();
    const search = new Map(data.articles.map(a => [a.id, normalize([a.title, a.summary, a.topic, a.bodyMarkdown].join(' '))]));
    const apply = (updateUrl = true) => {
      const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
      let visible = 0;
      rows.forEach(row => {
        const text = search.get(row.dataset.note) || '';
        row.hidden = Boolean(topic.value && row.dataset.topic !== topic.value) || !words.every(word => text.includes(word));
        if (!row.hidden) visible++;
      });
      count.textContent = `显示 ${visible} / ${rows.length} 篇文章`;
      empty.hidden = visible !== 0;
      if (updateUrl) {
        const url = new URL(location.href);
        query.value.trim() ? url.searchParams.set('q', query.value.trim()) : url.searchParams.delete('q');
        topic.value ? url.searchParams.set('topic', topic.value) : url.searchParams.delete('topic');
        history.replaceState(null, '', url);
      }
    };
    const restore = () => {
      const params = new URLSearchParams(location.search);
      query.value = params.get('q') || '';
      const candidate = params.get('topic') || '';
      topic.value = [...topic.options].some(o => o.value === candidate) ? candidate : '';
      apply(false);
    };
    form.hidden = false;
    query.addEventListener('input', () => apply());
    topic.addEventListener('change', () => apply());
    form.addEventListener('submit', event => { event.preventDefault(); apply(); });
    form.addEventListener('reset', event => { event.preventDefault(); query.value = ''; topic.value = ''; apply(); query.focus(); });
    window.addEventListener('popstate', restore);
    restore();
  } catch {
    count.textContent = `全文检索暂不可用，以下为全部 ${rows.length} 篇文章。`;
  }
})();
