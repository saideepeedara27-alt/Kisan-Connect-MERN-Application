import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = configuredApiUrl ? configuredApiUrl.replace(/\/$/, '') : '';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export function toAssetUrl(path) {
  if (!path) {
    return '';
  }

  if (path.startsWith('http')) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}
