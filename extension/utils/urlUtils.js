/**
 * URL Utils
 * Helpers for parsing and normalizing URLs for domain-based search.
 */

export const getDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
};

export const normalizeUrl = (url) => {
  return url.toLowerCase().trim();
};
