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
  const script = document.createElement("script");
  script.src = "tabs/messages.js";
  script.id = "dynamic-tab";
  script.onload = () => {
    if (typeof render === "function") {
      render();
      // Update URL hash for deep linking
      window.location.hash = '#messages';
      // Update last tab for proper back navigation
      localStorage.setItem("lastTab", "activity");
    }
  };
  
  // Clean up current tab
  const existingScript = document.getElementById("dynamic-tab");
  if (existingScript) existingScript.remove();
  
  // Remove active tab highlighting
  document.querySelectorAll(".tab").forEach(btn =>
    btn.classList.remove("active")
  );
  
  document.body.appendChild(script);
}

// Function to open individual conversations
function openConversation(conversationId) {
  // You can implement conversation view here
  console.log("Opening conversation:", conversationId);
  // For now, just show an alert
  alert(`Opening conversation: ${conversationId}`);
}

// Optional cleanup function
function cleanupMessages() {
  // Clean up any event listeners or intervals
}