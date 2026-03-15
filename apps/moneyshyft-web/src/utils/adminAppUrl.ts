const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

export const resolveAdminAppBaseUrl = (): string => {
  const configured = import.meta.env.VITE_ADMIN_APP_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL(window.location.origin);

  if (url.hostname.startsWith('money.')) {
    url.hostname = `admin.${url.hostname.slice('money.'.length)}`;
    return normalizeBaseUrl(url.origin);
  }

  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
    if (url.port === '5173') {
      url.port = '5174';
    } else if (url.port === '4173') {
      url.port = '4174';
    }
  }

  return normalizeBaseUrl(url.origin);
};

export const buildAdminAppUrl = (path = '/admin'): string => {
  const baseUrl = resolveAdminAppBaseUrl();

  if (!baseUrl) {
    return path;
  }

  return new URL(path, `${baseUrl}/`).toString();
};

export const redirectToAdminApp = (path = '/admin'): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(buildAdminAppUrl(path));
};
