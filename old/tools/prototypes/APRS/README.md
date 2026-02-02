# APRS AX.25 WAV Generator (JavaScript)

Generate Bell 202 AFSK 1200 baud audio files for APRS packets - perfect for testing your UV-K5 or other APRS equipment!

## 🎯 Features

- ✅ Generates valid AX.25 APRS packets
- ✅ Bell 202 AFSK modulation (1200 Hz mark, 2200 Hz space, 1200 baud)
- ✅ Proper NRZI encoding and bit-stuffing
- ✅ CRC-16-CCITT (FCS) calculation
- ✅ Works in both Node.js and browser
- ✅ No external dependencies
- ✅ Outputs standard WAV files (22.05 kHz, 16-bit mono PCM)

## 📦 Files Included

1. **aprs-wav-generator.js** - Core generator (Node.js/module)
2. **aprs-generator.html** - Interactive web interface
3. **Example WAV files:**
   - `aprs-message.wav` - Direct message example
   - `aprs-position.wav` - Position beacon example
   - `aprs-status.wav` - Status message example

## 🚀 Quick Start

### Option 1: Browser (Easiest)

1. Open `aprs-generator.html` in any modern web browser
2. Fill in your callsign and message
3. Click "Generate WAV"
4. Download or play the audio file

### Option 2: Node.js

```javascript
const APRSWavGenerator = require('./aprs-wav-generator.js');
const generator = new APRSWavGenerator();

// Generate a direct message
generator.saveWavFile(
    'my-message.wav',
    'CR7BBQ-5',           // Your callsign
    'K06JZI-5',           // Destination
    'WIDE1-1',            // Digipeater path
    ':K06JZI-5 :Hello!'   // Message
);
```

### Option 3: Command Line

```bash
node aprs-wav-generator.js
```

This generates the three example files.

## 📝 APRS Message Formats

### Direct Message to Station
```javascript
':CALLSIGN :Message text'
```
**Important:** Callsign must be exactly 9 characters (padded with spaces)
```javascript
':K06JZI-5 :Hello from UV-K5!'  // Correct
':K06JZI:Hello'                  // Wrong - needs padding
```

### Position Beacon
```javascript
'!4912.45N/00831.50E-Comment text'
```
- `!` = position without timestamp
- `=` = position with timestamp
- `-` = symbol (house, car, etc.)

### Status Message
```javascript
'>Status text here'
```
Starts with `>` character

### Weather Report
```javascript
'!4912.45N/00831.50E_225/010g015t072'
```
- `_` = weather station symbol
- Wind, gust, temperature data

## 🔧 API Reference

### Constructor
```javascript
const generator = new APRSWavGenerator(sampleRate = 22050);
```

### Main Method
```javascript
generator.generateWav(source, destination, path, message)
```

**Parameters:**
- `source` (string): Your callsign with SSID (e.g., "CR7BBQ-5")
- `destination` (string): Target callsign or "APRS" for general
- `path` (string): Digipeater path (e.g., "WIDE1-1,WIDE2-1")
- `message` (string): APRS information field

**Returns:** Uint8Array containing WAV file data

### Save to File (Node.js)
```javascript
generator.saveWavFile(filename, source, destination, path, message)
```

### Get Base64 (Browser)
```javascript
const base64 = generator.getWavBase64(source, destination, path, message);
```

## 🎵 Audio Specifications

- **Sample Rate:** 22,050 Hz
- **Bit Depth:** 16-bit PCM
- **Channels:** Mono
- **Modulation:** Bell 202 AFSK
  - Mark (1): 1200 Hz
  - Space (0): 2200 Hz
- **Baud Rate:** 1200 baud
- **Encoding:** NRZI with bit-stuffing

## 📡 Using with UV-K5

### For Transmission:
1. Generate your WAV file
2. Transfer to phone
3. Use APRSDroid or similar app:
   - Connection: Audio (AFSK)
   - Or play WAV directly through cable

### For Testing Reception:
1. Generate test packets
2. Play through speakers
3. Point your UV-K5 at speakers
4. Set radio to 144.800 MHz (Europe) or 144.390 MHz (North America)
5. Watch for packet decode

## 🌍 Regional APRS Frequencies

- **North America:** 144.390 MHz
- **Europe:** 144.800 MHz
- **Australia:** 145.175 MHz
- **New Zealand:** 144.575 MHz
- **Japan:** 144.660 MHz
- **South America:** 145.570 MHz

## 💡 Examples

### Example 1: Simple Status
```javascript
generator.saveWavFile(
    'status.wav',
    'MYCALL-9',
    'APRS',
    'WIDE1-1',
    '>Testing from JavaScript!'
);
```

