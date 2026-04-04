/**
 * alarmManager.js
 */

var alarmManager = {
  startAutoLockTimer() {
    chrome.alarms.create("autoLock", { delayInMinutes: 5 });
  },

  startSyncTimer() {
    chrome.alarms.create("syncVault", { periodInMinutes: 15 });
  }
};

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "autoLock") {
    if (typeof self !== 'undefined' && self.authService) {
      self.authService.lock();
    }
    if (typeof self !== 'undefined' && self.syncManager) {
      self.syncManager.clearCache();
    }
  } else if (alarm.name === "syncVault") {
    if (typeof self !== 'undefined' && self.syncManager) {
      self.syncManager.syncVault();
    }
  }
});

if (typeof self !== 'undefined') {
  self.alarmManager = alarmManager;
}
