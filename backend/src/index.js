// backend/src/index.js

// Load environment variables from backend/.env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import our custom route controllers
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const userRoutes = require('./routes/users');
const complianceRoutes = require('./routes/compliance');
const taskRoutes = require('./routes/tasks');
const registerRoutes = require('./routes/registers');
const chatbotRoutes = require('./routes/chatbot');



// Initialize the Express application
const app = express();

// ==========================================
// SECURITY MIDDLEWARE CONFIGURATION
// ==========================================

// Helmet sets HTTP headers relating to security (e.g. Content-Security-Policy, HSTS, Clickjacking).
// Highly recommended to satisfy Indian CERT-In guidelines for securing web portals.
app.use(helmet());

// Configure Cross-Origin Resource Sharing (CORS) to allow communication from the React frontend.
// In production, restrict origin to the actual hosted URL.
app.use(cors({
  origin: '*', // For development, allow requests from any host (e.g. our Vite React server)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express parser middleware to extract JSON payloads from incoming request bodies
app.use(express.json());

// Serve static assets (e.g. Help Manual PDF) from public folder
app.use('/static', express.static('public'));

// Health check route for load balancers and CI checkups
app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'Compliance Asset Manager API' });
});

// Routes handling authentication (Sign-in, first-time DPDP consent validation)
app.use('/api/auth', authRoutes);

// Routes handling ISO 27001 asset register operations (CRUD and histories)
app.use('/api/assets', assetRoutes);

// Routes managing employee profiles, corrections, and Right to Erasure anonymizations
app.use('/api/users', userRoutes);

// Routes hosting RoPA privacy declarations and downloading CERT-In audit reports
app.use('/api/compliance', complianceRoutes);

// Routes managing ISMS audits, compliance check checklists and non-conformances
app.use('/api/tasks', taskRoutes);

// Routes managing digitized operational registers (Documents, Risks, Access, Incidents, Visitor, Backups, Patches)
app.use('/api/registers', registerRoutes);

// Chatbot natural language processing engine
app.use('/api/chatbot', chatbotRoutes);



// ==========================================
// CENTRAL ERROR AND NOT-FOUND HANDLERS
// ==========================================

// Catch-all route handler for requests targeting undefined endpoints
app.use((req, res, next) => {
  res.status(404).json({ error: 'Requested API endpoint does not exist.' });
});

// Centralized error handler to catch unexpected system runtime crashes (prevents leaking callstacks)
app.use((err, req, res, next) => {
  console.error('Unhandled System Error:', err.stack);
  res.status(500).json({ 
    error: 'An internal server error occurred. Please contact the system administrator or check logs.' 
  });
});

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=================================================================`);
  console.log(` COMPLIANT ASSET MANAGEMENT BACKEND RUNNING                      `);
  console.log(` Port:    http://localhost:${PORT}                              `);
  console.log(` Standard security audit logs active (CERT-In 180-day compliance)`);
  console.log(`=================================================================`);
});
