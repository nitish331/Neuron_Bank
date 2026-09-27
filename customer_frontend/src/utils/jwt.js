/** Reads a JWT payload without verifying it — the server is the authority. */
export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Treats a token without a readable `exp` as expired. Skew covers clock drift. */
export function isTokenExpired(token, skewSeconds = 30) {
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
