export function setTokens(accessToken, refreshToken = '') {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken !== '') {
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export function getTokens() {
  const accessTokenString = localStorage.getItem('accessToken');
  const refreshTokenString = localStorage.getItem('refreshToken');
  return { accessToken: accessTokenString, refreshToken: refreshTokenString };
}