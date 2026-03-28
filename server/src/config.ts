import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  pollIntervalMs: 5000,
  cacheTtlQuote: 5000,
  cacheTtlHistory: 300000,
  marketOpen: { hour: 9, minute: 15 },
  marketClose: { hour: 15, minute: 30 },
};
