#!/usr/bin/env node

import http from 'node:http';

const listenHost = process.env.PLAYWRIGHT_PROXY_HOST || '127.0.0.1';
const listenPort = Number(process.env.PLAYWRIGHT_PROXY_PORT || '5174');
const baseUrl = process.env.BASE_URL || `http://${listenHost}:${listenPort}`;
const proxyOrigin = new URL(baseUrl);
const moneyOrigin = new URL(process.env.PLAYWRIGHT_MONEY_FRONTEND_URL || 'http://127.0.0.1:5175');
const connectOrigin = new URL(process.env.PLAYWRIGHT_CONNECT_FRONTEND_URL || 'http://127.0.0.1:5176');
const adminOrigin = new URL(process.env.PLAYWRIGHT_ADMIN_FRONTEND_URL || 'http://127.0.0.1:5177');
const apiOrigin = new URL(process.env.PLAYWRIGHT_API_PROXY_TARGET || process.env.API_URL || 'http://127.0.0.1:3000');

const APP_COOKIE_NAME = 'playwright_frontend_app';
const MONEY_APP = 'moneyshyft';
const CONNECT_APP = 'connectshyft';
const ADMIN_APP = 'admin';
const CONNECT_ROUTE_PREFIX = '/app/connectshyft';
const ADMIN_ROUTE_PREFIX = '/admin';
const MONEY_ROUTE_PREFIXES = [
  '/app/route',
  '/accounts',
  '/transactions',
  '/recurring-transactions',
  '/budget',
  '/goals',
  '/debts',
  '/extra-money',
  '/settings',
  '/scenarios',
];
const MONEY_ROUTE_EXACT = new Set([
  '/',
  '/dashboard',
  '/login',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/password/first-login-reset',
]);
const FRONTEND_ASSET_PREFIXES = [
  '/@vite',
  '/@id/',
  '/@fs/',
  '/src/',
  '/node_modules/',
];
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const parseCookies = (rawCookieHeader) => {
  const cookies = new Map();
  if (!rawCookieHeader) {
    return cookies;
  }

  const rawPairs = rawCookieHeader.split(';');
  for (const rawPair of rawPairs) {
    const separatorIndex = rawPair.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = rawPair.slice(0, separatorIndex).trim();
    const value = rawPair.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }
    cookies.set(key, value);
  }

  return cookies;
};

const isMoneyRoute = (pathname) => (
  MONEY_ROUTE_EXACT.has(pathname)
  || MONEY_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
);

const isFrontendAssetRequest = (pathname) => (
  FRONTEND_ASSET_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
  || pathname === '/favicon.ico'
  || pathname === '/manifest.webmanifest'
  || pathname === '/sw.js'
  || pathname === '/vite.svg'
);

const resolveAppFromLocation = (pathname) => {
  if (pathname === CONNECT_ROUTE_PREFIX || pathname.startsWith(`${CONNECT_ROUTE_PREFIX}/`)) {
    return CONNECT_APP;
  }
  if (pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)) {
    return ADMIN_APP;
  }
  if (isMoneyRoute(pathname)) {
    return MONEY_APP;
  }
  return null;
};

const resolveAppFromReferer = (headers) => {
  const referer = typeof headers.referer === 'string' ? headers.referer.trim() : '';
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer, proxyOrigin);
    return resolveAppFromLocation(refererUrl.pathname);
  } catch (_error) {
    return null;
  }
};

const resolveFrontendApp = (pathname, headers) => {
  const directRouteMatch = resolveAppFromLocation(pathname);
  if (directRouteMatch) {
    return directRouteMatch;
  }

  const cookies = parseCookies(headers.cookie);
  const cookieApp = cookies.get(APP_COOKIE_NAME);
  if (cookieApp === MONEY_APP || cookieApp === CONNECT_APP || cookieApp === ADMIN_APP) {
    return cookieApp;
  }

  const refererApp = resolveAppFromReferer(headers);
  if (refererApp) {
    return refererApp;
  }

  return MONEY_APP;
};

