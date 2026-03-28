// Fix Windows SSL revocation check issue with Yahoo Finance
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { config } from './config.js';
import { setupWebSocket } from './websocket/wsServer.js';
import marketRoutes from './routes/market.js';
import watchlistRoutes from './routes/watchlist.js';
import portfolioRoutes from './routes/portfolio.js';
import orderRoutes from './routes/orders.js';
import alertRoutes from './routes/alerts.js';
import forecastRoutes from './routes/forecast.js';

// Import db to initialize JSON store
import './models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(cors({
  origin: config.nodeEnv === 'production'
    ? true  // Allow all origins in production (served from same domain)
    : ['http://localhost:5173', 'http://127.0.0.1:5173']
}));
app.use(express.json());

// Routes
app.use('/api', marketRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/forecast', forecastRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve static client files in production
if (config.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for any non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Setup WebSocket
setupWebSocket(server);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     ALADDIN Trading Terminal Server      ║
  ║     Running on port ${config.port}                ║
  ║     Mode: ${config.nodeEnv.padEnd(30)}║
  ╚══════════════════════════════════════════╝
  `);
});
