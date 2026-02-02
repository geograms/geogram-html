// lib/backup.js - Backup and restore functionality for Geogram

(function() {
  'use strict';

  const BACKUP_VERSION = '1.0';

  // Define what keys to backup
  const SETTINGS_KEYS = [
    'username', 'privkey', 'pubkey', 'npub', 'nsec',
    'theme', 'brandText',
    'nostrEndpoint',
    'aprsCallsign', 'aprsDestination',
    'nearby.lat', 'nearby.lng', 'nearby.radius',
    'mapView', 'lastTab', 'currentTab',
    'locations', 'countries'
  ];

  const CACHE_KEYS = [
    'geogram_contacts', 'geogram_contacts_timestamp',
    'cachedWeatherStations', 'weatherCacheExpiry',
    'cachedIGates', 'igateCacheTime', 'igateSampleTest',
    'streamCache', 'streamCacheTimestamp'
  ];

  /**
   * Get all localStorage keys matching a pattern
   */
  function getKeysMatching(pattern) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Collect all message cache data
   */
  function collectMessageData() {
    const messageKeys = getKeysMatching('messages_cache:');
    const messages = {};

    messageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        messages[key] = value;
      }
    });

    return messages;
  }

  /**
   * Collect settings data
   */
  function collectSettings() {
    const settings = {};

    SETTINGS_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        settings[key] = value;
      }
    });

    return settings;
  }

  /**
   * Collect cache data
   */
  function collectCache() {
    const cache = {};

    CACHE_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        cache[key] = value;
      }
    });

    return cache;
  }

  /**
   * Export full backup as ZIP file
   */
  async function exportFullBackup() {
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

      // Metadata
      const metadata = {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        username: localStorage.getItem('username') || 'unknown',
        appVersion: 'geogram-html'
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Settings
      const settings = collectSettings();
      zip.file('settings.json', JSON.stringify(settings, null, 2));

      // Messages
      const messages = collectMessageData();
      if (Object.keys(messages).length > 0) {
        const messagesFolder = zip.folder('messages');
        Object.entries(messages).forEach(([key, value]) => {
          // Extract peer name from key for better organization
          const parts = key.split(':');
          let filename = key.replace(/:/g, '_') + '.json';

          if (parts[2] === 'conversation' && parts[3]) {
            // Save conversation as markdown file
            filename = `conversation_${parts[3]}.md`;
            messagesFolder.file(filename, value);
          } else {
            // Save other message data as JSON
            messagesFolder.file(filename, JSON.stringify({ key, value }, null, 2));
          }
        });
      }

      // Contacts and cache
      const cache = collectCache();
      if (Object.keys(cache).length > 0) {
        zip.file('cache.json', JSON.stringify(cache, null, 2));
      }

      // Generate ZIP
      const blob = await zip.generateAsync({ type: 'blob' });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geogram-backup-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, message: 'Backup exported successfully!' };
    } catch (error) {
      console.error('[backup] Export failed:', error);
      return { success: false, message: 'Backup export failed: ' + error.message };
    }
  }

  /**
   * Export only messages
   */
  async function exportMessagesOnly() {
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

      const metadata = {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        username: localStorage.getItem('username') || 'unknown',
        type: 'messages-only'
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      const messages = collectMessageData();
      if (Object.keys(messages).length === 0) {
        return { success: false, message: 'No messages to export.' };
      }

      const messagesFolder = zip.folder('messages');
      Object.entries(messages).forEach(([key, value]) => {
        const parts = key.split(':');
        let filename = key.replace(/:/g, '_') + '.json';

        if (parts[2] === 'conversation' && parts[3]) {
          filename = `conversation_${parts[3]}.md`;
          messagesFolder.file(filename, value);
        } else {
          messagesFolder.file(filename, JSON.stringify({ key, value }, null, 2));
        }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geogram-messages-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, message: 'Messages exported successfully!' };
    } catch (error) {
      console.error('[backup] Messages export failed:', error);
      return { success: false, message: 'Messages export failed: ' + error.message };
    }
  }

  /**
   * Export only settings
   */
  async function exportSettingsOnly() {
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

      const metadata = {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        username: localStorage.getItem('username') || 'unknown',
        type: 'settings-only'
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      const settings = collectSettings();
      const cache = collectCache();

      zip.file('settings.json', JSON.stringify(settings, null, 2));
      if (Object.keys(cache).length > 0) {
        zip.file('cache.json', JSON.stringify(cache, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geogram-settings-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, message: 'Settings exported successfully!' };
    } catch (error) {
      console.error('[backup] Settings export failed:', error);
      return { success: false, message: 'Settings export failed: ' + error.message };
    }
  }

  /**
   * Create auto-backup before restore
   */
  async function createAutoBackup() {
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

      const metadata = {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        username: localStorage.getItem('username') || 'unknown',
        type: 'auto-backup-before-restore'
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      const settings = collectSettings();
      zip.file('settings.json', JSON.stringify(settings, null, 2));

      const messages = collectMessageData();
      if (Object.keys(messages).length > 0) {
        const messagesFolder = zip.folder('messages');
        Object.entries(messages).forEach(([key, value]) => {
          const parts = key.split(':');
          let filename = key.replace(/:/g, '_') + '.json';

          if (parts[2] === 'conversation' && parts[3]) {
            filename = `conversation_${parts[3]}.md`;
            messagesFolder.file(filename, value);
          } else {
            messagesFolder.file(filename, JSON.stringify({ key, value }, null, 2));
          }
        });
      }

      const cache = collectCache();
      if (Object.keys(cache).length > 0) {
        zip.file('cache.json', JSON.stringify(cache, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geogram-auto-backup-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('[backup] Auto-backup failed:', error);
      return { success: false };
    }
  }

  /**
   * Import backup from ZIP file
   */
  async function importBackup(file, options = {}) {
    try {
      // Create auto-backup first
      if (!options.skipAutoBackup) {
        await createAutoBackup();
      }

      const zip = await JSZip.loadAsync(file);

      // Read metadata
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        return { success: false, message: 'Invalid backup file: missing metadata' };
      }

      const metadata = JSON.parse(await metadataFile.async('string'));
      console.log('[backup] Importing backup from:', metadata.exportDate, 'User:', metadata.username);

      let settingsRestored = 0;
      let messagesRestored = 0;
      let cacheRestored = 0;

      // Restore settings
      const settingsFile = zip.file('settings.json');
      if (settingsFile) {
        const settings = JSON.parse(await settingsFile.async('string'));
        Object.entries(settings).forEach(([key, value]) => {
          if (options.restoreSettings !== false) {
            localStorage.setItem(key, value);
            settingsRestored++;
          }
        });
      }

      // Restore messages
      const messagesFolder = zip.folder('messages');
      if (messagesFolder && options.restoreMessages !== false) {
        const messageFiles = [];
        messagesFolder.forEach((relativePath, file) => {
          messageFiles.push({ relativePath, file });
        });

        for (const { relativePath, file } of messageFiles) {
          const content = await file.async('string');

          if (relativePath.startsWith('conversation_') && relativePath.endsWith('.md')) {
            // Restore conversation markdown
            const peer = relativePath.replace('conversation_', '').replace('.md', '');
            const caller = localStorage.getItem('username') || 'unknown';
            const key = `messages_cache:${caller}:conversation:${peer}`;
            localStorage.setItem(key, content);
            messagesRestored++;
          } else if (relativePath.endsWith('.json')) {
            // Restore other message data
            try {
              const data = JSON.parse(content);
              if (data.key && data.value) {
                localStorage.setItem(data.key, data.value);
                messagesRestored++;
              }
            } catch (e) {
              console.warn('[backup] Failed to parse message file:', relativePath, e);
            }
          }
        }
      }

      // Restore cache
      const cacheFile = zip.file('cache.json');
      if (cacheFile && options.restoreCache !== false) {
        const cache = JSON.parse(await cacheFile.async('string'));
        Object.entries(cache).forEach(([key, value]) => {
          localStorage.setItem(key, value);
          cacheRestored++;
        });
      }

      const message = `Backup restored successfully!\n` +
                     `Settings: ${settingsRestored} items\n` +
                     `Messages: ${messagesRestored} items\n` +
                     `Cache: ${cacheRestored} items`;

      return {
        success: true,
        message,
        metadata,
        stats: { settingsRestored, messagesRestored, cacheRestored }
      };
    } catch (error) {
      console.error('[backup] Import failed:', error);
      return { success: false, message: 'Backup import failed: ' + error.message };
    }
  }

  /**
   * Analyze backup file without importing
   */
  async function analyzeBackup(file) {
    try {
      const zip = await JSZip.loadAsync(file);

      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        return { success: false, message: 'Invalid backup file: missing metadata' };
      }

      const metadata = JSON.parse(await metadataFile.async('string'));

      const settingsFile = zip.file('settings.json');
      const settings = settingsFile ? JSON.parse(await settingsFile.async('string')) : {};

      const messagesFolder = zip.folder('messages');
      let messageCount = 0;
      if (messagesFolder) {
        messagesFolder.forEach(() => messageCount++);
      }

      const cacheFile = zip.file('cache.json');
      const cache = cacheFile ? JSON.parse(await cacheFile.async('string')) : {};

      return {
        success: true,
        metadata,
        settingsCount: Object.keys(settings).length,
        messagesCount: messageCount,
        cacheCount: Object.keys(cache).length,
        username: metadata.username,
        exportDate: metadata.exportDate
      };
    } catch (error) {
      console.error('[backup] Analyze failed:', error);
      return { success: false, message: 'Failed to analyze backup: ' + error.message };
    }
  }

  // Export functions to global scope
  window.GeogramBackup = {
    exportFullBackup,
    exportMessagesOnly,
    exportSettingsOnly,
    importBackup,
    analyzeBackup
  };

  console.log('[backup] Backup module loaded');
})();
