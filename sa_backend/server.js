import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectCentralDb } from './config/db.js';
import indexRoutes from './routes/index.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'sa_backend Control Plane API' });
});

app.use('/api/v1', indexRoutes);

connectCentralDb().catch((err) => console.error('[sa_backend] Initial DB connect error:', err));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`[sa_backend] Control Plane Server running on port: ${PORT}`);
});

export default app;
