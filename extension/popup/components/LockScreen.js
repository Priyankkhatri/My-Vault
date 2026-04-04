/**
 * LockScreen.js → LoginScreen
 * Manages the login form UI for Supabase email/password authentication.
 */

(function () {
  "use strict";

  window.LockScreen = {
    /**
     * Initializes the login form with event bindings.
     * @param {object} opts
     * @param {Function} opts.onSignIn - Called when user clicks Sign In.
     */
    init(opts) {
      const emailInput = document.getElementById("login-email");
      const passwordInput = document.getElementById("login-password");
      const btn = document.getElementById("btn-signin");
      const toggle = document.getElementById("btn-toggle-pw");

      btn.addEventListener("click", () => {
        if (opts.onSignIn) opts.onSignIn();
      });

      // Enter key on email moves to password
      emailInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          passwordInput.focus();
        }
      });

      // Enter key on password triggers sign in
      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          btn.click();
        }
      });

      // Toggle password visibility
      toggle.addEventListener("click", () => {
        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
      });

      // Auto-focus email on load
      setTimeout(() => emailInput.focus(), 50);
    },

    show() {
      document.getElementById("login-screen").classList.remove("hidden");
      document.getElementById("vault-view").classList.add("hidden");
      document.getElementById("settings-bar").classList.add("hidden");
      const emailInput = document.getElementById("login-email");
      const passwordInput = document.getElementById("login-password");
      emailInput.value = "";
      passwordInput.value = "";
      this.hideError();
      setTimeout(() => emailInput.focus(), 50);
    },

    showError(msg) {
      const el = document.getElementById("login-error");
      el.textContent = msg;
      el.classList.remove("hidden");
    },

    hideError() {
      document.getElementById("login-error").classList.add("hidden");
    }
  };
})();