### Example 2: Position with Altitude
```javascript
generator.saveWavFile(
    'position.wav',
    'MYCALL-9',
    'APRS',
    'WIDE1-1,WIDE2-1',
    '!4912.45N/00831.50E-/A=001234 Mobile'
);
```

### Example 3: Direct Message
```javascript
generator.saveWavFile(
    'message.wav',
    'MYCALL-9',
    'FRIEND-5',
    'WIDE1-1',
    ':FRIEND-5 :Meet you at the repeater!'
);
```

### Example 4: Object Report
```javascript
generator.saveWavFile(
    'object.wav',
    'MYCALL',
    'APRS',
    'WIDE1-1',
    ';RALLY    *111111z4903.50N/07201.75W>'
);
```

## 🔍 Technical Details

### AX.25 Frame Structure
```
[Flag] [Destination] [Source] [Path] [Control] [PID] [Info] [FCS] [Flag]
 0x7E    7 bytes      7 bytes  0-56B   0x03    0xF0   var    2B    0x7E
```

### Encoding Process
1. Create AX.25 packet (addresses, control, PID, information)
2. Calculate FCS (CRC-16-CCITT)
3. Add preamble flags (0x7E × 30)
4. Bit-stuff packet data (not flags)
5. NRZI encode
6. Generate AFSK tones
7. Create WAV file

### Bit Stuffing
After five consecutive 1s, insert a 0 (prevents flag confusion)

### NRZI Encoding
- 0 bit = transition (change level)
- 1 bit = no transition (stay same)

## 🐛 Troubleshooting

### WAV file doesn't decode
- Check callsign format (valid amateur radio callsign)
- Verify message format (correct prefix character)
- Ensure path is valid (e.g., "WIDE1-1")
- Volume: Try 60-80% on playback

### Audio sounds wrong
- Should sound like modem tones (chirping)
- If silent: check WAV file generation
- If distorted: reduce volume in code (change 0.8 multiplier)

### Direct messages not working
- Destination callsign MUST be 9 characters
- Pad with spaces: `:K06JZI-5 :` not `:K06JZI-5:`

## 📚 Resources

- [APRS Protocol Specification](http://www.aprs.org/doc/APRS101.PDF)
- [AX.25 Link Layer Protocol](https://www.tapr.org/pdf/AX25.2.2.pdf)
- [Bell 202 Standard](https://en.wikipedia.org/wiki/Bell_202_modem)
- [APRSDroid Documentation](https://aprsdroid.org/)

## ⚙️ Advanced Usage

### Custom Sample Rate
```javascript
const generator = new APRSWavGenerator(44100); // Higher quality
```

### Browser Integration
```javascript
// Generate and create download link
const wavData = generator.generateWav('CALL', 'APRS', 'WIDE1-1', '>Test');
const blob = new Blob([wavData], { type: 'audio/wav' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'aprs.wav';
link.click();
```

### Play Directly in Browser
```javascript
const wavData = generator.generateWav('CALL', 'APRS', 'WIDE1-1', '>Test');
const blob = new Blob([wavData], { type: 'audio/wav' });
const audio = new Audio(URL.createObjectURL(blob));
audio.play();
```

## 🎓 How It Works

1. **Address Encoding:** Callsigns are shifted left by 1 bit and SSID added
2. **Packet Assembly:** Destination, source, path, control, PID, information
3. **FCS Calculation:** CRC-16-CCITT over entire packet
4. **Framing:** Add flags (0x7E) at start and end
5. **Bit Stuffing:** Prevent accidental flags in data
6. **NRZI Encoding:** Differential encoding (transitions for 0s)
7. **AFSK Modulation:** Convert bits to audio tones
8. **WAV Output:** Standard PCM audio file format

## 📜 License

This code is provided as-is for educational and amateur radio use.

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit improvements
- Share your APRS experiences!

## ⚠️ Important Notes

- **License Required:** APRS transmission requires an amateur radio license
- **Frequency Selection:** Use the correct APRS frequency for your region
- **Power Limits:** Respect your license class power limits
- **Testing:** Test with low power before going on-air
- **Digipeater Etiquette:** Use appropriate path (don't abuse WIDE2-2)

## 🎉 Have Fun!

Experiment, learn, and enjoy APRS! This generator is perfect for:
- Testing your APRS setup
- Learning how AX.25 packets work
- Debugging decode issues
- Creating test files for development
- Educational demonstrations

**73 de CR7BBQ-5!** 📻✨

---

Generated with ❤️ for the amateur radio community
