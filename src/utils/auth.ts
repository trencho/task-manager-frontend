export const setAccessToken = (token: string): void => {
    localStorage.setItem('access_token', token);
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem('access_token');
};

export const setRefreshToken = (token: string): void => {
    localStorage.setItem('refresh_token', token);
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refresh_token');
};

export const clearTokens = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};
