const express = require('express');
const router = express.Router();
const AdBlockRule = require('../models/AdBlockRule');
const cors = require('cors');

// Enable CORS
router.use(cors());

// Logging middleware for ad block routes
router.use((req, res, next) => {
    console.log(`[AdBlock] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Default set of ad blocking rules
const DEFAULT_RULES = [
    {
        trigger: '.*ads\\..*',
        action: 'block',
        category: 'ads',
        description: 'Block common ad domains'
    },
    {
        trigger: '.*tracking\\..*',
        action: 'block', 
        category: 'tracking',
        description: 'Block tracking domains'
    },
    {
        trigger: '.*analytics\\..*',
        action: 'block',
        category: 'tracking',
        description: 'Block analytics domains'
    }
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
