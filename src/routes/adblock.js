const express = require('express');
const router = express.Router();
const AdBlockRule = require('../models/AdBlockRule');
const cors = require('cors');
const geoip = require('geoip-lite');

// Enable CORS
router.use(cors());

// Logging middleware for ad block routes with device and geolocation info
router.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const geo = geoip.lookup(clientIP);
    
    console.log(`[AdBlock] Connection Details:
    - Timestamp: ${new Date().toISOString()}
    - Method: ${req.method}
    - Path: ${req.path}
    - Client IP: ${clientIP}
    - Geolocation: ${geo ? `${geo.city}, ${geo.country}` : 'Unknown'}
    - User Agent: ${req.get('User-Agent') || 'Not provided'}
    `);
    next();
});

// Comprehensive Default Ad Blocking Rules
const DEFAULT_RULES = [
    // Comprehensive Ad Networks
    { trigger: '.*adtago\\.s3\\.amazonaws\\.com.*', action: 'block', category: 'ads', description: 'Block Amazon Ad Tracking' },
    { trigger: '.*pagead2\\.googlesyndication\\.com.*', action: 'block', category: 'ads', description: 'Block Google Ad Syndication' },
    { trigger: '.*adservice\\.google\\.com.*', action: 'block', category: 'ads', description: 'Block Google Ad Service' },
    { trigger: '.*ad\\.doubleclick\\.net.*', action: 'block', category: 'ads', description: 'Block DoubleClick Ads' },
    
    // Tracking and Analytics
    { trigger: '.*google-analytics\\.com.*', action: 'block', category: 'tracking', description: 'Block Google Analytics' },
    { trigger: '.*pixel\\.facebook\\.com.*', action: 'block', category: 'tracking', description: 'Block Facebook Pixel' },
    { trigger: '.*hotjar\\.com.*', action: 'block', category: 'tracking', description: 'Block Hotjar Tracking' },
    
    // Social Media Trackers
    { trigger: '.*ads\\.twitter\\.com.*', action: 'block', category: 'tracking', description: 'Block Twitter Ads' },
    { trigger: '.*ads\\.linkedin\\.com.*', action: 'block', category: 'tracking', description: 'Block LinkedIn Ads' },
    { trigger: '.*ads\\.pinterest\\.com.*', action: 'block', category: 'tracking', description: 'Block Pinterest Ads' },
    
    // OEM and Device Trackers
    { trigger: '.*data\\.mistat\\.xiaomi\\.com.*', action: 'block', category: 'tracking', description: 'Block Xiaomi Tracking' },
    { trigger: '.*metrics\\.icloud\\.com.*', action: 'block', category: 'tracking', description: 'Block Apple Metrics' },
    
    // Error Tracking and Monitoring
    { trigger: '.*sentry\\.io.*', action: 'block', category: 'tracking', description: 'Block Sentry Error Tracking' },
    { trigger: '.*bugsnag\\.com.*', action: 'block', category: 'tracking', description: 'Block Bugsnag Error Tracking' },
    
    // Comprehensive Domain Patterns
    { trigger: '.*\\.ads\\..*', action: 'block', category: 'ads', description: 'Block generic ad domains' },
    { trigger: '.*\\.tracking\\..*', action: 'block', category: 'tracking', description: 'Block generic tracking domains' },
    { trigger: '.*\\.analytics\\..*', action: 'block', category: 'tracking', description: 'Block generic analytics domains' },
    
    // Adult and Inappropriate Content
    { trigger: '.*adult.*', action: 'block', category: 'adult', description: 'Block adult content domains' }
];

// Get ad blocking rules with improved error handling and logging
router.get('/rules', async (req, res) => {
    try {
        console.log('[AdBlock] Fetching ad blocking rules');
        
        // First, try to fetch custom rules from database
        let rules = await AdBlockRule.find({
            isActive: true
        }).lean(); 

        // If no custom rules, use default rules
        if (rules.length === 0) {
            console.log('[AdBlock] No custom rules found. Using default rules.');
            rules = DEFAULT_RULES.map(rule => ({
                ...rule,
                isActive: true,
                lastUpdated: new Date()
            }));

            // Optionally save default rules to database
            try {
                await AdBlockRule.insertMany(rules);
                console.log('[AdBlock] Saved default rules to database');
            } catch (saveError) {
                console.error('[AdBlock] Error saving default rules:', saveError);
            }
        } else {
            console.log(`[AdBlock] Found ${rules.length} custom rules`);
        }

        // Add unique identifier to each rule
        rules = rules.map(rule => ({
            ...rule,
            id: rule._id?.toString() || rule.id || require('crypto').randomBytes(16).toString('hex')
        }));

        console.log(`[AdBlock] Sending ${rules.length} ad blocking rules`);
        res.json(rules);
    } catch (error) {
        console.error('[AdBlock] Error fetching rules:', error);
        res.status(500).json({ 
            message: 'Error fetching ad block rules', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Create a new ad blocking rule with comprehensive validation
router.post('/rules', async (req, res) => {
    try {
        const { trigger, action, category, description } = req.body;
        
        console.log('[AdBlock] Received rule creation request:', req.body);

        // Validate input
        if (!trigger) {
            console.warn('[AdBlock] Rule creation failed: Missing trigger');
            return res.status(400).json({ 
                message: 'Trigger is required',
                details: 'A valid regex pattern must be provided for the rule trigger'
            });
        }

        // Validate regex
        try {
            new RegExp(trigger);
        } catch (regexError) {
            console.warn('[AdBlock] Invalid regex pattern:', regexError);
            return res.status(400).json({
                message: 'Invalid regex pattern',
                details: regexError.message
            });
        }

        const newRule = new AdBlockRule({
            trigger,
            action: action || 'block',
            category: category || 'custom',
            description: description || 'User-defined ad blocking rule',
            isActive: true,
            lastUpdated: new Date()
        });

        await newRule.save();
        
        console.log('[AdBlock] New rule created successfully:', newRule._id);
        
        // Convert Mongoose document to plain object and ensure id
        const savedRule = newRule.toObject();
        savedRule.id = savedRule._id.toString();

        res.status(201).json(savedRule);
    } catch (error) {
        console.error('[AdBlock] Error creating rule:', error);
        res.status(500).json({ 
            message: 'Error creating ad block rule', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update an existing rule
router.put('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log(`[AdBlock] Updating rule ${id}:`, updateData);

        const updatedRule = await AdBlockRule.findByIdAndUpdate(
            id, 
            {
                ...updateData,
                lastUpdated: new Date()
            },
            { new: true }
        );

        if (!updatedRule) {
            console.warn(`[AdBlock] Rule not found: ${id}`);
            return res.status(404).json({ 
                message: 'Rule not found' 
            });
        }

        console.log(`[AdBlock] Rule updated successfully: ${id}`);
        
        // Convert to plain object and ensure id
        const result = updatedRule.toObject();
        result.id = result._id.toString();

        res.json(result);
    } catch (error) {
        console.error(`[AdBlock] Error updating rule ${id}:`, error);
        res.status(500).json({ 
            message: 'Error updating ad block rule', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
