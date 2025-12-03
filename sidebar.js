(function () {
  const listEl = document.getElementById('list');
  const searchInput = document.getElementById('search');
  const refreshBtn = document.getElementById('refresh');
  // const collapseBtn = document.getElementById('collapse');

  let questions = []; // { questionId, questionText, answerId }
  // let collapsed = true;

  // render UI
  function render() {
    const q = (searchInput.value || '').trim().toLowerCase();
    listEl.innerHTML = '';

    const filtered = questions.filter(item => {
      if (!q) return true;
      return (item.questionText || '').toLowerCase().includes(q);
    });

    if (!filtered.length) {
      listEl.innerHTML = '<div style="padding:12px;color:#666">No questions found.</div>';
      return;
    }

    // show newest first
    for (let i = filtered.length - 1; i >= 0; i--) {
      const it = filtered[i];
      const dom = document.createElement('div');
      dom.className = 'item';
      dom.dataset.qid = it.questionId;

      // const meta = document.createElement('div');
      // meta.className = 'meta';
      // const idx = document.createElement('div');
      // idx.className = 'index';
      // idx.textContent = `Q`;
      // const status = document.createElement('div');
      // status.className = 'status';
      // status.textContent = it.answerId ? 'Answered' : 'Waiting';

      // meta.appendChild(idx);
      // meta.appendChild(status);

      const preview = document.createElement('div');
      preview.className = 'preview';
      preview.textContent = it.questionText.length > 400 ? it.questionText.slice(0, 400) + '...' : it.questionText;

      const actions = document.createElement('div');
      actions.className = 'actions';

      // const goBtn = document.createElement('button');
      // goBtn.className = 'small-btn';
      // goBtn.textContent = 'Go to answer';
      // goBtn.addEventListener('click', (ev) => {
      //   ev.stopPropagation();
      //   const targetId = it.answerId || it.questionId;
      //   parent.postMessage({ type: 'cq-scroll-to', targetId }, '*');
      // });

      // const copyBtn = document.createElement('button');
      // copyBtn.className = 'small-btn';
      // copyBtn.textContent = 'Copy Q';
      // copyBtn.addEventListener('click', (ev) => {
      //   ev.stopPropagation();
      //   navigator.clipboard?.writeText(it.questionText || '').then(() => {
      //     copyBtn.textContent = 'Copied';
      //     setTimeout(() => copyBtn.textContent = 'Copy Q', 900);
      //   }).catch(() => {
      //     copyBtn.textContent = 'Fail';
      //     setTimeout(() => copyBtn.textContent = 'Copy Q', 900);
      //   });
      // });

      // actions.appendChild(goBtn);
      // actions.appendChild(copyBtn);

      // dom.appendChild(meta);
      dom.appendChild(preview);
      dom.appendChild(actions);

      // clicking whole item goes to answer as well
      dom.addEventListener('click', () => {
        // const targetId = it.answerId || it.questionId;
        const targetId = it.questionId;
        parent.postMessage({ type: 'cq-scroll-to', targetId }, '*');
      });

      listEl.appendChild(dom);
    }
  }

  // receive messages from content script
  window.addEventListener('message', (ev) => {
    if (!ev.data || ev.data.type !== 'cq-questions-list') return;

    questions = ev.data.questions || [];
    render();
  });

  // initial request to content script to send current list
  parent.postMessage({ type: 'cq-request-refresh' }, '*');

  searchInput.addEventListener('input', () => render());
  refreshBtn.addEventListener('click', () => parent.postMessage({ type: 'cq-request-refresh' }, '*'));
  // collapseBtn.addEventListener('click', () => {
  //   collapsed = !collapsed;
  //   const previews = document.querySelectorAll('.preview');
  //   previews.forEach(p => {
  //     p.style.maxHeight = collapsed ? '3.0em' : '';
  //   });
  // });

})();
