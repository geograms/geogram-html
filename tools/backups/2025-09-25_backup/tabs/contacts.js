// tabs/contacts.js

// Define colors and initials for avatars when no profile image is available
var avatarColors = {};
var avatarInitials = {};

// Make loadContacts globally available
window.loadContacts = function() {
  if (typeof window.loadTab === 'function') {
    window.loadTab('contacts');
  } else {
    // fallback for older main.js versions
    const existingScript = document.getElementById('dynamic-tab');
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.src = 'tabs/contacts.js';
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
      <h2>Contacts</h2>
      <div class="contacts-container" style="display:flex;gap:16px;">
        <div class="contacts-list" style="width:40%;overflow-y:auto;max-height:500px;padding-right:8px;">
          <div id="contacts-loading" style="padding:20px;text-align:center;">
            <i class="fas fa-spinner fa-spin"></i> Loading contacts...
          </div>
        </div>
        <div id="contact-details" class="contact-details" style="flex:1; position:relative; background:#000; padding:12px; border-radius:4px;display:flex;flex-direction:column;justify-content:center;align-items:center;">
          <p>Select a contact to view details</p>
        </div>
      </div>
    </div>

    <div class="right-column">
      <h2>Actions</h2>
      <div class="card actions-card">
        <button class="action-btn" onclick="addNewContact()" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
          <i class="fas fa-user-plus"></i>
          <span style="margin-left:6px;">Add Contact</span>
        </button>
        <button class="action-btn" onclick="refreshContacts()" style="display:flex;align-items:center;width:100%;margin-bottom:8px;">
          <i class="fas fa-sync"></i>
          <span style="margin-left:6px;">Refresh Contacts</span>
        </button>
      </div>
      <h2 style="margin-top:16px;">Search</h2>
      <div class="card search-card" style="padding:8px;">
        <input id="searchContactsInput" type="text" placeholder="Search contacts..." oninput="searchContacts()" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:#111;color:var(--text,#fff);" />
      </div>
    </div>
  `;
  
  // First try to load contacts from cache, then from API
  console.log("Rendering contacts tab...");
  loadCachedContacts();
}

function loadCachedContacts() {
  console.log("Attempting to load contacts from cache...");
  try {
    const cachedContacts = localStorage.getItem('geogram_contacts');
    const cachedTimestamp = localStorage.getItem('geogram_contacts_timestamp');
    
    if (cachedContacts) {
      const contacts = JSON.parse(cachedContacts);
      const timestamp = parseInt(cachedTimestamp || '0');
      const now = Date.now();
      const isStale = (now - timestamp) > (5 * 60 * 1000); // 5 minutes stale threshold
      
      console.log(`Loaded ${contacts.length} contacts from cache (timestamp: ${new Date(timestamp).toLocaleTimeString()})`);
      
      // Generate colors and initials for each contact
      contacts.forEach(contact => {
        const color = generateColorFromString(contact.id);
        const initials = contact.callsign 
          ? contact.callsign.substring(0, 2).toUpperCase()
          : '??';
        
        avatarColors[contact.id] = color;
        avatarInitials[contact.id] = initials;
      });
      
      renderContactsList(contacts);
      
      // If data is stale, refresh from API in background
      if (isStale) {
        console.log('Cached contacts are stale, refreshing from API');
        loadContactsFromAPI();
      } else {
        console.log('Using cached contacts (still fresh)');
      }
    } else {
      // No cached data, load from API
      console.log('No cached contacts found, loading from API');
      loadContactsFromAPI();
    }
  } catch (error) {
    console.error('Error loading cached contacts:', error);
    loadContactsFromAPI();
  }
}

function getUserData() {
  console.log("Retrieving user data from localStorage...");
  
  // Get data based on config.js field names
  const username = localStorage.getItem('username');
  const privkey = localStorage.getItem('privkey');
  const pubkey = localStorage.getItem('pubkey');
  
  console.log("Found user data:", { 
    username: username ? `${username.substring(0, 6)}...` : 'not set', 
    hasPrivkey: !!privkey, 
    hasPubkey: !!pubkey 
  });
  
  if (!username || !privkey || !pubkey) {
    console.error("Incomplete user data - need username, privkey, and pubkey");
    return null;
  }
  
  // Extract callsign from username (assuming format like X1ABCD)
  let callsign = username;
  if (username.includes(' ')) {
    // If username has spaces, try to extract callsign
    const parts = username.split(' ');
    callsign = parts.find(part => part.match(/^[A-Z0-9]{3,6}$/)) || username;
  }
  
  return {
    username,
    callsign,
    nsec: privkey,
    npub: pubkey
  };
}

// Convert nsec to secret bytes (Uint8Array)
function toSecretBytes(nsecOrHex) {
  console.log("Converting nsec to secret bytes...");
  try {
    if (!nsecOrHex) throw new Error('empty key');
    
    if (nsecOrHex.startsWith('nsec1')) {
      // Decode nsec format
      if (!window.NostrTools) {
        throw new Error('NostrTools library not loaded');
      }
      const decoded = window.NostrTools.nip19.decode(nsecOrHex);
      return decoded.data; // Uint8Array(32)
    }
    
    // Fallback: assume hex
    if (!window.NostrTools) {
      throw new Error('NostrTools library not loaded');
    }
    return window.NostrTools.utils.hexToBytes(nsecOrHex);
  } catch(e) {
    console.error('Error converting secret key:', e);
    throw new Error('Invalid secret key. Expecting nsec1... or 64-hex. ' + e.message);
  }
}

// Sign an event with the local secret key
function signWithLocalSecret(unsignedEvent) {
  console.log("Signing event with local secret...");
  try {
    const userData = getUserData();
    if (!userData) {
      throw new Error('No user data available');
    }
    
    const sk = toSecretBytes(userData.nsec);
    return window.NostrTools.finalizeEvent(unsignedEvent, sk);
  } catch(e) {
    console.error('Error signing event:', e);
    throw new Error('Failed to sign event: ' + e.message);
  }
}

// Generate NIP-98 authorization token
async function generateAuthToken(url, method, bodyPayload) {
  console.log("Generating NIP-98 authorization token...");
  try {
    if (!window.NostrTools || !window.NostrTools.nip98) {
      throw new Error('NostrTools NIP-98 not available');
    }
    
    const signer = (eventTemplate) => signWithLocalSecret(eventTemplate);
    return await window.NostrTools.nip98.getToken(url, method, signer, true, bodyPayload);
  } catch(e) {
    console.error('Error generating auth token:', e);
    throw new Error('Failed to generate authorization token: ' + e.message);
  }
}

function loadContactsFromAPI() {
  console.log("Loading contacts from API...");
  
  // Get user data from browser storage
  const userData = getUserData();
  
  if (!userData) {
    const loadingEl = document.getElementById('contacts-loading');
    if (loadingEl) {
      loadingEl.innerHTML = '<p>Please set up your profile in the Config tab first</p>';
    }
    console.error("Cannot load contacts: user data not found");
    return;
  }
  
  console.log("Using user data for API request:", {
    callsign: userData.callsign,
    npub: userData.npub ? `${userData.npub.substring(0, 10)}...` : 'not set'
  });
  
  // Create the NOSTR event for contact list
  const unsignedEvent = {
    "kind": 30000,
    "created_at": Math.floor(Date.now() / 1000),
    "tags": [
      ["action", "profile_edit"],
      ["client", "geogram-proto"]
    ],
    "content": JSON.stringify({
      "action": "contact_list", 
      "callsign": userData.callsign, 
      "path": "/"
    }),
    "pubkey": userData.npub.replace('npub1', ''), // Just the hex part
  };
  
  console.log("Unsigned event:", unsignedEvent);
  
  try {
    // Sign the event
    const signedEvent = signWithLocalSecret(unsignedEvent);
    console.log("Signed event:", signedEvent);
    
    // Make API request with signed event and NIP-98 auth
    makeSignedAPIRequest(signedEvent);
  } catch(error) {
    console.error('Error signing event:', error);
    const loadingEl = document.getElementById('contacts-loading');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <p>Error signing request: ${error.message}</p>
        <button onclick="loadCachedContacts()" style="margin-top:10px;padding:5px 10px;">
          Try cached data
        </button>
      `;
    }
  }
}

