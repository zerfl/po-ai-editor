import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { healthRoute } from './routes/health.js';
import { modelsRoute } from './routes/models.js';
import { parseRoute } from './routes/parse.js';
import { translateRoute } from './routes/translate.js';
import { exportRoute } from './routes/export.js';
import { securityMiddleware } from './middleware/security.js';
import { requestLimitMiddleware } from './middleware/request-limit.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

app.use('/*', cors());
app.use('/*', securityMiddleware);
app.use('/api/*', requestLimitMiddleware);

app.route('/api', healthRoute);
app.route('/api', modelsRoute);
app.route('/api', parseRoute);
app.route('/api', translateRoute);
app.route('/api', exportRoute);

const staticPath = join(__dirname, '../../web/dist');
app.use('/*', serveStatic({ root: staticPath }));

const port = parseInt(process.env.PORT ?? '8787');

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${String(info.port)}`);
});
