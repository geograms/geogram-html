/**
 * AX.25 APRS WAV File Generator
 * Generates Bell 202 AFSK 1200 baud audio for APRS packets
 */

class APRSWavGenerator {
  constructor(sampleRate = 22050) {
    this.sampleRate = sampleRate;
    this.markFreq = 1200;  // Mark frequency (1)
    this.spaceFreq = 2200; // Space frequency (0)
    this.baudRate = 1200;
    this.samplesPerBit = Math.floor(this.sampleRate / this.baudRate);
  }

  /**
   * Calculate CRC-16-CCITT (AX.25 FCS)
   */
  calculateFCS(data) {
    let crc = 0xFFFF;
    
    for (let byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8408;
        } else {
          crc = crc >> 1;
        }
      }
    }
    
    return (~crc) & 0xFFFF;
  }

  /**
   * Encode callsign to AX.25 format (7 bytes)
   */
  encodeCallsign(callsign, ssid = 0, isLast = false) {
    const parts = callsign.toUpperCase().split('-');
    const call = parts[0].padEnd(6, ' ');
    const actualSsid = parts[1] ? parseInt(parts[1]) : ssid;
    
    const encoded = [];
    
    // Encode callsign (shift left by 1)
    for (let i = 0; i < 6; i++) {
      encoded.push(call.charCodeAt(i) << 1);
    }
    
    // Encode SSID byte
    let ssidByte = (actualSsid << 1) | 0x60; // Set reserved bits
    if (isLast) {
      ssidByte |= 0x01; // Set last address bit
    }
    encoded.push(ssidByte);
    
    return encoded;
  }

  /**
   * Create AX.25 packet
   */
  createAX25Packet(source, destination, path, message) {
    const packet = [];
    
    // Destination address
    packet.push(...this.encodeCallsign(destination, 0, false));
    
    // Source address
    const pathArray = path ? path.split(',').filter(p => p.trim()) : [];
    const sourceIsLast = pathArray.length === 0;
    packet.push(...this.encodeCallsign(source, 0, sourceIsLast));
    
    // Digipeater path
    for (let i = 0; i < pathArray.length; i++) {
      const isLast = i === pathArray.length - 1;
      packet.push(...this.encodeCallsign(pathArray[i].trim(), 0, isLast));
    }
    
    // Control field (UI frame)
    packet.push(0x03);
    
    // Protocol ID (No layer 3)
    packet.push(0xF0);
    
    // Information field
    for (let i = 0; i < message.length; i++) {
      packet.push(message.charCodeAt(i));
    }
    
    return packet;
  }

  /**
   * Bit-stuff the data (insert 0 after five consecutive 1s)
   */
  bitStuff(bits) {
    const stuffed = [];
    let consecutiveOnes = 0;
    
    for (let bit of bits) {
      stuffed.push(bit);
      
      if (bit === 1) {
        consecutiveOnes++;
        if (consecutiveOnes === 5) {
          stuffed.push(0); // Insert stuffing bit
          consecutiveOnes = 0;
        }
      } else {
        consecutiveOnes = 0;
      }
    }
    
    return stuffed;
  }

  /**
   * Convert byte array to bit array (LSB first)
   */
  bytesToBits(bytes) {
    const bits = [];
    for (let byte of bytes) {
      for (let i = 0; i < 8; i++) {
        bits.push((byte >> i) & 1);
      }
    }
    return bits;
  }

  /**
   * NRZI encode the bits
   */
  nrziEncode(bits) {
    const encoded = [];
    let currentLevel = 1;
    
    for (let bit of bits) {
      if (bit === 0) {
        // Transition for 0
        currentLevel = 1 - currentLevel;
      }
      // No transition for 1
      encoded.push(currentLevel);
    }
    
    return encoded;
  }

  /**
   * Generate AFSK audio samples from NRZI bits
   */
  generateAFSK(nrziBits, addVoxBeep = true) {
    const samples = [];
    let phase = 0;
    
    // Add VOX activation with SYNTHESIZED VOICE-LIKE SOUND
    // VOX circuits are optimized for human speech (300-3000 Hz range)
    if (addVoxBeep) {
      const voiceDuration = 1.0; // 1 second of voice-like sound
      const voiceSamples = Math.floor(this.sampleRate * voiceDuration);

      // Simulate human voice by mixing multiple frequencies in speech range
      // Human voice fundamental: 85-180 Hz (male) or 165-255 Hz (female)
      // We'll use harmonics to create a voice-like timbre

      let voicePhase1 = 0; // Fundamental frequency
      let voicePhase2 = 0; // 2nd harmonic
      let voicePhase3 = 0; // 3rd harmonic
      let voicePhase4 = 0; // Formant-like frequency

      const fundamental = 120; // 120 Hz fundamental (male voice range)
      const harmonic2 = 240;   // 2nd harmonic
      const harmonic3 = 360;   // 3rd harmonic
      const formant = 800;     // Formant frequency (vowel-like)

      for (let i = 0; i < voiceSamples; i++) {
        // Create time-varying amplitude to simulate speech rhythm
        const t = i / this.sampleRate;
        const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t); // 3 Hz modulation

        // Mix harmonics like a human voice
        const voice1 = Math.sin(voicePhase1) * 0.4;  // Fundamental (40%)
        const voice2 = Math.sin(voicePhase2) * 0.25; // 2nd harmonic (25%)
        const voice3 = Math.sin(voicePhase3) * 0.15; // 3rd harmonic (15%)
        const voice4 = Math.sin(voicePhase4) * 0.2;  // Formant (20%)

        // Add slight noise for breathiness
        const breathNoise = (Math.random() * 2 - 1) * 0.05;

        // Combine all components with envelope
        const sample = (voice1 + voice2 + voice3 + voice4 + breathNoise) * envelope * 0.95;
        samples.push(sample);

        // Update phases
        voicePhase1 += (2 * Math.PI * fundamental) / this.sampleRate;
        voicePhase2 += (2 * Math.PI * harmonic2) / this.sampleRate;
        voicePhase3 += (2 * Math.PI * harmonic3) / this.sampleRate;
        voicePhase4 += (2 * Math.PI * formant) / this.sampleRate;
      }

      // Reset phase for data transmission
      phase = 0;
    }

    for (let bit of nrziBits) {
      const freq = bit === 1 ? this.markFreq : this.spaceFreq;
      
      for (let i = 0; i < this.samplesPerBit; i++) {
        const sample = Math.sin(phase);
        samples.push(sample);
        phase += (2 * Math.PI * freq) / this.sampleRate;
      }
    }
    
    return samples;
  }

  /**
   * Create WAV file header
   */
  createWavHeader(dataLength) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    // "RIFF" chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true); // File size - 8
    this.writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk size
    view.setUint16(20, 1, true);  // Audio format (PCM)
    view.setUint16(22, 1, true);  // Number of channels (mono)
    view.setUint32(24, this.sampleRate, true); // Sample rate
    view.setUint32(28, this.sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true);  // Block align
    view.setUint16(34, 16, true); // Bits per sample
    
    // "data" sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    return buffer;
  }

  /**
   * Write string to DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Generate complete APRS WAV file
   */
  generateWav(source, destination, path, message) {
    // Add preamble flags (0x7E)
    const preambleFlags = Array(30).fill(0x7E);
    
    // Create AX.25 packet
    const packet = this.createAX25Packet(source, destination, path, message);
    
    // Calculate and append FCS
    const fcs = this.calculateFCS(packet);
    packet.push(fcs & 0xFF);
    packet.push((fcs >> 8) & 0xFF);
    
    // Add postamble flag
    const postambleFlag = [0x7E];
    
    // Combine: preamble + packet + postamble
    const fullPacket = [...preambleFlags, ...packet, ...postambleFlag];
    
    // Convert to bits
    const bits = this.bytesToBits(fullPacket);
    
    // Bit stuff (exclude flag bytes)
    const preambleBits = this.bytesToBits(preambleFlags);
    const packetBits = this.bytesToBits(packet);
    const postambleBits = this.bytesToBits(postambleFlag);
    
    const stuffedPacketBits = this.bitStuff(packetBits);
    const allBits = [...preambleBits, ...stuffedPacketBits, ...postambleBits];
    
    // NRZI encode
    const nrziBits = this.nrziEncode(allBits);
    
    // Generate AFSK audio
    const samples = this.generateAFSK(nrziBits);
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      pcmData[i] = Math.round(samples[i] * 32767 * 0.8); // 80% volume
    }
    
    // Create WAV file
    const dataLength = pcmData.length * 2; // 2 bytes per sample
    const header = this.createWavHeader(dataLength);
    
    // Combine header and data
    const wavFile = new Uint8Array(44 + dataLength);
    wavFile.set(new Uint8Array(header), 0);
    wavFile.set(new Uint8Array(pcmData.buffer), 44);
    
    return wavFile;
  }

  /**
   * Save WAV file (Node.js)
   */
  saveWavFile(filename, source, destination, path, message) {
    const fs = require('fs');
    const wavData = this.generateWav(source, destination, path, message);
    fs.writeFileSync(filename, wavData);
    console.log(`WAV file saved: ${filename}`);
  }

  /**
   * Get WAV as base64 (for browser)
   */
  getWavBase64(source, destination, path, message) {
    const wavData = this.generateWav(source, destination, path, message);
    return Buffer.from(wavData).toString('base64');
  }
}

// Example usage for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APRSWavGenerator;
  
  // Run example if called directly
  if (require.main === module) {
    const generator = new APRSWavGenerator();
    
    // Example: Generate APRS message
    generator.saveWavFile(
      'aprs-message.wav',
      'CR7BBQ-5',           // Your callsign
      'K06JZI-5',           // Destination callsign  
      'WIDE1-1,WIDE2-1',    // Digipeater path
      ':K06JZI-5 :Hello!'   // Message (note: recipient must be 9 chars padded)
    );
    
    // Example: Position beacon
    generator.saveWavFile(
      'aprs-position.wav',
      'CR7BBQ-5',
      'APRS',
      'WIDE1-1,WIDE2-1',
      '!4912.45N/00831.50E-Testing APRS'
    );
    
    // Example: Status message
    generator.saveWavFile(
      'aprs-status.wav',
      'CR7BBQ-5',
      'APRS',
      'WIDE1-1',
      '>Hello from UV-K5!'
    );
    
    console.log('All examples generated successfully!');
  }
}
