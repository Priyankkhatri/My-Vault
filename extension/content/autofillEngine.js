/**
 * Autofill Engine
 * Core logic for filling credentials into identified forms.
 */

export const fillCredentials = (element, value) => {
  if (!element) return;
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};
