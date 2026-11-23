(() => {
  const key = 'berkhof.podcast.position.v1';
  const audio = document.querySelector('#audio');
  const dock = document.querySelector('#dock');
  const title = document.querySelector('#now');
  const download = document.querySelector('#download');
  const speed = document.querySelector('#speed');
  const follow = document.querySelector('#follow');
  const resume = document.querySelector('#resume');
  const filter = document.querySelector('#filter');
  const list = [...document.querySelectorAll('a[data-episode]')].filter(link => link.closest('.episode'));
  let current = null;
  let lastWrite = 0;
  let state = {last: '', timestamps: {}, speed: 1};
  try { state = {...state, ...JSON.parse(localStorage.getItem(key) || '{}')}; } catch {}

  function save() {
    if (current && Number.isFinite(audio.currentTime)) {
      state.last = current.dataset.episode;
      state.timestamps[state.last] = audio.ended ? 0 : audio.currentTime;
    }
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }

  function nextEpisode() {
    const next = list[list.indexOf(current) + 1];
    if (next) choose(next, true);
  }

  function choose(link, play) {
    if (!link) return;
    if (current !== link) {
      if (current) save();
      for (const item of list) item.removeAttribute('aria-current');
      link.setAttribute('aria-current', 'true');
      current = link;
      title.textContent = link.dataset.title;
      download.href = link.href;
      download.download = link.dataset.title + '.m4a';
      const time = Number(state.timestamps[link.dataset.episode]) || 0;
      audio.src = link.href;
      const restore = () => {
        if (current === link && time > 1 && time < audio.duration - .5) audio.currentTime = time;
      };
      audio.addEventListener('loadedmetadata', restore, {once:true});
      audio.playbackRate = Number(speed.value);
      dock.hidden = false;
      document.body.classList.add('playing');
      document.querySelector('#next').disabled = list.at(-1) === link;
    }
    if (play) {
      history.replaceState(null, '', '#' + link.dataset.episode);
      audio.play().catch(() => {});
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('a[data-episode]');
    if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = list.find(item => item.dataset.episode === trigger.dataset.episode);
    if (!link) return;
    event.preventDefault();
    choose(link, true);
  });
  document.querySelector('#next').onclick = nextEpisode;
  speed.value = String(state.speed);
  if (!speed.value) speed.value = '1';
  speed.onchange = () => {
    state.speed = Number(speed.value);
    audio.playbackRate = state.speed;
    save();
  };
  audio.addEventListener('timeupdate', () => {
    if (Date.now() - lastWrite > 4000) { lastWrite = Date.now(); save(); }
  });
  audio.addEventListener('pause', save);
  audio.addEventListener('ended', save);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  filter.onchange = () => {
    for (const group of document.querySelectorAll('.volume')) {
      group.hidden = Boolean(filter.value) && group.dataset.volume !== filter.value;
    }
  };

  follow.onclick = async () => {
    try {
      await navigator.clipboard.writeText(follow.dataset.feed);
      follow.textContent = '已复制订阅地址';
    } catch {
      const manual = document.querySelector('#manual-feed');
      manual.open = true;
      manual.scrollIntoView();
    }
  };

  function loadFromHash() {
    const episode = location.hash.slice(1);
    if (episode) choose(list.find(item => item.dataset.episode === episode), false);
  }
  const last = list.find(item => item.dataset.episode === state.last);
  if (last) {
    resume.hidden = false;
    resume.href = last.href;
    resume.dataset.episode = last.dataset.episode;
  }
  addEventListener('hashchange', loadFromHash);
  loadFromHash();
})();
