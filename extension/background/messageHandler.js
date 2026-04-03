/**
 * Message Handler
 * Centralized logic for listening to messages from content scripts and popup.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.type === 'GET_STATUS') {
    sendResponse({ status: 'active' });
  }
  
  return true; // Keep message channel open for async response
});
