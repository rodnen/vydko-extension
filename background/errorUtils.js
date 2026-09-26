export function serializeError(error) {
  if (!error) return { message: chrome.i18n.getMessage('errorUnknown') };
  if (typeof error === 'string') return { message: error };

  return {
    message: error.message || String(error),
    ...(error.url ? { url: error.url } : {})
  };
}
