/**
 * API Client
 * Centralized fetch/axios logic for communicating with the My-Vault server.
 */

const BASE_URL = 'https://api.my-vault.com'; // Placeholder base URL

export const request = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
};
