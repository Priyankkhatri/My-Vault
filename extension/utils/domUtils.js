/**
 * DOM Utils
 * Helpers for interacting with the DOM.
 */

export const getElementById = (id) => document.getElementById(id);

export const querySelector = (selector) => document.querySelector(selector);

export const createSVGElement = (type) => document.createElementNS('http://www.w3.org/2000/svg', type);
