const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Import routes
const adBlockRoutes = require('./routes/adblock');

const app = express();
const PORT = process.env.PORT || 8080;

// MongoDB Connection String
const MONGODB_URI = "mongodb+srv://Securekiosk:KTacUzOcbKx8J4y5@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// MongoDB Client Configuration
const mongoClient = new MongoClient(MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Mongoose Connection
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Mongoose connected successfully'))
.catch(err => console.error('Mongoose connection error:', err));

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:8080', 
        'https://securekiosk-server.onrender.com',
        'https://securekiosk.app'  // Add your production domain
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Connect MongoDB Client
async function connectMongoClient() {
    try {
        await mongoClient.connect();
        console.log("MongoDB Client connected successfully");
        
        // Optional: Ping the deployment
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("Pinged MongoDB deployment");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}

// Routes
app.use('/api/adblock', adBlockRoutes);

// Basic health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'Server is running', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Internal server error', 
        error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message 
    });
});

// Start server
const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect MongoDB Client
    await connectMongoClient();
});

module.exports = { app, server, mongoClient };
