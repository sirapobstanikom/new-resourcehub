const AUTH_KEY = 'resourcehub_authenticated';

export const LOGIN_USERNAME = 'innoclub';
export const LOGIN_PASSWORD = '12345678';

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
  return username === LOGIN_USERNAME && password === LOGIN_PASSWORD;
}
