const FALLBACK = 'Something went wrong. Please try again.';

/**
 * Turns anything axios can reject with into a string safe to render.
 *
 * `error.response` is undefined whenever the request never got an answer -- the server is down,
 * DNS failed, the request was cancelled. Reading `error.response.data` in a catch block therefore
 * throws a TypeError *from the error handler*, replacing a message the user could act on with a
 * blank screen. That is the bug this exists to prevent.
 *
 * The backend answers with a bare string, a `{message}` object, or an array of validation
 * failures, depending on the endpoint. All three arrive here.
 */
export function apiErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data)) {
    const joined = data.filter(Boolean).join(', ');
    if (joined) {
      return joined;
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return FALLBACK;
}

export default apiErrorMessage;
