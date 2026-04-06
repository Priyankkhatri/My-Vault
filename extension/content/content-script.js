/**
 * content-script.js
 * Entry point for all content-script modules.
 * Orchestrates form detection, autofill dropdown, save prompts,
 * and listens for AUTOFILL_CREDENTIALS messages from the background.
 */

(function () {
  "use strict";



  /** Tracks forms we've already processed so we don't double-bind. */
  const processedForms = new WeakSet();

  /**
   * Scans the page for login forms and wires up autofill + save logic.
   */
  function scanAndBind() {
    const detectedForms = window.MyVaultFormDetector.detectForms();

    for (const formDescriptor of detectedForms) {
      const { usernameField, passwordField } = formDescriptor;

      // Skip if we've already processed this password field
      if (processedForms.has(passwordField)) continue;
      processedForms.add(passwordField);

      // Inject inline icon into the specified field
      const injectIcon = (inputEl) => {
        if (!inputEl || inputEl.dataset.vestigaIconAttached) return;
        inputEl.dataset.vestigaIconAttached = "true";

        const iconContainer = document.createElement('div');
        iconContainer.style.position = 'fixed';
        iconContainer.style.cursor = 'pointer';
        iconContainer.style.zIndex = '2147483646';
        iconContainer.style.width = '18px';
        iconContainer.style.height = '18px';
        // Ensure chrome.runtime.getURL can resolve the icon
        iconContainer.style.backgroundImage = `url(${chrome.runtime.getURL('assets/icon32.png')})`;
        iconContainer.style.backgroundSize = 'contain';
        iconContainer.style.backgroundRepeat = 'no-repeat';
        iconContainer.style.backgroundPosition = 'center';
        iconContainer.style.opacity = '0.7';
        iconContainer.style.transition = 'opacity 0.2s';
        
        iconContainer.addEventListener('mouseenter', () => iconContainer.style.opacity = '1');
        iconContainer.addEventListener('mouseleave', () => iconContainer.style.opacity = '0.7');

        const updatePosition = () => {
          const rect = inputEl.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(inputEl).visibility === 'hidden') {
            iconContainer.style.display = 'none';
          } else {
            iconContainer.style.display = 'block';
            iconContainer.style.top = `${rect.top + (rect.height - 18) / 2}px`;
            iconContainer.style.left = `${rect.right - 28}px`; // 10px padding from right
          }
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition, true);

        document.body.appendChild(iconContainer);

        iconContainer.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.MyVaultDropdown.show(inputEl, formDescriptor);
        });

        const io = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            iconContainer.style.opacity = entry.isIntersecting ? '0.7' : '0';
            iconContainer.style.pointerEvents = entry.isIntersecting ? 'auto' : 'none';
          });
        });
        io.observe(inputEl);
      };

      if (usernameField) injectIcon(usernameField);
      injectIcon(passwordField);

      // Attach save-on-submit listener
      window.MyVaultSavePrompt.attachSubmitListener(formDescriptor);


    }
  }

  // --- Listen for AUTOFILL_CREDENTIALS from popup → background → here ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === "AUTOFILL_CREDENTIALS" && message.credentials) {


      const credentials = message.credentials;
      const detectedForms = window.MyVaultFormDetector.detectForms();

      if (detectedForms.length > 0) {
        // Fill the first detected form
        window.MyVaultAutofill.fill(credentials, detectedForms[0]);

        sendResponse({ success: true });
      } else {
        console.warn("[Vestiga] No login forms detected on this page.");
        sendResponse({ success: false, error: "No login forms found" });
      }

      return true; // async response
    }
  });

  // --- Initial scan (after a short delay to let SPAs render) ---
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(scanAndBind, 300));
  } else {
    setTimeout(scanAndBind, 300);
  }

  // --- Observe DOM mutations for dynamically injected forms ---
  const observer = new MutationObserver((mutations) => {
    let hasNewInputs = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            node.matches?.('input[type="password"]') ||
            node.querySelector?.('input[type="password"]')
          ) {
            hasNewInputs = true;
            break;
          }
        }
      }
      if (hasNewInputs) break;
    }

    if (hasNewInputs) {
      // Debounce slightly to let the DOM settle
      clearTimeout(scanAndBind._debounce);
      scanAndBind._debounce = setTimeout(scanAndBind, 500);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