async function makeSignedAPIRequest(signedEvent) {
  console.log("Making signed API request...");
  
  const apiUrl = 'https://api.geogram.radio/nostr';
  const method = 'POST';
  
  try {
    // Generate NIP-98 authorization token
    const authToken = await generateAuthToken(apiUrl, method, signedEvent);
    console.log("Generated auth token:", authToken);
    
    // Make the request with proper headers
    const response = await fetch(apiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      body: JSON.stringify(signedEvent)
    });
    
    console.log("API response status:", response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Contacts API response received:', data);
    
    // Process the contacts from the response
    const contacts = processContactsResponse(data);
    console.log(`Processed ${contacts.length} contacts from API response`);
    
    // Cache the contacts
    try {
      localStorage.setItem('geogram_contacts', JSON.stringify(contacts));
      localStorage.setItem('geogram_contacts_timestamp', Date.now().toString());
      console.log('Contacts cached successfully');
    } catch (error) {
      console.error('Error caching contacts:', error);
    }
    
    // Generate colors and initials for each contact
    contacts.forEach(contact => {
      const color = generateColorFromString(contact.id);
      const initials = contact.callsign 
        ? contact.callsign.substring(0, 2).toUpperCase()
        : '??';
      
      avatarColors[contact.id] = color;
      avatarInitials[contact.id] = initials;
    });
    
    renderContactsList(contacts);
  } catch (error) {
    console.error('Error making signed API request:', error);
    const loadingEl = document.getElementById('contacts-loading');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <p>Error loading contacts: ${error.message}</p>
        <button onclick="loadCachedContacts()" style="margin-top:10px;padding:5px 10px;">
          Try cached data
        </button>
      `;
    }
  }
}

function processContactsResponse(data) {
  console.log("Processing API response:", data);
  
  // Handle case where API returns {request: 'valid'} instead of the expected format
  if (data && data.request === 'valid') {
    console.log("API returned validation success but no contacts data");
    // This might be a successful request but with no contacts
    return [];
  }
  
  // Handle the expected successful response format
  if (data && data.result === "OK" && data.content) {
    try {
      // Parse the content string which contains the actual contacts data
      console.log("Raw content string:", data.content);
      const content = JSON.parse(data.content);
      console.log("Parsed content:", content);
      
      if (content && content.contacts && Array.isArray(content.contacts)) {
        console.log(`Found ${content.contacts.length} contacts in response`);
        return content.contacts.map((contact, index) => ({
          id: contact.callsign || `contact_${index}`,
          name: contact.callsign || '', // Using callsign as name since no name field
          callsign: contact.callsign || '',
          npub: '', // Not provided in response
          lastSeen: contact.timeLastUpdated ? 
            formatTimestamp(contact.timeLastUpdated) : 'Unknown',
          status: 'offline', // Default status
          contactType: contact.contactType || 'NORMAL',
          timeFirstAdded: contact.timeFirstAdded,
          timeLastUpdated: contact.timeLastUpdated,
          pathPreferred: contact.pathPreferred || '/'
        }));
      } else {
        console.warn("No contacts array found in content:", content);
      }
    } catch (e) {
      console.error('Error parsing content JSON:', e);
      console.error('Content that failed to parse:', data.content);
    }
  } else {
    console.warn("Unexpected API response format:", data);
  }
  
  // Fallback to empty array if no contacts in response
  console.warn("No contacts found in API response, using empty array");
  return [];
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateColorFromString(str) {
  // Generate a consistent color from a string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#c0392b', '#8e44ad', '#3498db', '#27ae60', 
    '#f39c12', '#d35400', '#16a085', '#2980b9'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

function renderContactsList(contacts) {
  const contactsListEl = document.querySelector('.contacts-list');
  if (!contactsListEl) return;
  
  console.log(`Rendering ${contacts.length} contacts to the list`);
  
  if (contacts.length === 0) {
    contactsListEl.innerHTML = `
      <div style="padding:20px;text-align:center;">
        <p>No contacts found</p>
        <button onclick="loadContactsFromAPI()" style="margin-top:10px;padding:5px 10px;">
          Try Again
        </button>
      </div>
    `;
    return;
  }
  
  const contactsHtml = contacts.map(contact => `
    <div class="contact-item" data-contact-id="${contact.id}" onclick="openContact('${contact.id}')" style="display:flex;align-items:center;padding:12px;margin-bottom:8px;cursor:pointer;">
      <div class="avatar-text" style="width:48px;height:48px;border-radius:50%;margin-right:12px;display:flex;justify-content:center;align-items:center;background:${avatarColors[contact.id]};color:#fff;font-weight:bold;font-size:1em;">
        ${avatarInitials[contact.id]}
      </div>
      <div class="contact-details" style="flex:1;">
        <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
          <span class="contact-name">${contact.callsign || 'Unknown'}</span>
          <span class="contact-status" style="font-size:0.8em;color:var(--muted);">
            Offline
          </span>
        </div>
        <div class="bottom-row" style="display:flex;justify-content:space-between;align-items:center;">
          <span class="contact-type" style="font-size:0.8em;color:var(--muted, #aaa);">${contact.contactType}</span>
          <span class="last-seen" style="font-size:0.7em;color:var(--muted, #888);">${contact.lastSeen}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  contactsListEl.innerHTML = contactsHtml;
}

function openContact(contactId) {
  console.log("Opening contact:", contactId);
  const items = document.querySelectorAll('.contacts-list .contact-item');
  items.forEach(item => {
    item.style.backgroundColor = '';
  });
  const selectedItem = document.querySelector(
    `.contacts-list .contact-item[data-contact-id="${contactId}"]`
  );
  if (selectedItem) {
    selectedItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  }
  renderContactDetails(contactId);
}

function renderContactDetails(contactId) {
  const contactDetailsEl = document.getElementById('contact-details');
  if (!contactDetailsEl) return;
  
  console.log("Rendering details for contact:", contactId);
  
  // Get contact from cache
  try {
    const cachedContacts = localStorage.getItem('geogram_contacts');
    if (!cachedContacts) {
      contactDetailsEl.innerHTML = '<p>Contact details not available</p>';
      return;
    }
    
    const contacts = JSON.parse(cachedContacts);
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) {
      contactDetailsEl.innerHTML = '<p>Contact not found</p>';
      return;
    }
    
    contactDetailsEl.innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <div class="avatar-text" style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;display:flex;justify-content:center;align-items:center;background:${avatarColors[contact.id]};color:#fff;font-weight:bold;font-size:1.8em;">
          ${avatarInitials[contact.id]}
        </div>
        <h3>${contact.callsign || 'Unknown'}</h3>
        <p style="color:var(--muted);margin-bottom:8px;">${contact.contactType} Contact</p>
        <p style="color:var(--muted);">
          Added: ${contact.timeFirstAdded ? new Date(contact.timeFirstAdded).toLocaleDateString() : 'Unknown'}
        </p>
        <p style="color:var(--muted);">
          Last updated: ${contact.lastSeen}
        </p>
        <p style="color:var(--muted);">
          Path: ${contact.pathPreferred}
        </p>
      </div>
      <div style="margin-top:20px;">
        <button class="action-btn" onclick="sendTestMessage('${contact.id}')" style="width:100%;padding:10px;margin-bottom:8px;">
          <i class="fas fa-comment"></i> Send Test Message
        </button>
        <button class="action-btn" onclick="viewContactProfile('${contact.id}')" style="width:100%;padding:10px;margin-bottom:8px;">
          <i class="fas fa-user"></i> View Profile
        </button>
        <button class="action-btn" onclick="removeContact('${contact.id}')" style="width:100%;padding:10px;background:var(--danger);">
          <i class="fas fa-trash"></i> Remove Contact
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error rendering contact details:', error);
    contactDetailsEl.innerHTML = '<p>Error loading contact details</p>';
  }
}

