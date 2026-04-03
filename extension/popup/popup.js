/**
 * Popup Script
 * Logic for the extension popup UI.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded');
  const content = document.querySelector('.content');
  
  // Basic interaction example
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.status === 'active') {
      content.innerHTML = '<p>Vault is Active</p>';
    }
  });
});
