// tabs/messages.js – uses your template UI + messages-lib backend, identity from local cache.
// Depends on: nostr.bundle.js (NostrTools), messages-lib.js (window.MessagesLib), and a global getChatIdentityFromCache()

// Use a namespace to avoid redeclaration errors
window.MessagesModule = window.MessagesModule || {};

(function() {
  'use strict';

  // --- State ---
  const _state = {
    endpoint: 'http://localhost:8080/nostr',
    caller: '',
    secret: '',
    peers: [],
    activePeer: null,
    refreshTimer: null,
    messageCountCache: {}, // Track message counts per conversation
  };

  // --- Cache helpers ---
  function _getCacheKey(type, id = '') {
    // Format: messages_cache:{callsign}:{type}:{id}
    return `messages_cache:${_state.caller}:${type}${id ? ':' + id : ''}`;
  }

  function _saveToCache(type, data, id = '') {
    try {
      const key = _getCacheKey(type, id);
      const cacheData = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log('[cache] Saved:', key);
    } catch (e) {
      console.warn('[cache] Failed to save:', e);
    }
  }

  function _loadFromCache(type, id = '') {
    try {
      const key = _getCacheKey(type, id);
      const cached = localStorage.getItem(key);
      if (cached) {
        const cacheData = JSON.parse(cached);
        console.log('[cache] Loaded:', key, 'age:', Math.floor((Date.now() - cacheData.timestamp) / 1000), 'seconds');
        return cacheData.data;
      }
    } catch (e) {
      console.warn('[cache] Failed to load:', e);
    }
    return null;
  }

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
          <button class="action-btn" id="btn-new-message" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
            <i class="fas fa-plus"></i>
            <span style="margin-left:6px;">New Message</span>
          </button>
          <button class="action-btn" id="btn-reload" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
            <i class="fas fa-sync"></i>
            <span style="margin-left:6px;">Reload Conversations</span>
          </button>
          <button class="action-btn" id="btn-delete-conversation" style="display:flex;align-items:center;width:100%;color:#e74c3c;">
            <i class="fas fa-trash"></i>
            <span style="margin-left:6px;">Delete Conversation</span>
          </button>
        </div>
        <h2 style="margin-top:16px;">Search</h2>
        <div class="card search-card" style="padding:8px;">
          <input id="searchInput" type="text" placeholder="Search..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:#111;color:var(--text,#fff);" />
          <div id="search-results" style="margin-top:8px;max-height:400px;overflow-y:auto;"></div>
        </div>
      </div>
    `;

    // Hook up actions
    const newMessageBtn = document.getElementById('btn-new-message');
    const reloadBtn = document.getElementById('btn-reload');
    const searchInput = document.getElementById('searchInput');

    if (newMessageBtn) newMessageBtn.addEventListener('click', _showNewMessageDialog);
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

  // --- Helpers for avatar generation ---
  function _betterHash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  function _getColorFromHash(str) {
    const hash = _betterHash(str, 12345);
    const colors = [
      '#c0392b', '#e74c3c', '#9b59b6', '#8e44ad', '#3498db',
      '#2980b9', '#1abc9c', '#16a085', '#27ae60', '#2ecc71',
      '#f39c12', '#e67e22', '#d35400', '#e91e63', '#9c27b0',
      '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688'
    ];
    return colors[hash % colors.length];
  }

  function _getEmojiFromHash(str) {
    // Use a different seed for emoji to make it independent from color
    const hash = _betterHash(str, 67890);
    const emojis = [
      '😊', '😎', '🤖', '👨‍💻', '🦊', '🐱', '🐶', '🐼',
      '🦁', '🐯', '🦄', '🐸', '🦉', '🐙', '🦋', '🐝',
      '🌟', '⚡', '🔥', '💎', '🎯', '🎨', '🎭', '🎪',
      '🚀', '🎸', '🎺', '🎮', '🏆', '🌈', '🍕', '🍔',
      '🍣', '🌮', '🎂', '☕', '🍺', '🏖️', '⛰️', '🌊',
      '🎓', '💡', '🔧', '🔬', '🎬', '📚', '✈️', '🏠'
    ];
    return emojis[hash % emojis.length];
  }

  // --- Helper to count messages in markdown ---
  function _countMessagesInMarkdown(md) {
    if (!md) return 0;
    const lines = String(md).split(/\r?\n/);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('>')) count++;
    }
    return count;
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

      // Check if this is the active peer
      const isActive = _state.activePeer === peer;
      const baseStyle = 'display:flex;align-items:center;padding:12px;margin-bottom:8px;cursor:pointer;position:relative;';
      const activeStyle = isActive ? 'background-color:rgba(255,255,255,0.1);' : '';
      item.style.cssText = baseStyle + activeStyle;

      // Generate color and emoji from hash
      const color = _getColorFromHash(peer);
      const emoji = _getEmojiFromHash(peer);

      // Check for new messages
      const cachedContent = _loadFromCache('conversation', peer);
      const currentCount = cachedContent ? _countMessagesInMarkdown(cachedContent) : 0;
      const lastKnownCount = _state.messageCountCache[peer] || 0;
      const newMessageCount = currentCount > lastKnownCount ? currentCount - lastKnownCount : 0;

      // Show badge if there are new messages and this isn't the active conversation
      const showBadge = newMessageCount > 0 && !isActive;

      item.innerHTML = `
        <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${color};color:#fff;font-weight:bold;font-size:1.5em;position:relative;">
          ${emoji}
          ${showBadge ? `<div style="position:absolute;top:-4px;right:-4px;background:#e74c3c;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.6em;font-weight:bold;border:2px solid #000;">${newMessageCount > 9 ? '9+' : newMessageCount}</div>` : ''}
        </div>
        <div class="msg-details" style="flex:1;">
          <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
            <span class="sender-name">${peer}</span>
            ${showBadge ? `<span style="background:#e74c3c;color:#fff;border-radius:10px;padding:2px 6px;font-size:0.7em;font-weight:bold;">${newMessageCount}</span>` : ''}
          </div>
        </div>
      `;
      item.addEventListener('click', () => openConversation(peer));
      listEl.appendChild(item);
    });
  }

  function _renderBubblesFromMarkdown(md, highlightMessageIndex = null, searchQuery = null) {
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;
    const msgs = _parseMarkdownChat(md, _state.caller);

    let chunks = '';
    if (!msgs.length) {
      chunks = '<div style="color:var(--muted,#888);padding:12px;">No messages yet. Start the conversation!</div>';
    } else {
      chunks = msgs.map((m, index) => {
        const align = m.fromSelf ? 'flex-end' : 'flex-start';
        const bubbleBg = m.fromSelf ? '#222' : '#111';
        const textColor = m.fromSelf ? '#fff' : 'var(--text)';

        // Highlight the search query if provided
        const displayContent = searchQuery ? _highlightText(m.content, searchQuery) : m.content.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));

        // Extract author name and timestamp from meta
        const authorMatch = m.meta.match(/--\s*([A-Za-z0-9_-]+)/);
        const authorName = authorMatch ? authorMatch[1] : 'Unknown';
        const timestamp = m.meta.replace(/--\s*[A-Za-z0-9_-]+/, '').trim();

        // Determine if this message should be highlighted
        const isHighlighted = highlightMessageIndex !== null && index === highlightMessageIndex;
        const highlightStyle = isHighlighted ? 'box-shadow:0 0 0 3px #f39c12;animation:pulse 1.5s ease-in-out;' : '';
        const messageId = isHighlighted ? 'highlighted-message' : '';

        return `
          <div class="chat-message" id="${messageId}" style="margin-bottom:12px; display:flex; flex-direction:column; align-items:${align};">
            ${!m.fromSelf ? `
              <div style="font-size:0.72em;font-weight:600;opacity:.8;margin:0 0 4px 4px;align-self:${align};">
                ${authorName}
              </div>
            ` : ''}
            <div style="background:${bubbleBg};color:${textColor};padding:10px 14px;border-radius:14px;max-width:70%; align-self:${align};font-size:0.9em;${highlightStyle}">
              <div style="white-space:pre-wrap;">${displayContent}</div>
              <div style="font-size:0.6em;color:var(--muted,#888);margin-top:3px;text-align:right;width:100%;">${timestamp}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    chatArea.innerHTML = `
      <style>
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px #f39c12; }
          50% { box-shadow: 0 0 0 6px rgba(243, 156, 18, 0.5); }
        }
      </style>
      <div class="chat-messages" style="overflow-y:auto;max-height:420px;padding-right:4px;">${chunks}</div>
      <div class="chat-input" style="margin-top:12px;display:flex;align-items:center;gap:4px;">
        <div style="position:relative;">
          <button id="emojiBtn" class="action-button" title="Emoticons" style="padding:6px 8px;min-width:36px;">
            <i class="fa-regular fa-face-smile"></i>
          </button>
          <div id="emoji-picker"
               style="display:none;position:absolute;left:0;bottom:calc(100% + 8px);background:var(--card);border:1px solid var(--border);padding:8px;border-radius:6px;z-index:10;max-width:220px;width:220px;">
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${['😊','😂','😍','😢','😎','👍','🙏','😉','🎉','😡','🤔','😴','📻','🛰️','🗺️','📡'].map(e => `
                <span style="cursor:pointer;font-size:1.4rem;" onclick="insertMessageEmoji('${e}')">${e}</span>
              `).join('')}
            </div>
          </div>
        </div>
        <input id="messageInput" type="text" placeholder="Type a message..." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--card);color:var(--text,#fff);font-size:16px;" />
        <button id="sendBtn" class="action-button" title="Send" style="padding:6px 8px;min-width:36px;">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `;
    const messagesDiv = chatArea.querySelector('.chat-messages');
    if (messagesDiv) {
      // If highlighting a specific message, scroll to it
      if (highlightMessageIndex !== null) {
        setTimeout(() => {
          const highlightedMsg = document.getElementById('highlighted-message');
          if (highlightedMsg) {
            highlightedMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        // Otherwise scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }

    // Set up emoji button click handler
    const emojiBtn = document.getElementById('emojiBtn');
    if (emojiBtn) {
      emojiBtn.onclick = () => {
        const picker = document.getElementById('emoji-picker');
        if (picker) picker.style.display = (picker.style.display === 'none' || picker.style.display === '') ? 'block' : 'none';
      };
    }

    // Set up send button and Enter key handler
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    const sendMessage = () => {
      if (!messageInput || !_state.activePeer) return;
      const text = messageInput.value.trim();
      if (!text) return;
      _sendMessage(text);
      messageInput.value = '';
      messageInput.focus(); // Refocus the input field
    };

    if (sendBtn) sendBtn.onclick = sendMessage;
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
        }
      });
    }
  }

  async function _sendMessage(text) {
    if (!_state.activePeer || !_state.caller || !_state.secret) {
      console.error('[messages_write] Missing required data');
      return;
    }

    try {
      const path = `/messages/${_state.activePeer}-chat.md`;
      const requestPayload = {
        action: 'messages_write',
        callsign: _state.caller,
        path: path,
        content: text
      };

      const requestParams = {
        endpoint: _state.endpoint,
        secret: _state.secret,
        kind: 1,
        content: JSON.stringify(requestPayload),
        tags: [['app', 'geogram-web']]
      };

      console.log('[messages_write] Request:', {
        peer: _state.activePeer,
        caller: _state.caller,
        params: requestParams
      });
      console.log('[messages_write] Request JSON:', JSON.stringify({
        peer: _state.activePeer,
        caller: _state.caller,
        params: requestParams
      }, null, 2));

      // Use NostrTools to create and sign the event
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['app', 'geogram-web']],
        content: JSON.stringify(requestPayload),
        pubkey: window.NostrTools.nip19.decode(_state.caller.startsWith('npub') ? _state.caller : await _getPubkeyFromSecret()).data
      };

      const signedEvent = window.NostrTools.finalizeEvent(event, window.NostrTools.nip19.decode(_state.secret).data);

      console.log('[messages_write] Signed event:', signedEvent);
      console.log('[messages_write] Signed event JSON:', JSON.stringify(signedEvent, null, 2));

      // Send to relay
      const response = await fetch(_state.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedEvent)
      });

      const json = await response.json();
      console.log('[messages_write] Response received:', json);
      console.log('[messages_write] Response JSON:', JSON.stringify(json, null, 2));

      if (json.result === 'OK') {
        // Reload the conversation to show the new message and update cache
        await openConversation(_state.activePeer);

        // Refocus the input field after the conversation is reloaded
        setTimeout(() => {
          const input = document.getElementById('messageInput');
          if (input) input.focus();
        }, 100);
      } else {
        console.error('[messages_write] Failed:', json);
        alert('Failed to send message: ' + (json.details || 'Unknown error'));
      }
    } catch (e) {
      console.error('[messages_write] Error:', e);
      console.error('[messages_write] Error stack:', e.stack);
      alert('Error sending message: ' + e.message);
    }
  }

  async function _getPubkeyFromSecret() {
    const decoded = window.NostrTools.nip19.decode(_state.secret);
    const pubkey = window.NostrTools.getPublicKey(decoded.data);
    return window.NostrTools.nip19.npubEncode(pubkey);
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

      // Try to load from cache first
      const cachedPeers = _loadFromCache('peers');
      if (cachedPeers && cachedPeers.length > 0) {
        _state.peers = cachedPeers;

        // Initialize message count cache from cached conversations
        _state.peers.forEach(peer => {
          const cachedContent = _loadFromCache('conversation', peer);
          if (cachedContent) {
            _state.messageCountCache[peer] = _countMessagesInMarkdown(cachedContent);
          }
        });

        _renderPeerList(_state.peers);
        console.log('[messages_list] Loaded from cache:', _state.peers.length, 'peers');
        // Always auto-open first peer
        openConversation(_state.peers[0]);
      }

      // Fetch from server (will update cache)
      const requestParams = {
        endpoint: _state.endpoint,
        secret: _state.secret,
        kind: 30000,
        path: '/'
      };
      console.log('[messages_list] Request:', {
        caller: _state.caller,
        params: requestParams
      });
      console.log('[messages_list] Request JSON:', JSON.stringify({
        caller: _state.caller,
        params: requestParams
      }, null, 2));

      const json = await window.MessagesLib.messages_list(_state.caller, requestParams);

      console.log('[messages_list] Response received:', json);
      console.log('[messages_list] Response JSON:', JSON.stringify(json, null, 2));

      _state.peers = Array.isArray(json.content_list) ? json.content_list : [];
      console.log('[messages_list] Parsed peers:', _state.peers);

      // Save to cache
      _saveToCache('peers', _state.peers);

      _renderPeerList(_state.peers);
      // Auto-open first peer if not already open
      if (_state.peers.length && !_state.activePeer) {
        openConversation(_state.peers[0]);
      }

      // Start auto-refresh timer
      _startAutoRefresh();
    } catch (e) {
      console.error('[messages_list] Error:', e);
      console.error('[messages_list] Error stack:', e.stack);

      // If we have cached data, use it despite the error
      const cachedPeers = _loadFromCache('peers');
      if (cachedPeers && cachedPeers.length > 0) {
        _state.peers = cachedPeers;
        _renderPeerList(_state.peers);
        _renderError('Server unreachable. Showing cached conversations.');
        console.log('[messages_list] Using cached data due to error');

        // Auto-open first conversation
        openConversation(_state.peers[0]);

        // Start auto-refresh even with cached data
        _startAutoRefresh();
      } else {
        _renderPeerList([]);
        _renderError('messages_list failed: ' + e.message);
      }
    }
  }

  async function openConversation(conversationId) {
    _state.activePeer = conversationId;

    // Re-render peer list to show active state
    _renderPeerList(_state.peers);
    try {
      _requireDeps();

      // Try to load from cache first for instant display
      const cachedContent = _loadFromCache('conversation', conversationId);
      if (cachedContent) {
        _renderBubblesFromMarkdown(cachedContent);
        // Mark as read by updating the message count cache
        _state.messageCountCache[conversationId] = _countMessagesInMarkdown(cachedContent);
        console.log('[messages_get] Loaded from cache for:', conversationId);
      }

      // Fetch from server (will update cache)
      const requestParams = {
        endpoint: _state.endpoint,
        secret: _state.secret,
        kind: 30000,
        path: `/messages/${conversationId}-chat.md`
      };
      console.log('[messages_get] Request:', {
        caller: _state.caller,
        conversationId: conversationId,
        params: requestParams
      });
      console.log('[messages_get] Request JSON:', JSON.stringify({
        caller: _state.caller,
        conversationId: conversationId,
        params: requestParams
      }, null, 2));

      const json = await window.MessagesLib.messages_get(_state.caller, conversationId, requestParams);

      console.log('[messages_get] Response received:', json);
      console.log('[messages_get] Response JSON:', JSON.stringify(json, null, 2));
      console.log('[messages_get] Content length:', (json.content || '').length);
      console.log('[messages_get] Content preview:', (json.content || '').substring(0, 200));

      const content = String(json.content || '');

      // Save to cache
      _saveToCache('conversation', content, conversationId);

      // Update message count and mark as read
      _state.messageCountCache[conversationId] = _countMessagesInMarkdown(content);

      _renderBubblesFromMarkdown(content);
    } catch (e) {
      console.error('[messages_get] Error:', e);
      console.error('[messages_get] Error stack:', e.stack);

      // If we have cached data, use it despite the error
      const cachedContent = _loadFromCache('conversation', conversationId);
      if (cachedContent) {
        _renderBubblesFromMarkdown(cachedContent);
        // Mark as read even with cached content
        _state.messageCountCache[conversationId] = _countMessagesInMarkdown(cachedContent);
        console.log('[messages_get] Using cached data due to error for:', conversationId);
        // Show error but don't overwrite the messages
        const chatArea = document.getElementById('chat-area');
        if (chatArea) {
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'color:#ff9b9b;font-size:0.8em;padding:4px 8px;background:rgba(255,0,0,0.1);border-radius:4px;margin-bottom:8px;';
          errorDiv.textContent = 'Server unreachable. Showing cached messages.';
          chatArea.insertBefore(errorDiv, chatArea.firstChild);
        }
      } else {
        _renderError('messages_get failed: ' + e.message);
      }
    }
  }

  // --- Search through cached conversations ---
  function _searchFilter(e) {
    const query = (e?.target?.value || document.getElementById('searchInput')?.value || '').trim();

    if (!query) {
      // No search query, clear search results
      const searchResultsEl = document.getElementById('search-results');
      if (searchResultsEl) searchResultsEl.innerHTML = '';
      return;
    }

    const q = query.toLowerCase();
    const results = [];

    // Search through all cached conversations
    for (const peer of _state.peers) {
      const cachedContent = _loadFromCache('conversation', peer);
      if (!cachedContent) continue;

      const messages = _parseMarkdownChat(cachedContent, _state.caller);
      const matches = [];

      // Search through each message
      messages.forEach((msg, index) => {
        if (msg.content.toLowerCase().includes(q)) {
          matches.push({
            messageIndex: index,
            content: msg.content,
            meta: msg.meta,
            fromSelf: msg.fromSelf
          });
        }
      });

      if (matches.length > 0) {
        results.push({
          peer: peer,
          matches: matches
        });
      }
    }

    _renderSearchResults(results, query);
  }

  function _renderSearchResults(results, query) {
    const listEl = document.getElementById('search-results');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!results || results.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:8px; color:var(--muted,#888);font-size:0.85em;';
      empty.textContent = `No messages found for "${query}"`;
      listEl.appendChild(empty);
      return;
    }

    // Display results grouped by peer/author
    results.forEach(result => {
      const groupHeader = document.createElement('div');
      groupHeader.style.cssText = 'padding:6px 8px;font-weight:bold;color:var(--text);background:rgba(255,255,255,0.05);margin-bottom:2px;border-radius:4px;font-size:0.9em;';

      const color = _getColorFromHash(result.peer);
      const emoji = _getEmojiFromHash(result.peer);

      groupHeader.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="avatar-text" style="width:24px;height:24px;border-radius:50%;display:flex;justify-content:center;align-items:center;background:${color};color:#fff;font-weight:bold;font-size:0.8em;">
            ${emoji}
          </div>
          <span style="font-size:0.85em;">${result.peer}</span>
          <span style="font-size:0.7em;color:var(--muted,#888);font-weight:normal;">(${result.matches.length} match${result.matches.length > 1 ? 'es' : ''})</span>
        </div>
      `;
      listEl.appendChild(groupHeader);

      // Display each match
      result.matches.forEach(match => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:6px 8px 6px 38px;margin-bottom:2px;cursor:pointer;border-left:2px solid transparent;border-radius:2px;';

        // Highlight the search query in the content
        const highlightedContent = _highlightText(match.content, query);

        // Extract author and timestamp
        const authorMatch = match.meta.match(/--\s*([A-Za-z0-9_-]+)/);
        const authorName = authorMatch ? authorMatch[1] : 'Unknown';
        const timestamp = match.meta.replace(/--\s*[A-Za-z0-9_-]+/, '').trim();

        // Truncate content if too long
        const maxLength = 80;
        let displayContent = highlightedContent;
        if (match.content.length > maxLength) {
          const queryPos = match.content.toLowerCase().indexOf(query.toLowerCase());
          const start = Math.max(0, queryPos - 25);
          const end = Math.min(match.content.length, queryPos + query.length + 40);
          const truncated = (start > 0 ? '...' : '') + match.content.substring(start, end) + (end < match.content.length ? '...' : '');
          displayContent = _highlightText(truncated, query);
        }

        item.innerHTML = `
          <div style="font-size:0.65em;color:var(--muted,#888);margin-bottom:2px;">
            ${authorName} • ${timestamp}
          </div>
          <div style="font-size:0.8em;line-height:1.3;color:var(--text);">
            ${displayContent}
          </div>
        `;

        // Click handler to open conversation and jump to the message
        item.addEventListener('click', () => {
          _openConversationWithHighlight(result.peer, match.messageIndex, query);
        });

        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = 'rgba(255,255,255,0.08)';
          item.style.borderLeftColor = color;
        });

        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = 'transparent';
          item.style.borderLeftColor = 'transparent';
        });

        listEl.appendChild(item);
      });
    });
  }

  function _highlightText(text, query) {
    if (!query) return text.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));

    const escapedText = text.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark style="background:#f39c12;color:#000;padding:2px 4px;border-radius:2px;">$1</mark>');
  }

  async function _openConversationWithHighlight(peer, messageIndex, query) {
    _state.activePeer = peer;

    // Re-render peer list to show active state
    _renderPeerList(_state.peers);

    // Load the conversation from cache
    const cachedContent = _loadFromCache('conversation', peer);
    if (cachedContent) {
      _renderBubblesFromMarkdown(cachedContent, messageIndex, query);
      _state.messageCountCache[peer] = _countMessagesInMarkdown(cachedContent);
    }
  }

  // --- New message dialog ---
  function _showNewMessageDialog() {
    const callsign = prompt('Enter the callsign/username of the person you want to message:');
    if (!callsign || !callsign.trim()) {
      return; // User cancelled or entered nothing
    }

    const recipient = callsign.trim();

    // Check if this conversation already exists
    if (_state.peers.includes(recipient)) {
      // Just open the existing conversation
      openConversation(recipient);
      return;
    }

    // Add the new peer to the list
    _state.peers.unshift(recipient); // Add to the beginning
    _saveToCache('peers', _state.peers); // Update cache

    // Initialize message count for new conversation
    _state.messageCountCache[recipient] = 0;

    // Render the updated list and open the conversation
    _renderPeerList(_state.peers);
    openConversation(recipient);

    console.log('[new-message] Started new conversation with:', recipient);
  }

  // --- Auto-refresh functionality ---
  function _startAutoRefresh() {
    // Clear any existing timer
    if (_state.refreshTimer) {
      clearInterval(_state.refreshTimer);
    }

    // Refresh every 60 seconds (1 minute)
    _state.refreshTimer = setInterval(async () => {
      console.log('[auto-refresh] Checking for updates...');

      // Silently update all conversations in the background
      if (_state.peers && _state.peers.length > 0) {
        for (const peer of _state.peers) {
          try {
            const requestParams = {
              endpoint: _state.endpoint,
              secret: _state.secret,
              kind: 30000,
              path: `/messages/${peer}-chat.md`
            };

            const json = await window.MessagesLib.messages_get(_state.caller, peer, requestParams);
            const content = String(json.content || '');

            // Save to cache
            _saveToCache('conversation', content, peer);

            // If this is the active conversation, update the display
            if (_state.activePeer === peer) {
              _renderBubblesFromMarkdown(content);
              _state.messageCountCache[peer] = _countMessagesInMarkdown(content);
            }
          } catch (e) {
            console.warn('[auto-refresh] Failed to update', peer, ':', e.message);
          }
        }

        // Refresh the peer list to show any new message badges
        _renderPeerList(_state.peers);
        console.log('[auto-refresh] Update complete');
      }
    }, 60000); // 60000ms = 1 minute

    console.log('[auto-refresh] Started (interval: 60s)');
  }

  function _stopAutoRefresh() {
    if (_state.refreshTimer) {
      clearInterval(_state.refreshTimer);
      _state.refreshTimer = null;
      console.log('[auto-refresh] Stopped');
    }
  }

  // --- Emoji picker functionality ---
  window.insertMessageEmoji = function(emoji) {
    const input = document.querySelector('#chat-area input[type="text"]');
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const newPos = start + emoji.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.style.display = 'none';
  };

  // --- Cleanup function ---
  function cleanupMessages() {
    // Stop auto-refresh
    _stopAutoRefresh();

    // Reset state
    _state.endpoint = 'http://localhost:8080/nostr';
    _state.caller = '';
    _state.secret = '';
    _state.peers = [];
    _state.activePeer = null;
    _state.messageCountCache = {};

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