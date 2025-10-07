// tabs/messages.js
// Define colors and initials for avatars when no profile image is
// available.  These objects map each conversation ID to a unique
// color and a set of initials.  If new conversations are added,
// update these objects accordingly.
var avatarColors = {
  group1: '#c0392b', // Family Group
  group2: '#8e44ad', // Work Project
  user123: '#3498db', // John Doe
  user456: '#27ae60'  // Alice Smith
};

var avatarInitials = {
  group1: 'FG',
  group2: 'WP',
  user123: 'JD',
  user456: 'AS'
};

// Make loadMessages globally available immediately
window.loadMessages = function() {
  if (typeof window.loadTab === 'function') {
    window.loadTab('messages');
  } else {
    // fallback for older main.js versions
    const existingScript = document.getElementById('dynamic-tab');
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.src = 'tabs/messages.js';
    script.id = 'dynamic-tab';
    script.onload = function() {
      if (typeof render === 'function') render();
    };
    document.body.appendChild(script);
  }
};



function render() {
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  contentEl.innerHTML = `
    <div class="left-column">
      <h2>Messages</h2>
      <div class="messages-container" style="display:flex;gap:16px;">
        <div class="messages-list" style="width:40%;overflow-y:auto;max-height:500px;padding-right:8px;">
          <div class="message-item" data-conversation-id="group1" onclick="openConversation('group1')" style="display:flex;align-items:center;padding:12px;margin-bottom:8px;">
            <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${avatarColors.group1};color:#fff;font-weight:bold;font-size:1em;">
              ${avatarInitials.group1}
            </div>
            <div class="msg-details" style="flex:1;">
              <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="sender-name">Family Group</span>
                <span class="message-time" style="font-size:0.8em;color:var(--muted, #888);">5m</span>
              </div>
              <div class="bottom-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="message-preview" style="font-size:0.8em;color:var(--muted, #aaa);">Dinner at 7?</span>
                <span class="read-indicator" style="margin-left:8px;color:var(--accent);"><i class="fas fa-check-double"></i></span>
              </div>
            </div>
          </div>
          <div class="message-item" data-conversation-id="group2" onclick="openConversation('group2')" style="display:flex;align-items:center;padding:12px;margin-bottom:8px;">
            <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${avatarColors.group2};color:#fff;font-weight:bold;font-size:1em;">
              ${avatarInitials.group2}
            </div>
            <div class="msg-details" style="flex:1;">
              <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="sender-name">Work Project</span>
                <span class="message-time" style="font-size:0.8em;color:var(--muted, #888);">1h</span>
              </div>
              <div class="bottom-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="message-preview" style="font-size:0.8em;color:var(--muted, #aaa);">Latest update attached…</span>
                <span class="read-indicator" style="margin-left:8px;color:var(--accent);"><i class="fas fa-circle"></i></span>
              </div>
            </div>
          </div>
          <div class="message-item" data-conversation-id="user123" onclick="openConversation('user123')" style="display:flex;align-items:center;padding:12px;margin-bottom:8px;">
            <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${avatarColors.user123};color:#fff;font-weight:bold;font-size:1em;">
              ${avatarInitials.user123}
            </div>
            <div class="msg-details" style="flex:1;">
              <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="sender-name">John Doe</span>
                <span class="message-time" style="font-size:0.8em;color:var(--muted, #888);">Yesterday</span>
              </div>
              <div class="bottom-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="message-preview" style="font-size:0.8em;color:var(--muted, #aaa);">Hey, how's it going?</span>
                <span class="read-indicator" style="margin-left:8px;color:var(--accent);"><i class="fas fa-check-double"></i></span>
              </div>
            </div>
          </div>
          <div class="message-item" data-conversation-id="user456" onclick="openConversation('user456')" style="display:flex;align-items:center;padding:12px;margin-bottom:8px;">
            <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${avatarColors.user456};color:#fff;font-weight:bold;font-size:1em;">
              ${avatarInitials.user456}
            </div>
            <div class="msg-details" style="flex:1;">
              <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="sender-name">Alice Smith</span>
                <span class="message-time" style="font-size:0.8em;color:var(--muted, #888);">2d</span>
              </div>
              <div class="bottom-row" style="display:flex;justify-content:space-between;align-items:center;">
                <span class="message-preview" style="font-size:0.8em;color:var(--muted, #aaa);">Meeting tomorrow at 10 AM</span>
                <span class="read-indicator" style="margin-left:8px;color:var(--accent);"><i class="fas fa-circle"></i></span>
              </div>
            </div>
          </div>
        </div>
        <div id="chat-area" class="chat-area" style="flex:1; position:relative; background:#000; padding:12px; border-radius:4px;">
          <!-- Chat will be injected by renderChatArea() -->
        </div>
      </div>
    </div>

    <div class="right-column">
      <h2>Actions</h2>
      <div class="card actions-card">
        <button class="action-btn" onclick="startNewMessage()" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
          <i class="fas fa-plus"></i>
          <span style="margin-left:6px;">New Message</span>
        </button>
        <button class="action-btn" onclick="startNewGroup()" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
          <i class="fas fa-users"></i>
          <span style="margin-left:6px;">New Group</span>
        </button>
      </div>
      <h2 style="margin-top:16px;">Search</h2>
      <div class="card search-card" style="padding:8px;">
        <input id="searchInput" type="text" placeholder="Search..." oninput="searchMessages()" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:#111;color:var(--text,#fff);" />
      </div>
    </div>
  `;
  openConversation('group1');
  console.log('Messages tab loaded');
}

