/**
 * SettingsBar.js
 * Top bar with user info, lock, sign out, and dashboard actions.
 */

(function () {
  "use strict";

  window.SettingsBar = {
    init(opts) {
      document.getElementById("btn-signout").addEventListener("click", function () {
        if (opts.onSignOut) opts.onSignOut();
      });

      document.getElementById("btn-lock").addEventListener("click", function () {
        if (opts.onLock) opts.onLock();
      });

      document.getElementById("btn-dashboard").addEventListener("click", function () {
        if (opts.onDashboard) opts.onDashboard();
      });
    },

    show(user) {
      var bar = document.getElementById("settings-bar");
      var emailEl = document.getElementById("user-email");

      if (user && user.email) {
        emailEl.textContent = user.email;
        emailEl.title = user.email;
      } else {
        emailEl.textContent = "";
      }

      bar.classList.remove("hidden");
    },

    hide() {
      document.getElementById("settings-bar").classList.add("hidden");
    }
  };
})();
