#!/usr/bin/env node

import http from 'node:http';

const proxyOrigin = new URL(process.env.API_URL || 'http://127.0.0.1:3000');
const listenHost = process.env.PLAYWRIGHT_API_PROXY_HOST || proxyOrigin.hostname || '127.0.0.1';
const listenPort = Number(process.env.PLAYWRIGHT_API_PROXY_PORT || proxyOrigin.port || '3000');
const moneyOrigin = new URL(process.env.PLAYWRIGHT_MONEY_API_URL || 'http://127.0.0.1:3001');
const connectOrigin = new URL(process.env.PLAYWRIGHT_CONNECT_API_URL || 'http://127.0.0.1:3002');
const adminOrigin = new URL(process.env.PLAYWRIGHT_ADMIN_API_URL || 'http://127.0.0.1:3100');

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

    headers.set(name, Array.isArray(rawValue) ? rawValue.join(', ') : rawValue);
  }

  headers.set('host', targetOrigin.host);
  headers.set('x-forwarded-host', proxyOrigin.host);
  headers.set('x-forwarded-proto', proxyOrigin.protocol.replace(/:$/, ''));

  return headers;
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
  } catch {
    return locationValue;
  }
};

const applyResponseHeaders = (res, upstreamResponse, targetOrigin) => {
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

  if (typeof upstreamResponse.headers.getSetCookie === 'function') {
    const setCookieHeaders = upstreamResponse.headers.getSetCookie();
    if (setCookieHeaders.length > 0) {
      responseHeaders['set-cookie'] = setCookieHeaders;
    }
  }

  res.writeHead(upstreamResponse.status, responseHeaders);
};

const resolveTargetOrigin = (pathname) => {
  if (pathname === '/health') {
    return null;
  }

  if (pathname.startsWith('/api/v1/connectshyft')) {
    return connectOrigin;
  }

  if (pathname.startsWith('/api/v1/auth') || pathname.startsWith('/api/v1/platform')) {
    return adminOrigin;
  }

  return moneyOrigin;
};

const handleHealth = async (res) => {
  try {
    const [money, connect, admin] = await Promise.all([
      fetch(new URL('/health', moneyOrigin)),
      fetch(new URL('/health', connectOrigin)),
      fetch(new URL('/health', adminOrigin)),
    ]);

    const healthy = money.ok && connect.ok && admin.ok;
    res.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: healthy ? 'ok' : 'degraded',
      services: {
        money: money.status,
        connect: connect.status,
        admin: admin.status,
      },
    }));
  } catch (error) {
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Unknown health proxy error',
    }));
  }
};

const proxyRequest = async (req, res) => {
  const requestUrl = new URL(req.url || '/', proxyOrigin);
  const pathname = requestUrl.pathname;

  if (pathname === '/health') {
    await handleHealth(res);
    return;
  }

  const targetOrigin = resolveTargetOrigin(pathname);
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

    applyResponseHeaders(res, upstreamResponse, targetOrigin);
    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Playwright API proxy request failed for ${upstreamUrl}: ${message}\n`);
  }
};

const server = http.createServer((req, res) => {
  void proxyRequest(req, res);
});

server.listen(listenPort, listenHost, () => {
  process.stdout.write(
    `Playwright API proxy listening on http://${listenHost}:${listenPort} -> money=${moneyOrigin.origin} connect=${connectOrigin.origin} admin=${adminOrigin.origin}\n`,
  );
});
