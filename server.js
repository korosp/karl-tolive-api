import express from 'express';
import fs from 'fs';
import path from 'path';
import livephotoRouter from './api/livephoto.js';

const app = express();
const port = process.env.PORT || 3000;

// Folder tmp
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route API
app.use('/tools', livephotoRouter);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
