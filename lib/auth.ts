const AUTH_KEY = 'resourcehub_authenticated';

function getLoginCredentials(): { username: string; password: string } {
  const username = import.meta.env.VITE_LOGIN_USERNAME ?? '';
  const password = import.meta.env.VITE_LOGIN_PASSWORD ?? '';
  return { username, password };
}

export function isAuthenticated(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(AUTH_KEY) === 'true';
}

export function setAuthenticated(): void {
  if (typeof window !== 'undefined') localStorage.setItem(AUTH_KEY, 'true');
}

export function logout(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(AUTH_KEY);
}

export function validateCredentials(username: string, password: string): boolean {
  const { username: expectedUser, password: expectedPass } = getLoginCredentials();
  return expectedUser !== '' && expectedPass !== '' && username === expectedUser && password === expectedPass;
}