function loadMessages() {
  if (typeof window.loadTab === 'function') {
    window.loadTab('messages');
    return;
  }
  const existingScript = document.getElementById('dynamic-tab');
  if (existingScript) existingScript.remove();
  const script = document.createElement('script');
  script.src = 'messages.js';
  script.id = 'dynamic-tab';
  script.onload = () => {
    if (typeof render === 'function') {
      render();
    }
  };
  document.body.appendChild(script);
  window.location.hash = '#messages';
}

function openConversation(conversationId) {
  console.log("Opening conversation:", conversationId);
  const items = document.querySelectorAll('.messages-list .message-item');
  items.forEach(item => {
    item.style.backgroundColor = '';
  });
  const selectedItem = document.querySelector(
    `.messages-list .message-item[data-conversation-id="${conversationId}"]`
  );
  if (selectedItem) {
    selectedItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  }
  renderChatArea(conversationId);
}

var mockChats = {
  group1: {
    name: 'Family Group',
    messages: [
      { sender: 'Dad', text: 'Dinner at 7?', timestamp: '17:55', outgoing: false },
      { sender: 'Me', text: 'Sure! Be there.', timestamp: '17:56', outgoing: true },
      { sender: 'Mom', text: 'Can I bring dessert?', timestamp: '17:57', outgoing: false },
      { sender: 'Dad', text: 'I will pick up the kids on the way.', timestamp: '18:00', outgoing: false },
      { sender: 'Me', text: 'Great! See you all soon.', timestamp: '18:05', outgoing: true },
      { sender: 'Mom', text: 'Don’t forget the salad.', timestamp: '18:10', outgoing: false },
      { sender: 'Me', text: 'Got it. Anything else?', timestamp: '18:12', outgoing: true },
      { sender: 'Dad', text: 'That’s all. Thanks!', timestamp: '18:15', outgoing: false }
    ]
  },
  group2: {
    name: 'Work Project',
    messages: [
      { sender: 'Me', text: 'Latest update attached…', timestamp: '10:05', outgoing: true },
      { sender: 'Boss', text: 'Thanks! Check my comment.', timestamp: '10:10', outgoing: false },
      { sender: 'Colleague', text: 'Looks good to me.', timestamp: '10:12', outgoing: false },
      { sender: 'Me', text: 'Please review sections 2 and 3 carefully.', timestamp: '10:15', outgoing: true },
      { sender: 'Boss', text: 'Section 2 needs more data. Can you add statistics?', timestamp: '10:18', outgoing: false },
      { sender: 'Me', text: 'Sure, will gather more info and update.', timestamp: '10:20', outgoing: true },
      { sender: 'Colleague', text: 'I can help with the charts.', timestamp: '10:22', outgoing: false },
      { sender: 'Me', text: 'That would be great. Let’s finish by noon.', timestamp: '10:25', outgoing: true }
    ]
  },
  user123: {
    name: 'John Doe',
    messages: [
      { sender: 'John Doe', text: 'Hey, how\'s it going?', timestamp: 'Yesterday 19:00', outgoing: false },
      { sender: 'Me', text: 'All good! You?', timestamp: 'Yesterday 19:05', outgoing: true },
      { sender: 'John Doe', text: 'Doing well, thanks.', timestamp: 'Yesterday 19:06', outgoing: false }
    ]
  },
  user456: {
    name: 'Alice Smith',
    messages: [
      { sender: 'Alice Smith', text: 'Meeting tomorrow at 10 AM', timestamp: 'Monday 14:30', outgoing: false },
      { sender: 'Me', text: 'Sounds good.', timestamp: 'Monday 14:35', outgoing: true },
      { sender: 'Alice Smith', text: 'See you then!', timestamp: 'Monday 14:36', outgoing: false }
    ]
  }
};

