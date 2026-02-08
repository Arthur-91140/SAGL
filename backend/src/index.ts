import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import materialsRoutes from './routes/admin/materials';
import storagesRoutes from './routes/admin/storages';
import inventoriesRoutes from './routes/admin/inventories';
import notificationsRoutes from './routes/admin/notifications';
import statsRoutes from './routes/admin/stats';
import exportsRoutes from './routes/admin/exports';
import inventoryRoutes from './routes/inventory';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/admin/materials', materialsRoutes);
app.use('/api/admin/storages', storagesRoutes);
app.use('/api/admin/inventories', inventoriesRoutes);
app.use('/api/admin/notifications', notificationsRoutes);
app.use('/api/admin/stats', statsRoutes);
app.use('/api/admin/exports', exportsRoutes);
app.use('/api/inventory', inventoryRoutes);

// Servir le frontend en production
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SAGL Backend démarré sur le port ${PORT}`);
});

export default app;
