(() => {
  const IFRAME_ID = 'cq-nav-iframe';
  const TOGGLE_BTN_ID = 'cq-nav-toggle-btn';

  console.log('ChatQ Navigator: content script loaded');

  // ---------- Helpers ----------
  function makeId(prefix = 'cq') {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
  }

  // Inject iframe sidebar
  function injectSidebarIframe() {
    if (document.getElementById(IFRAME_ID)) return;

    const iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = chrome.runtime.getURL('sidebar.html');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      top: '64px',
      width: '360px',
      height: 'calc(100vh - 64px)',
      border: '0',
      zIndex: 2147483647,
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
      // background: '#fff',
      background: '#1f1f1f',          /* pepper */
      color: '#e5e5e5',               /* salt */
      transform: 'translateX(0)',
      transition: 'transform 180ms ease'
    });

    document.body.appendChild(iframe);
    iframe.style.transform = "translateX(100%)"; // default: closed
    iframe.dataset.open = "false";

    injectToggleButton();
  }

  function injectToggleButton() {
    if (document.getElementById(TOGGLE_BTN_ID)) return;
  
    const SIDEBAR_WIDTH = 350; // adjust to your actual iframe width
  
    const btn = document.createElement('div');
    btn.id = TOGGLE_BTN_ID;
    btn.textContent = '<';  // default closed → show open arrow
  
    Object.assign(btn.style, {
      position: 'fixed',
      top: '50%',
      right: '0px',
      transform: 'translateY(-50%)',
      zIndex: 2147483647,
      width: '40px',
      padding: '12px 0',
      background: '#e5e5e5',
      color: '#1f1f1f',
      fontSize: '20px',
      fontWeight: 'bold',
      writingMode: 'horizontal-tb',
      borderRadius: '8px 0 0 8px',
      cursor: 'pointer',
      textAlign: 'center',
      userSelect: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      transition: 'right 0.3s ease'
    });
  
    btn.addEventListener('click', () => {
      const iframe = document.getElementById(IFRAME_ID);
      if (!iframe) return;
  
      const isOpen = iframe.dataset.open === 'true';
  
      if (isOpen) {
        // CLOSE sidebar
        iframe.style.transform = 'translateX(100%)';
        iframe.dataset.open = 'false';
  
        btn.style.right = '0px';
        btn.textContent = '<';   // show open arrow
  
      } else {
        // OPEN sidebar
        iframe.style.transform = 'translateX(0)';
        iframe.dataset.open = 'true';
  
        btn.style.right = SIDEBAR_WIDTH + 'px';
        btn.textContent = '>';   // show close arrow
      }
    });
  
    document.body.appendChild(btn);
  }
    
  
  

  // function injectToggleButton() {
  //   if (document.getElementById(TOGGLE_BTN_ID)) return;

  //   const btn = document.createElement('button');
  //   btn.id = TOGGLE_BTN_ID;
  //   btn.textContent = 'Navigator';
  //   Object.assign(btn.style, {
  //     position: 'fixed',
  //     right: '370px',
  //     top: '24px',
  //     zIndex: 2147483647,
  //     padding: '8px 12px',
  //     borderRadius: '8px',
  //     border: 'none',
  //     cursor: 'pointer',
  //     background: '#0366d6',
  //     color: '#fff',
  //     fontWeight: '600',
  //     boxShadow: '0 6px 18px rgba(0,0,0,0.15)'
  //   });

  //   btn.addEventListener('click', () => {
  //     const iframe = document.getElementById(IFRAME_ID);
  //     if (!iframe) return;
  //     iframe.style.transform = iframe.style.transform === 'translateX(100%)' ? 'translateX(0)' : 'translateX(100%)';
  //   });

  //   document.body.appendChild(btn);
  // }

  // ---------- Parsing messages ----------
  // We will try to use stable attributes if present: [data-message-id] and [data-message-author-role]
  // Falls back to heuristics if needed.
  function collectUserQuestions() {
    const results = [];

    // Try the stable selector first
    let msgNodes = Array.from(document.querySelectorAll('[data-message-id]'));

    // If none found, try role attribute
    if (!msgNodes.length) {
      msgNodes = Array.from(document.querySelectorAll('[data-message-author-role], [data-author]'));
    }

    // As a last resort, fallback to listitems in a conversation container
    if (!msgNodes.length) {
      msgNodes = Array.from(document.querySelectorAll('div')).filter(n => {
        const text = (n.innerText || '').trim();
        return text.length > 5 && n.childElementCount < 12; // heuristic
      });
    }

    // Walk nodes, pick user messages and find next assistant message
    for (let i = 0; i < msgNodes.length; i++) {
      const node = msgNodes[i];

      // get role if available
      const role = node.getAttribute('data-message-author-role') ||
                   node.getAttribute('data-author') ||
                   node.getAttribute('aria-label') ||
                   '';

      // Simple role detection (case-insensitive)
      const roleLower = (role || '').toString().toLowerCase();

      // Heuristic: if role contains 'user' OR node appears to come from user (we prioritize explicit role)
      const isUser = roleLower.includes('user') || (!role && node.className && /user/i.test(node.className));
      if (!isUser) {
        // Check if the node text looks like "You: ..." (rare)
        if (!node.innerText) continue;
        const txt = node.innerText.trim().toLowerCase();
        if (!txt) continue;
        if (!(txt.startsWith('you:') || txt.startsWith('user:') || /^(i |i'|i am )/.test(txt))) {
          continue;
        }
      }

      // Get question text (trim)
      const questionText = node.innerText.trim();
      if (!questionText) continue;

      // Find the next assistant node among subsequent nodes
      let assistantNode = null;
      for (let j = i + 1; j < msgNodes.length; j++) {
        const cand = msgNodes[j];
        const candRole = (cand.getAttribute('data-message-author-role') || cand.getAttribute('data-author') || '').toLowerCase();
        if (candRole.includes('assistant') || candRole.includes('bot') || candRole.includes('gpt') || candRole.includes('ai')) {
          assistantNode = cand;
          break;
        }

        // Heuristic: if cand has an avatar alt or aria-label containing assistant
        const img = cand.querySelector('img[alt], img[aria-label]');
        const alt = img ? (img.getAttribute('alt') || img.getAttribute('aria-label') || '').toLowerCase() : '';
        if (alt.includes('assistant') || alt.includes('gpt') || alt.includes('openai')) {
          assistantNode = cand;
          break;
        }
      }

      // If assistantNode is null, use next sibling as fallback
      if (!assistantNode && msgNodes[i + 1]) assistantNode = msgNodes[i + 1];

      // Create/attach stable IDs to both nodes (user and assistant)
      try {
        const userId = node.getAttribute('data-nav-id') || makeId('q');
        node.setAttribute('data-nav-id', userId);

        let assistantId = null;
        if (assistantNode) {
          assistantId = assistantNode.getAttribute('data-nav-id') || makeId('a');
          assistantNode.setAttribute('data-nav-id', assistantId);
        }

        results.push({
          questionId: userId,
          questionText: questionText,
          answerId: assistantId // may be null until assistant replies
        });
      } catch (e) {
        // ignore setAttribute errors in some environments
        console.warn('ChatQ Navigator: failed to tag node', e);
      }
    }

    return results;
  }

  // Build payload and post to iframe
  function pushQuestionsToIframe() {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe || !iframe.contentWindow) return;

    const questions = collectUserQuestions();
    const payload = questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answerId: q.answerId
    }));

    iframe.contentWindow.postMessage({ type: 'cq-questions-list', questions: payload }, '*');
  }

  // ---------- Message listener (from iframe) ----------
  window.addEventListener('message', (ev) => {
    if (!ev.data || !ev.data.type) return;

    if (ev.data.type === 'cq-scroll-to') {
      const id = ev.data.targetId; // this will be answerId (assistant) if available, else questionId
      if (!id) return;

      // Try to find element by data-nav-id
      const el = document.querySelector(`[data-nav-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // flash highlight
        const prevOutline = el.style.outline;
        el.style.transition = 'box-shadow 160ms ease';
        el.style.boxShadow = '0 0 0 4px rgba(255,215,0,0.95)';
        setTimeout(() => { el.style.boxShadow = ''; el.style.outline = prevOutline; }, 1600);
        return;
      } else {
        console.warn('ChatQ Navigator: target element not found for id', id);
      }
    } else if (ev.data.type === 'cq-request-refresh') {
      pushQuestionsToIframe();
    }
  });

  // ---------- Observe DOM changes ----------
  let observer = null;
  function startObserver() {
    stopObserver();
    observer = new MutationObserver(() => {
      // slight debounce
      if (observer._pending) return;
      observer._pending = true;
      setTimeout(() => {
        pushQuestionsToIframe();
        observer._pending = false;
      }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ---------- Bootstrap ----------
  function bootstrap() {
    injectSidebarIframe();
    pushQuestionsToIframe();
    startObserver();
  }

  // Wait until page looks like chat UI loaded (best-effort)
  let attempts = 0;
  const maxAttempts = 40;
  const bootInterval = setInterval(() => {
    attempts++;
    // heuristics: main container or chat message container present
    if (document.querySelector('main') || document.querySelector('[data-message-id]') || document.querySelector('[data-message-author-role]') || document.querySelector('div[class*="conversation"]')) {
      clearInterval(bootInterval);
      bootstrap();
    } else if (attempts >= maxAttempts) {
      clearInterval(bootInterval);
      bootstrap(); // try anyway
    }
  }, 500);

  // expose for debugging
  window.__cqNav = {
    refresh: pushQuestionsToIframe,
    inject: injectSidebarIframe,
    remove: () => {
      const f = document.getElementById(IFRAME_ID); if (f) f.remove();
      const b = document.getElementById(TOGGLE_BTN_ID); if (b) b.remove();
    },
    collectUserQuestions
  };
})();
