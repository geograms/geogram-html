// Open the SMS dialog
function openSmsDialog() {
  document.getElementById('smsDialog').style.display = 'flex';
  document.getElementById('smsDest').value = '';
  document.getElementById('smsContent').value = '';
  document.getElementById('smsStatus').textContent = '';
}

// Close the SMS dialog
function closeSmsDialog() {
  document.getElementById('smsDialog').style.display = 'none';
}

// Check if APRS-IS (APRS-FI) is reachable
async function checkAprsInternetAccess() {
  try {
    const response = await fetch('https://aprs.fi/', { method: 'HEAD', mode: 'no-cors' });
    // If fetch does not throw, assume online (no-cors will not give status, but will not throw on network error)
    return true;
  } catch (e) {
    return false;
  }
}

// Send APRS message via internet (APRS-IS)
async function sendAprsMessage() {
  const dest = document.getElementById('smsDest').value.trim().toUpperCase();
  const msg = document.getElementById('smsContent').value.trim();
  const statusDiv = document.getElementById('smsStatus');
  statusDiv.style.color = 'red';

  if (!dest || !msg) {
    statusDiv.textContent = "Destination and message are required.";
    return;
  }

  statusDiv.textContent = "Checking internet access...";
  const hasInternet = await checkAprsInternetAccess();

  if (!hasInternet) {
    statusDiv.textContent = "No internet access to APRS-IS/APRS.fi.";
    return;
  }

  statusDiv.textContent = "Sending message...";

  // You need to have an APRS-IS gateway or API endpoint to send the message.
  // This is a placeholder for demonstration. Replace with your actual APRS-IS send endpoint.
  // Example: https://api.aprs.fi/api/sendmsg?apikey=YOUR_API_KEY&dst=DEST&msg=MSG
  try {
    // Replace with your actual APRS-IS sending endpoint and parameters
    const apiKey = "YOUR_API_KEY"; // <-- Replace with your actual API key
    const url = `https://api.aprs.fi/api/sendmsg?apikey=${apiKey}&dst=${encodeURIComponent(dest)}&msg=${encodeURIComponent(msg)}`;

    const resp = await fetch(url, { method: 'GET' });
    if (resp.ok) {
      statusDiv.style.color = 'green';
      statusDiv.textContent = "Message sent successfully!";
      setTimeout(closeSmsDialog, 1500);
    } else {
      statusDiv.textContent = "Failed to send message (API error).";
    }
  } catch (e) {
    statusDiv.textContent = "Failed to send message (network error).";
  }
}