function sendTestMessage(contactId) {
  console.log('Sending test message to contact:', contactId);
  alert(`Test message sent to contact ${contactId} (mock implementation)`);
}

function viewContactProfile(contactId) {
  console.log('Viewing profile for contact:', contactId);
  alert(`Viewing profile for contact ${contactId} (mock implementation)`);
}

function removeContact(contactId) {
  console.log('Removing contact:', contactId);
  if (confirm('Are you sure you want to remove this contact?')) {
    // Remove from cache
    try {
      const cachedContacts = localStorage.getItem('geogram_contacts');
      if (cachedContacts) {
        const contacts = JSON.parse(cachedContacts);
        const updatedContacts = contacts.filter(c => c.id !== contactId);
        localStorage.setItem('geogram_contacts', JSON.stringify(updatedContacts));
        
        // Refresh the contacts list
        renderContactsList(updatedContacts);
        document.getElementById('contact-details').innerHTML = '<p>Select a contact to view details</p>';
        console.log(`Contact ${contactId} removed successfully`);
      }
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  }
}

function addNewContact() {
  console.log('Adding new contact');
  alert('Add new contact functionality (mock implementation)');
}

function refreshContacts() {
  console.log('Refreshing contacts');
  document.querySelector('.contacts-list').innerHTML = `
    <div id="contacts-loading" style="padding:20px;text-align:center;">
      <i class="fas fa-spinner fa-spin"></i> Refreshing contacts...
    </div>
  `;
  loadContactsFromAPI();
}

function searchContacts() {
  const query = document.getElementById('searchContactsInput')?.value.toLowerCase() || '';
  console.log('Searching contacts for:', query);
  
  try {
    const cachedContacts = localStorage.getItem('geogram_contacts');
    if (!cachedContacts) return;
    
    const contacts = JSON.parse(cachedContacts);
    const filteredContacts = contacts.filter(contact => 
      (contact.callsign && contact.callsign.toLowerCase().includes(query))
    );
    
    console.log(`Found ${filteredContacts.length} contacts matching "${query}"`);
    renderContactsList(filteredContacts);
  } catch (error) {
    console.error('Error searching contacts:', error);
  }
}

function cleanupContacts() {
  // Clean up any event listeners or intervals if needed
  console.log("Cleaning up contacts tab");
}