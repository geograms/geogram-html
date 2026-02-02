// Simple APRS WAV Generator Examples
// Copy and modify these examples for your needs

const APRSWavGenerator = require('./aprs-wav-generator.js');
const generator = new APRSWavGenerator();

// ============================================
// EXAMPLE 1: Direct Message
// ============================================
// Send a message to another station
// Format: :CALLSIGN :Message
// IMPORTANT: Callsign must be 9 characters (padded with spaces)

generator.saveWavFile(
    'example-message.wav',
    'CR7BBQ-5',              // Your callsign
    'K06JZI-5',              // Who you're messaging
    'WIDE1-1',               // Digipeater path
    ':K06JZI-5 :Hi there!'   // Message (note the space padding)
);

// ============================================
// EXAMPLE 2: Position Beacon (Fixed Location)
// ============================================
// Report your location
// Format: !DDMM.mmN/DDDMM.mmE-Comment

generator.saveWavFile(
    'example-position.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1,WIDE2-1',
    '!4912.45N/00831.50E-My Home Station'
);

// Coordinates format:
// Latitude:  DDMM.mm (DD=degrees, MM.mm=decimal minutes)
// Longitude: DDDMM.mm
// Symbol: - (house), > (car), [ (jogger), etc.

// ============================================
// EXAMPLE 3: Status Message
// ============================================
// Broadcast a status update
// Format: >Status text

generator.saveWavFile(
    'example-status.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1',
    '>Monitoring 144.800 MHz'
);

// ============================================
// EXAMPLE 4: Mobile Position
// ============================================
// Report position while mobile

generator.saveWavFile(
    'example-mobile.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1,WIDE2-1',
    '!4912.45N/00831.50E>/Mobile - heading north'
);

// Symbol '>' = car

// ============================================
// EXAMPLE 5: Position with Altitude
// ============================================
// Include altitude in feet

generator.saveWavFile(
    'example-altitude.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1,WIDE2-1',
    '!4912.45N/00831.50E-/A=001234 Hilltop QTH'
);

// /A=001234 means 1234 feet altitude

// ============================================
// EXAMPLE 6: Minimal Beacon
// ============================================
// Simplest possible APRS transmission

generator.saveWavFile(
    'example-minimal.wav',
    'CR7BBQ-5',
    'APRS',
    '',  // No digipeater path
    '>Test'
);

// ============================================
// EXAMPLE 7: Weather Station
// ============================================
// Report weather data

generator.saveWavFile(
    'example-weather.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1',
    '!4912.45N/00831.50E_225/010g015t072r000p000h50b10120'
);

// _ = weather symbol
// 225 = wind direction (degrees)
// /010 = wind speed (10 mph)
// g015 = gust (15 mph)
// t072 = temperature (72°F)
// r000 = rain last hour (0.00 inches)
// p000 = rain last 24h
// h50 = humidity 50%
// b10120 = barometric pressure (1012.0 mb)

// ============================================
// EXAMPLE 8: Message Acknowledgment
// ============================================
// Acknowledge received message

generator.saveWavFile(
    'example-ack.wav',
    'CR7BBQ-5',
    'K06JZI-5',
    'WIDE1-1',
    ':K06JZI-5 :ack001'  // Acknowledge message ID 001
);

// ============================================
// EXAMPLE 9: Bulletin
// ============================================
// Send a bulletin to all stations

generator.saveWavFile(
    'example-bulletin.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1',
    ':BLN1     :Net tonight at 8pm local on 145.500'
);

// BLN1-BLN9 = bulletin numbers

// ============================================
// CUSTOM SETTINGS
// ============================================

// Different sample rate (higher quality, larger file)
const generatorHQ = new APRSWavGenerator(44100);
generatorHQ.saveWavFile(
    'example-hq.wav',
    'CR7BBQ-5',
    'APRS',
    'WIDE1-1',
    '>High quality audio test'
);

// ============================================
// YOUR CUSTOM MESSAGE
// ============================================

// Modify this for your needs:
generator.saveWavFile(
    'my-custom.wav',
    'YOUR-CALL',           // <- Change this
    'APRS',
    'WIDE1-1',
    '>Your message here'   // <- Change this
);

console.log('All example WAV files generated!');
console.log('Check the current directory for .wav files');
console.log('');
console.log('To use with APRSDroid:');
console.log('1. Transfer WAV file to phone');
console.log('2. Play through audio cable to UV-K5');
console.log('3. Monitor 144.800 MHz (Europe) or 144.390 MHz (USA)');
console.log('');
console.log('Remember: Amateur radio license required for transmission!');
