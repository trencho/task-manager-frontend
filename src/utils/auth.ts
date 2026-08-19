export const setAccessToken = (token: string): void => {
    localStorage.setItem('access_token', token);
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem('access_token');
};

export const clearTokens = (): void => {
    localStorage.removeItem('access_token');
    // The stale refresh token from before it moved to a cookie. Removed so a browser upgrading to
    // this bundle does not leave a long-lived credential sitting in storage for nothing.
    localStorage.removeItem('refresh_token');
};
