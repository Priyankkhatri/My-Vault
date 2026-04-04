/**
 * ItemList.js
 * Manages the list of vault items, including loading, empty, and populated states.
 */

(function () {
  "use strict";

  window.ItemList = {
    /**
     * Shows the loading state.
     */
    showLoading() {
      const loading = document.getElementById("loading-state");
      const empty = document.getElementById("empty-state");
      const list = document.getElementById("item-list");

      loading.classList.remove("hidden");
      empty.classList.add("hidden");
      list.innerHTML = this._createSkeletons(4);
      list.classList.remove("hidden");
    },

    _createSkeletons(count) {
      let html = "";
      for (let i = 0; i < count; i++) {
        html += `
          <div class="skeleton-card shimmer">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-info">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        `;
      }
      return html;
    },

    /**
     * Renders a list of items, or shows empty state.
     * @param {Array} items - Decrypted vault items.
     * @param {object} opts
     * @param {Function} opts.onCopyUsername
     * @param {Function} opts.onCopyPassword
     */
    render(items, opts = {}) {
      const loading = document.getElementById("loading-state");
      const empty = document.getElementById("empty-state");
      const list = document.getElementById("item-list");

      loading.classList.add("hidden");
      list.innerHTML = "";

      if (!items || items.length === 0) {
        empty.classList.remove("hidden");
        list.classList.add("hidden");
        return;
      }

      empty.classList.add("hidden");
      list.classList.remove("hidden");

      for (const item of items) {
        list.appendChild(window.ItemCard.create(item, opts));
      }
    }
  };
})();
