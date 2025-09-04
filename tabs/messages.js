// tabs/messages.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="messages-container">
      <div class="messages-header">
        <button onclick="window.loadTab('activity')" class="back-button">
          <i class="fas fa-arrow-left"></i> Back to Activity
        </button>
        <h2>Messages</h2>
      </div>
      <div class="messages-list">
        <div class="message-item" onclick="openConversation('user123')">
          <div class="message-avatar">JD</div>
          <div class="message-content">
            <div class="message-sender">John Doe</div>
            <div class="message-preview">Hey, how's it going?</div>
          </div>
          <div class="message-time">2:30 PM</div>
        </div>
        <div class="message-item" onclick="openConversation('group456')">
          <div class="message-avatar">AS</div>
          <div class="message-content">
            <div class="message-sender">Alice Smith</div>
            <div class="message-preview">Meeting tomorrow at 10 AM</div>
          </div>
          <div class="message-time">Yesterday</div>
        </div>
        <!-- Add more message items here -->
      </div>
    </div>
  `;
  console.log("Messages page loaded");
}

// Global function to load messages (called from anywhere)
function loadMessages() {
  // Delegate to the unified `loadTab` helper when available.  This will
  // handle loading the messages script, updating the URL hash and
  // managing tab highlighting.  The `additionalPages` mapping in
  // `main.js` must include a `messages` entry for this to work.
  if (typeof window.loadTab === 'function') {
    window.loadTab('messages');
    return;
  }
  // Fallback: manually inject the messages script if loadTab() is not
  // defined.  Remove any existing dynamic script first.
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
  // Update the hash to reflect the messages page without altering
  // lastTab, allowing the back button to return to the previous tab.
  window.location.hash = '#messages';
}

// Function to open individual conversations
function openConversation(conversationId) {
  console.log("Opening conversation:", conversationId);
  alert(`Opening conversation: ${conversationId}`);
}

// Optional cleanup function
function cleanupMessages() {
  // Clean up any event listeners or intervals if needed
}
