const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Verification middleware
const verifySignature = async (req, res, next) => {
    try {
        const signedPayload = req.body.signedPayload;
        if (!signedPayload) {
            return res.status(400).json({ error: 'Missing signed payload' });
        }

        // Verify JWT
        const decoded = jwt.decode(signedPayload, { complete: true });
        if (!decoded) {
            return res.status(400).json({ error: 'Invalid JWT format' });
        }

        // Store the decoded data
        req.notification = decoded.payload;
        next();
    } catch (error) {
        console.error('Verification error:', error);
        res.status(400).json({ error: 'Invalid notification' });
    }
};

// Production endpoint
app.post('/notifications/production', verifySignature, async (req, res) => {
    try {
        const notification = req.notification;
        
        // Log the notification
        console.log('Production notification received:', notification);

        // Handle different notification types
        switch (notification.notificationType) {
            case 'SUBSCRIBED':
                await handleSubscription(notification, 'production');
                break;
            case 'DID_RENEW':
                await handleRenewal(notification, 'production');
                break;
            case 'DID_FAIL_TO_RENEW':
                await handleFailedRenewal(notification, 'production');
                break;
            case 'EXPIRED':
                await handleExpiration(notification, 'production');
                break;
            default:
                console.log('Unhandled notification type:', notification.notificationType);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Error processing production notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sandbox endpoint
app.post('/notifications/sandbox', verifySignature, async (req, res) => {
    try {
        const notification = req.notification;
        
        // Log the notification
        console.log('Sandbox notification received:', notification);

        // Handle different notification types
        switch (notification.notificationType) {
            case 'SUBSCRIBED':
                await handleSubscription(notification, 'sandbox');
                break;
            case 'DID_RENEW':
                await handleRenewal(notification, 'sandbox');
                break;
            case 'DID_FAIL_TO_RENEW':
                await handleFailedRenewal(notification, 'sandbox');
                break;
            case 'EXPIRED':
                await handleExpiration(notification, 'sandbox');
                break;
            default:
                console.log('Unhandled notification type:', notification.notificationType);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Error processing sandbox notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notification handlers
async function handleSubscription(notification, environment) {
    console.log(`[${environment}] New subscription:`, {
        originalTransactionId: notification.data.originalTransactionId,
        productId: notification.data.productId,
        purchaseDate: notification.data.purchaseDate
    });
    
    // TODO: Implement your subscription logic here
    // For example:
    // - Update user's subscription status in your database
    // - Send confirmation email
    // - Update app configuration
}

async function handleRenewal(notification, environment) {
    console.log(`[${environment}] Subscription renewed:`, {
        originalTransactionId: notification.data.originalTransactionId,
        productId: notification.data.productId,
        renewalDate: notification.data.renewalDate
    });
    
    // TODO: Implement your renewal logic here
}

async function handleFailedRenewal(notification, environment) {
    console.log(`[${environment}] Renewal failed:`, {
        originalTransactionId: notification.data.originalTransactionId,
        productId: notification.data.productId,
        expirationIntent: notification.data.expirationIntent
    });
    
    // TODO: Implement your failed renewal logic here
}

async function handleExpiration(notification, environment) {
    console.log(`[${environment}] Subscription expired:`, {
        originalTransactionId: notification.data.originalTransactionId,
        productId: notification.data.productId,
        expirationDate: notification.data.expirationDate
    });
    
    // TODO: Implement your expiration logic here
}

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
