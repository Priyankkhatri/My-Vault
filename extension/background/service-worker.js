/**
 * My-Vault Service Worker
 * Entry point for the background process.
 */

import './messageHandler.js';
import './alarmManager.js';
import './syncManager.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('My-Vault extension installed');
  // Initialize default settings if needed
});
