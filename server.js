import express from 'express';
import toliveRouter from './api/tolive.js';

const app = express();

// Middleware
app.use(express.json());

// Router API
app.use('/api', toliveRouter);

// Port
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));