function renderChatArea(conversationId) {
  const chatArea = document.getElementById('chat-area');
  if (!chatArea) return;
  const chat = mockChats[conversationId];
  if (!chat) {
    chatArea.innerHTML = '<h2>Select a conversation</h2><p>Conversation not found.</p>';
  } else {
    const messagesHtml = chat.messages.map(msg => {
      const alignment = msg.outgoing ? 'flex-end' : 'flex-start';
      const bubbleBg = msg.outgoing ? '#222' : '#111';
      const textColor = msg.outgoing ? '#fff' : 'var(--text)';
      const nameHtml = msg.outgoing
        ? ''
        : `<div class="sender-name" style="font-size:0.7em;color:var(--muted,#888);margin-bottom:2px;text-align:left;width:100%;">${msg.sender}</div>`;
      const timestampAlign = msg.outgoing ? 'right' : 'left';
      return `
        <div class="chat-message" style="margin-bottom:12px; display:flex; flex-direction:column; align-items:${alignment};">
          ${nameHtml}
          <div style="background:${bubbleBg};color:${textColor};padding:10px 14px;border-radius:14px;max-width:70%; align-self:${alignment};font-size:0.9em;">
            ${msg.text}
          </div>
          <div style="font-size:0.6em;color:var(--muted,#888);margin-top:3px;text-align:${timestampAlign}; width:100%;">
            ${msg.timestamp}
          </div>
        </div>`;
    }).join('');
    chatArea.innerHTML = `
      <div class="chat-messages" style="overflow-y:scroll;max-height:400px;padding-right:4px;">
        ${messagesHtml}
      </div>
      <div class="chat-input" style="margin-top:12px;display:flex;align-items:center;">
        <input id="new-message-input" type="text" placeholder="Type a message..." onkeydown="handleMessageKey(event, '${conversationId}')" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--card);color:var(--text,#fff);" />
        <div onclick="sendMessage('${conversationId}')" style="margin-left:8px;padding:8px 12px;border-radius:4px;background:#111;color:var(--text,#fff);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:60px;">
          Send
        </div>
        <div class="emoji-btn" onclick="toggleEmojiPicker()" style="margin-left:8px;padding:8px 12px;border-radius:4px;background:#111;color:var(--text,#fff);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:40px;">
          <i class="fas fa-smile"></i>
        </div>
      </div>
      <div id="emoji-picker" style="display:none;position:absolute;bottom:60px;right:12px;background:var(--card);border:1px solid var(--border);padding:8px;border-radius:6px;z-index:10;max-width:200px;">
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${['😊','😂','😍','😢','😎','👍','🙏','😉','🎉','😡','🤔','😴'].map(e => `<span style="cursor:pointer;font-size:1.5rem;" onclick="insertEmoji('${e}')">${e}</span>`).join('')}
        </div>
      </div>
    `;
    // Scroll to bottom
    setTimeout(() => {
      const messagesDiv = chatArea.querySelector('.chat-messages');
      if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 0);
  }
}

function sendMessage(conversationId) {
  const input = document.getElementById('new-message-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  console.log(`Sending message to ${conversationId}:`, text);
  input.value = '';
  const chat = mockChats[conversationId];
  if (!chat) return;
  chat.messages.push({ sender: 'Me', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), outgoing: true });
  renderChatArea(conversationId);
  setTimeout(() => {
    const newInput = document.getElementById('new-message-input');
    if (newInput) newInput.focus();
  }, 0);
}

function toggleEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  if (picker) picker.style.display = (picker.style.display === 'none' || picker.style.display === '') ? 'block' : 'none';
}

function insertEmoji(emoji) {
  const input = document.getElementById('new-message-input');
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  const newPos = start + emoji.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();
  const picker = document.getElementById('emoji-picker');
  if (picker) picker.style.display = 'none';
}

function handleMessageKey(event, conversationId) {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage(conversationId);
  }
}

function startNewMessage() {
  console.log('Starting a new message');
  alert('Starting a new message (mock)');
}

function startNewGroup() {
  console.log('Starting a new group conversation');
  alert('Starting a new group (mock)');
}

function searchMessages() {
  const query = document.getElementById('searchInput')?.value || '';
  console.log('Searching messages for:', query);
}

function cleanupMessages() {
  // Clean up any event listeners or intervals if needed
}
