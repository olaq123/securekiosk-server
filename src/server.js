const express = require('express');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// CORS Configuration
const corsOptions = {
    origin: [
        'http://localhost:8080', 
        'https://securekiosk-server.onrender.com', 
        'capacitor://localhost', 
        'ionic://localhost'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection Options
const mongoOptions = {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 15000,
    socketTimeoutMS: 60000,
    retryWrites: true,
    maxPoolSize: 10
};

// Enhanced Logging Function
function logMongoDBError(context, error) {
    console.error(`[MongoDB] ${context} Error:`, {
        name: error.name,
        message: error.message,
        code: error.code,
        syscall: error.syscall,
        hostname: error.hostname,
        stack: error.stack
    });
}

// Mongoose Connection Function
async function connectMongoose() {
    try {
        console.log('[MongoDB] Attempting Mongoose connection...');
        console.log('[MongoDB] Connection URI:', process.env.MONGODB_URI);

        // Attempt Mongoose Connection
        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            connectTimeoutMS: 15000,
            socketTimeoutMS: 60000,
            retryWrites: true,
            maxPoolSize: 10
        });
        
        console.log('[MongoDB] Mongoose connected successfully');
        
        // Test a simple database operation
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available Collections:', collections.map(c => c.name));
    } catch (error) {
        logMongoDBError('Mongoose Connection', error);
        process.exit(1);
    }
}

// MongoDB Client Connection Function
async function connectMongoClient() {
    try {
        console.log('[MongoDB] Attempting MongoDB Client connection...');
        
        // Validate MongoDB URI
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        
        const client = new MongoClient(process.env.MONGODB_URI, mongoOptions);
        
        // Connect the client to the server
        await client.connect();
        
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log('[MongoDB] Pinged deployment. Successfully connected to MongoDB!');
        
        return client;
    } catch (error) {
        logMongoDBError('MongoDB Client Connection', error);
        throw error;
    }
}

// Routes
app.use('/api/adblock', require('./routes/adblock'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Server Error]:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Server Startup
async function startServer() {
    try {
        // Connect to MongoDB
        await connectMongoose();
        const mongoClient = await connectMongoClient();

        // Start Express Server
        const server = app.listen(PORT, () => {
            console.log(`[Server] Running on port ${PORT}`);
            console.log(`[Environment] ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful Shutdown
        process.on('SIGINT', async () => {
            console.log('[Server] Shutting down gracefully...');
            await mongoose.connection.close();
            await mongoClient.close();
            server.close(() => {
                console.log('[Server] Closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('[Server] Startup failed:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = { app };
