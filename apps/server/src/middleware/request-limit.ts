import { createMiddleware } from 'hono/factory';

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB

export const requestLimitMiddleware = createMiddleware(async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return c.json({ error: 'Request body too large. Maximum size is 2MB.' }, 413);
  }
  await next();
});
