const field = document.querySelector('#query');
const result = document.querySelector('#search-results');
const archive = document.querySelector('#archive-list');
let indexRequest;

function createStatus(message) {
  const status = document.createElement('p');
  status.className = 'search-status';
  status.textContent = message;
  result.replaceChildren(status);
}

field.addEventListener('input', async () => {
  const query = field.value.trim().toLocaleLowerCase();
  result.hidden = !query;
  archive.hidden = Boolean(query);
  if (!query) return;

  if (!indexRequest) {
    indexRequest = fetch('search-index.json').then(response => {
      if (!response.ok) throw new Error('Index unavailable');
      return response.json();
    }).catch(error => {
      indexRequest = undefined;
      throw error;
    });
  }
  createStatus('正在搜索全书…');

  let index;
  try {
    index = await indexRequest;
  } catch {
    createStatus('搜索暂时不可用，请重试。');
    archive.hidden = false;
    return;
  }
  if (field.value.trim().toLocaleLowerCase() !== query) return;
  const matches = [];
  for (const [title, volume, slug, excerpt, blocks] of index) {
    const hit = blocks.find(([, text]) => text.toLocaleLowerCase().includes(query));
    if (title.toLocaleLowerCase().includes(query) || volume.toLocaleLowerCase().includes(query) || hit) {
      matches.push({title, slug, excerpt, hit});
    }
  }

  createStatus(matches.length ? `找到 ${matches.length} 篇` : '没有找到相关内容');
  const list = document.createElement('ul');
  list.className = 'results';
  for (const {title, slug, excerpt, hit} of matches) {
    const row = document.createElement('li');
    const heading = document.createElement('h3');
    const link = document.createElement('a');
    link.textContent = title;
    link.href = slug + '/' + (hit ? '#' + hit[0] : '');
    heading.append(link);

    const snippet = document.createElement('p');
    if (hit) {
      const text = hit[1];
      const offset = text.toLocaleLowerCase().indexOf(query);
      const start = Math.max(0, offset - 15);
      const end = Math.min(text.length, offset + query.length + 33);
      const mark = document.createElement('mark');
      mark.textContent = text.slice(offset, offset + query.length);
      snippet.append((start ? '…' : '') + text.slice(start, offset), mark,
        text.slice(offset + query.length, end) + (end < text.length ? '…' : ''));
    } else {
      snippet.textContent = excerpt;
    }
    row.append(heading, snippet);
    list.append(row);
  }
  result.append(list);
});
