# Geogram

**Geogram** is a browser-based application for monitoring, recording, and interacting with radio communications. It supports voice and APRS (Automatic Packet Reporting System) digital data from local radios and internet gateways, and integrates with custom firmware for the Quansheng UV-K5 family of radios.

---

## 🌐 Features

- 🔊 **Voice & APRS Radio Listening**  
  Listen to live voice and APRS messages over radio frequencies and from the internet (via iGates).

- 🎙️ **Voice Recording**  
  Record incoming transmissions and play them back later. Local storage is used—no cloud dependency.

- 📡 **Geolocation-Based Filtering**  
  Set alerts based on coordinates or country. Supports proximity monitoring and nearby station discovery.

- 🧭 **Live Map with Leaflet**  
  Displays iGate and weather station clusters. Includes tools for distance measurement, marker management, and GPS tracking.

- 🔐 **Decentralized Communication via NOSTR**  
  End-to-end encrypted messaging with key generation and management built-in. All private keys stay on the client.

- ⚙️ **Custom Firmware Integration**  
  Compatible with modified Quansheng UV-K5 walkie-talkies for enhanced radio control.

- 🔧 **Morse Code Generator**  
  Generate, preview, and download Morse code messages as MP3 files. Includes fine-grained timing control.

- 🎨 **Theme Customization**  
  Choose from multiple color schemes for day/night/brown/grey/red/etc.

---

## 📦 Installation

No installation required. Just open `index.html` in any modern browser.

### Browser Requirements

- JavaScript ES6+
- LocalStorage API
- Geolocation API (for location-based features)
- WebSocket support

---

## 🔑 Configuration

Accessible under the **Config** tab:

- Set your **username or callsign**
- Generate or paste a **NOSTR private key** for signing messages
- Automatically derive the **public key**
- Add locations of interest via **coordinates** or **country selection**
- Change visual **theme**

---

## 🗺️ Map Features

- Powered by **Leaflet.js**
- Supports tile layers from OpenStreetMap
- Caches **weather stations** and **iGate clusters**
- Distance measurement, marker drops, GPS follow
- Persistent view state (via `localStorage`)
- Visual weather station markers with data popups
- Progressive loading for large iGate sets (with IndexedDB or fallback to localStorage)

---

## 📂 Tabs Overview

- `Activity` — listen to channels, view nearby stations, groups, and people  
- `Map` — interactive geospatial APRS/iGate visualization  
- `Radio` — morse code transmission, waveform generator, and MP3 download  
- `Downloads` — saved media or logs  
- `Docs` — app documentation and help  
- `Config` — user keys, locations, and preferences

---

## 🛠️ Technical Stack

- **Frontend only** (zero backend)
- Built in **vanilla JavaScript**
- Uses [LameJS](https://github.com/zhuker/lamejs) for client-side MP3 generation
- NOSTR support via [nostr-tools](https://github.com/fiatjaf/nostr-tools)
- Caching with `localStorage` and `IndexedDB`
- No external user data storage, analytics, or tracking

---

## 🔒 Privacy & Security

- No server storage of any user data
- All keys and config stored locally in browser
- End-to-end encrypted communication (where supported by NOSTR)
- User-triggered geolocation only
- Open-source, auditable codebase

---

## 📄 License

Apache License 2.0  
See [`LICENSE`](https://www.apache.org/licenses/LICENSE-2.0)

---

## 📣 Support

- GitHub Discussions: [https://github.com/orgs/geograms/discussions](https://github.com/orgs/geograms/discussions)  
- Bug Reports: [https://github.com/geograms/geogram-html/issues](https://github.com/geograms/geogram-html/issues)

---

## 🤝 Contributors

We welcome your contributions! See [`CONTRIBUTORS.md`](./CONTRIBUTORS.md) for details on how to contribute and the license agreement required (Apache-2.0).