const rewriteLocationHeader = (locationValue, targetOrigin) => {
  if (!locationValue) {
    return locationValue;
  }

  try {
    const resolved = new URL(locationValue, targetOrigin);
    if (resolved.origin !== targetOrigin.origin) {
      return locationValue;
    }

    resolved.protocol = proxyOrigin.protocol;
    resolved.host = proxyOrigin.host;
    return resolved.toString();
  } catch (_error) {
    return locationValue;
  }
};

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
};

const buildForwardHeaders = (req, targetOrigin) => {
  const headers = new Headers();

  for (const [name, rawValue] of Object.entries(req.headers)) {
    if (typeof rawValue === 'undefined') {
      continue;
    }

    const normalizedName = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedName)) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue.join(', ') : rawValue;
    headers.set(name, value);
  }

  headers.set('host', targetOrigin.host);
  headers.set('x-forwarded-host', proxyOrigin.host);
  headers.set('x-forwarded-proto', proxyOrigin.protocol.replace(/:$/, ''));

  return headers;
};

const applyResponseHeaders = (res, upstreamResponse, targetOrigin, selectedApp) => {
  const responseHeaders = {};

  upstreamResponse.headers.forEach((value, name) => {
    const normalizedName = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedName)) {
      return;
    }

    responseHeaders[name] = normalizedName === 'location'
      ? rewriteLocationHeader(value, targetOrigin)
      : value;
  });

  const setCookieHeaders = [];
  if (typeof upstreamResponse.headers.getSetCookie === 'function') {
    setCookieHeaders.push(...upstreamResponse.headers.getSetCookie());
  }
  if (selectedApp === MONEY_APP || selectedApp === CONNECT_APP || selectedApp === ADMIN_APP) {
    setCookieHeaders.push(`${APP_COOKIE_NAME}=${selectedApp}; Path=/; SameSite=Lax`);
  }
  if (setCookieHeaders.length > 0) {
    responseHeaders['set-cookie'] = setCookieHeaders;
  }

  res.writeHead(upstreamResponse.status, responseHeaders);
};

const proxyRequest = async (req, res) => {
  const requestUrl = new URL(req.url || '/', proxyOrigin);
  const pathname = requestUrl.pathname;

  let targetOrigin = moneyOrigin;
  let selectedApp = null;

  if (pathname.startsWith('/api/')) {
    targetOrigin = apiOrigin;
  } else if (isFrontendAssetRequest(pathname)) {
    selectedApp = resolveFrontendApp(pathname, req.headers);
    targetOrigin = selectedApp === CONNECT_APP
      ? connectOrigin
      : selectedApp === ADMIN_APP
        ? adminOrigin
        : moneyOrigin;
  } else {
    selectedApp = resolveFrontendApp(pathname, req.headers);
    targetOrigin = selectedApp === CONNECT_APP
      ? connectOrigin
      : selectedApp === ADMIN_APP
        ? adminOrigin
        : moneyOrigin;
  }

  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, targetOrigin);
  const headers = buildForwardHeaders(req, targetOrigin);
  const body = req.method && ['GET', 'HEAD'].includes(req.method.toUpperCase())
    ? undefined
    : await readRequestBody(req);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      ...(body ? { duplex: 'half' } : {}),
    });

    applyResponseHeaders(res, upstreamResponse, targetOrigin, selectedApp);
    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Playwright frontend proxy request failed for ${upstreamUrl}: ${message}\n`);
  }
};

const server = http.createServer((req, res) => {
  void proxyRequest(req, res);
});

server.on('upgrade', (req, socket) => {
  socket.write('HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\n\r\n');
  socket.destroy();
});

server.listen(listenPort, listenHost, () => {
  console.log(
    `Playwright frontend proxy listening on ${proxyOrigin.origin} `
      + `(money: ${moneyOrigin.origin}, connect: ${connectOrigin.origin}, admin: ${adminOrigin.origin}, api: ${apiOrigin.origin})`,
  );
});
