// tabs/messages.js – uses your template UI + messages-lib backend, identity from local cache.
// Depends on: nostr.bundle.js (NostrTools), messages-lib.js (window.MessagesLib), and a global getChatIdentityFromCache()

// Use a namespace to avoid redeclaration errors
window.MessagesModule = window.MessagesModule || {};

(function() {
  'use strict';

  // --- Keep your avatar placeholders (used if we later decorate the list) ---
  const avatarColors = {
    group1: '#c0392b',
    group2: '#8e44ad',
    user123: '#3498db',
    user456: '#27ae60'
  };
  const avatarInitials = { group1: 'FG', group2: 'WP', user123: 'JD', user456: 'AS' };

  // --- State ---
  const _state = {
    endpoint: 'http://localhost:8080/nostr',
    caller: '',
    secret: '',
    peers: [],
    activePeer: null,
  };

  // --- Helpers ported from the no-cache prototype (trimmed) ---
  function _parseMarkdownChat(md, caller) { // from >meta + content pairs
    const lines = String(md || '').split(/\r?\n/);
    const messages = [];
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (L.startsWith('>')) {
        const meta = L.replace(/^>\s?/, '').trim();
        let content = '';
        i++;
        while (i < lines.length && lines[i].trim() !== '') {
          content += (content ? '\n' : '') + lines[i];
          i++;
        }
        const m = /--\s*([A-Za-z0-9_-]+)/.exec(meta);
        const fromSelf = m ? (m[1] === caller) : false;
        messages.push({ meta, content, fromSelf });
      }
    }
    return messages;
  }

  function _requireDeps() {
    if (!window.NostrTools) throw new Error('nostr.bundle.js not loaded');
    if (!window.MessagesLib) throw new Error('messages-lib.js not loaded');
    if (typeof window.getChatIdentityFromCache !== 'function') throw new Error('getChatIdentityFromCache() missing');
  }

  function _initIdentityFromCache() {
    const { npub, nsec, callsign } = window.getChatIdentityFromCache() || {};
    _state.caller = (callsign || '').trim();
    _state.secret = (nsec || '').trim();
    const ep = localStorage.getItem('nostrEndpoint');
    if (ep && ep.trim()) _state.endpoint = ep.trim();
    // UX hint in console (keeps UI unchanged)
    const missing = [];
    if (!_state.caller) missing.push('username');
    if (!_state.secret) missing.push('privkey');
    if (missing.length) console.warn('Messages: missing', missing.join(', '), 'in localStorage');
    console.log('Messages: endpoint=', _state.endpoint, 'caller=', _state.caller);
  }

  // --- Template render (your existing layout, list becomes dynamic) ---
  function render() {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="left-column">
        <h2>Messages</h2>
        <div class="messages-container" style="display:flex;gap:16px;">
          <div class="messages-list" style="width:40%;overflow-y:auto;max-height:500px;padding-right:8px;">
            <div id="messages-empty" class="message-item" style="padding:12px; margin-bottom:8px; color:var(--muted,#888);">
              Loading conversations…
            </div>
          </div>
          <div id="chat-area" class="chat-area" style="flex:1; position:relative; background:#000; padding:12px; border-radius:4px;">
            <div style="color:var(--muted,#888);">Select a conversation.</div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <h2>Actions</h2>
        <div class="card actions-card">
          <button class="action-btn" id="btn-reload" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
            <i class="fas fa-sync"></i>
            <span style="margin-left:6px;">Reload Conversations</span>
          </button>
        </div>
        <h2 style="margin-top:16px;">Search</h2>
        <div class="card search-card" style="padding:8px;">
          <input id="searchInput" type="text" placeholder="Search..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:#111;color:var(--text,#fff);" />
        </div>
      </div>
    `;

    // Hook up actions
    const reloadBtn = document.getElementById('btn-reload');
    const searchInput = document.getElementById('searchInput');
    
    if (reloadBtn) reloadBtn.addEventListener('click', _loadConversations);
    if (searchInput) searchInput.addEventListener('input', _searchFilter);

    // Bootstrap: deps + identity + fetch
    try {
      _requireDeps();
      _initIdentityFromCache();
      _loadConversations();
    } catch (e) {
      _renderError(e.message);
    }
  }

  // --- Renderers ---
  function _renderPeerList(peers) {
    const listEl = document.querySelector('.messages-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!peers || !peers.length) {
      const empty = document.createElement('div');
      empty.className = 'message-item';
      empty.style.cssText = 'padding:12px; color:var(--muted,#888);';
      empty.textContent = 'No conversations.';
      listEl.appendChild(empty);
      return;
    }
    peers.forEach(peer => {
      const item = document.createElement('div');
      item.className = 'message-item';
      item.dataset.conversationId = peer;
      item.style.cssText = 'display:flex;align-items:center;padding:12px;margin-bottom:8px;cursor:pointer;';
      // simple text avatar (fallback color)
      const color = avatarColors[peer] || '#1f6feb';
      const initials = (peer[0] || '?').toUpperCase();
      item.innerHTML = `
        <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${color};color:#fff;font-weight:bold;font-size:1em;">
          ${initials}
        </div>
        <div class="msg-details" style="flex:1;">
          <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
            <span class="sender-name">${peer}</span>
            <span class="message-time" style="font-size:0.8em;color:var(--muted, #888);"> </span>
          </div>
          <div class="bottom-row" style="display:flex;justify-content:space-between;align-items:center;">
            <span class="message-preview" style="font-size:0.8em;color:var(--muted, #aaa);">Open to load…</span>
            <span class="read-indicator" style="margin-left:8px;color:var(--accent);"><i class="fas fa-circle"></i></span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => openConversation(peer));
      listEl.appendChild(item);
    });
  }

  function _renderBubblesFromMarkdown(md) {
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;
    const msgs = _parseMarkdownChat(md, _state.caller);
    if (!msgs.length) {
      chatArea.innerHTML = '<div style="color:var(--muted,#888);">No messages.</div>';
      return;
    }
    const chunks = msgs.map(m => {
      const align = m.fromSelf ? 'flex-end' : 'flex-start';
      const bubbleBg = m.fromSelf ? '#1f2a57' : '#172046';
      const escapedContent = m.content.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
      return `
        <div style="margin-bottom:12px; display:flex; flex-direction:column; align-items:${align};">
          <div style="color:var(--muted,#95a2cd); font-size:.75rem; margin-bottom:2px; align-self:${align};">${m.meta}</div>
          <div style="background:${bubbleBg};color:#e8f0ff;padding:10px 14px;border-radius:14px;max-width:70%; align-self:${align};white-space:pre-wrap;">
            ${escapedContent}
          </div>
        </div>
      `;
    }).join('');
    chatArea.innerHTML = `
      <div class="chat-messages" style="overflow-y:auto;max-height:420px;padding-right:4px;">${chunks}</div>
      <div class="chat-input" style="margin-top:12px;display:flex;align-items:center;opacity:.6;">
        <input type="text" disabled placeholder="(viewer demo)" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:4px;background:#111;color:#999;" />
        <div style="margin-left:8px;padding:8px 12px;border-radius:4px;background:#111;color:#999;border:1px solid var(--border);">Send</div>
      </div>
    `;
    const messagesDiv = chatArea.querySelector('.chat-messages');
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function _renderError(msg) {
    const chatArea = document.getElementById('chat-area');
    if (chatArea) chatArea.innerHTML = `<div style="color:#ff9b9b;">${msg}</div>`;
  }

  // --- Data flow (messages-lib) ---
  async function _loadConversations() {
    try {
      _requireDeps();
      _initIdentityFromCache();
      if (!_state.caller || !_state.secret) {
        _renderPeerList([]);
        _renderError('Missing identity in cache (username/privkey).');
        return;
      }
      const json = await window.MessagesLib.messages_list(_state.caller, {
        endpoint: _state.endpoint,
        secret: _state.secret,
        kind: 30000,
        path: '/'
      });
      _state.peers = Array.isArray(json.content_list) ? json.content_list : [];
      _renderPeerList(_state.peers);
      // Auto-open first peer for convenience
      if (_state.peers.length) openConversation(_state.peers[0]);
    } catch (e) {
      console.error(e);
      _renderPeerList([]);
      _renderError('messages_list failed: ' + e.message);
    }
  }

  async function openConversation(conversationId) {
    // highlight
    const items = document.querySelectorAll('.messages-list .message-item');
    items.forEach(item => item.style.backgroundColor = '');
    const selectedItem = document.querySelector(`.messages-list .message-item[data-conversation-id="${conversationId}"]`);
    if (selectedItem) selectedItem.style.backgroundColor = 'rgba(255,255,255,0.1)';

    _state.activePeer = conversationId;
    try {
      _requireDeps();
      const json = await window.MessagesLib.messages_get(_state.caller, conversationId, {
        endpoint: _state.endpoint,
        secret: _state.secret,
        kind: 30000,
        path: `/messages/${conversationId}-chat.md`
      });
      _renderBubblesFromMarkdown(String(json.content || ''));
    } catch (e) {
      console.error(e);
      _renderError('messages_get failed: ' + e.message);
    }
  }

  // --- Optional search over the peer list (client-side only) ---
  function _searchFilter(e) {
    const q = (e?.target?.value || document.getElementById('searchInput')?.value || '').toLowerCase();
    const peers = _state.peers.filter(p => p.toLowerCase().includes(q));
    _renderPeerList(peers);
  }

  // --- Cleanup function ---
  function cleanupMessages() {
    // Reset state
    _state.endpoint = 'http://localhost:8080/nostr';
    _state.caller = '';
    _state.secret = '';
    _state.peers = [];
    _state.activePeer = null;
    
    // Remove event listeners by clearing the content
    const contentEl = document.getElementById('content');
    if (contentEl) {
      contentEl.innerHTML = '';
    }
  }

  // --- Public API ---
  window.loadMessages = function() {
    if (typeof window.loadTab === 'function') {
      window.loadTab('messages');
    } else {
      const existingScript = document.getElementById('dynamic-tab');
      if (existingScript) existingScript.remove();
      const script = document.createElement('script');
      script.src = 'tabs/messages.js';
      script.id = 'dynamic-tab';
      script.onload = function() { if (typeof render === 'function') render(); };
      document.body.appendChild(script);
    }
    window.location.hash = '#messages';
  };

  window.cleanupMessages = cleanupMessages;

  // Store functions in module namespace for access
  window.MessagesModule.render = render;
  window.MessagesModule.openConversation = openConversation;
  
  // CRITICAL: Also expose render globally so main.js can find it
  window.render = render;

  // Auto-render if this is being loaded dynamically
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    // If we're already loaded and there's content to render to, do it
    if (document.getElementById('content')) {
      render();
    }
  }

})();