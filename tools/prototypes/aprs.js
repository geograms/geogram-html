let socket = null;

function generateAprsPasscode(callsign) {
  const baseCall = callsign.split('-')[0].toUpperCase();
  let hash = 0x73e2;
  for (let i = 0; i < baseCall.length; i++) {
    hash ^= baseCall.charCodeAt(i) << 8;
    hash ^= baseCall.charCodeAt(i + 1) || 0;
    i++;
  }
  return hash & 0x7FFF;
}

function connectAndSend(callsign, passcode, destination, message) {
  const APRS_SERVER = "http://rotate.aprs2.net:14580";
  socket = new WebSocket(APRS_SERVER);

  socket.onopen = () => {
    const login = `user ${callsign} pass ${passcode} vers APRS-WebClient 1.0\n`;
    socket.send(login);

    const packet = `${callsign}>${destination}:${message}`;
    socket.send(packet + "\n");

    document.getElementById("aprs-log").textContent += `[SENT] ${packet}\n`;
  };

  socket.onmessage = (event) => {
    document.getElementById("aprs-log").textContent += event.data + "\n";
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
}

function sendAprsMessage() {
  const callsign = document.getElementById("callsign").value.trim().toUpperCase();
  const destination = document.getElementById("destination").value.trim().toUpperCase() || "APRS";
  const message = document.getElementById("aprs-message").value.trim();

  if (!callsign || !message) {
    alert("Please enter both a callsign and a message.");
    return;
  }

  const passcode = generateAprsPasscode(callsign);
  localStorage.setItem("aprsCallsign", callsign);
  localStorage.setItem("aprsDestination", destination);

  connectAndSend(callsign, passcode, destination, message);
}

// Autofill from localStorage
window.onload = () => {
  const savedCallsign = localStorage.getItem("aprsCallsign");
  const savedDest = localStorage.getItem("aprsDestination");
  if (savedCallsign) document.getElementById("callsign").value = savedCallsign;
  if (savedDest) document.getElementById("destination").value = savedDest;
};
