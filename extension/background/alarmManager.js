/**
 * Alarm Manager
 * Logic for managing periodic background tasks.
 */

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'vaultSync') {
    // Perform sync
  }
});

// Setup default alarms
chrome.alarms.create('vaultSync', { delayInMinutes: 60, periodInMinutes: 60 });
