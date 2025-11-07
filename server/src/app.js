const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const authRoutes = require('./routes/User');

const app = express();
app.use(express.json());

// --- Middlewares ---

// Helmet for basic security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', // Allow client
  methods: ['GET', 'POST'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan for HTTP request logging, piped through Winston
if(process.env.NODE_ENV !== 'test'){
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) }}));
}

// --- Routes ---

app.get('/', (req, res) => {
    logger.info('Hello from server');
});

// Health check route (for testing and load balancers)
app.get('/health', (req, res) => {
    // res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api', (req, res) => {
    res.status(200).json({ message: 'Server API is running!' });
});

app.use('/api/auth', authRoutes);

// Catch-all 404 handler (no `err` param!)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error-handling middleware
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;