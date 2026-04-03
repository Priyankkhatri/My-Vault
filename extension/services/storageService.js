/**
 * Storage Service
 * Abstraction for local or persistent local storage for sensitive data.
 */

export const set = async (key, value) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
};

export const get = async (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
};

export const remove = async (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], () => resolve());
  });
};
