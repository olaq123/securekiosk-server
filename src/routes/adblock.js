const express = require('express');
const router = express.Router();
const AdBlockRule = require('../models/AdBlockRule');
const cors = require('cors');

// Enable CORS
router.use(cors());

// Default set of ad blocking rules
const DEFAULT_RULES = [
    {
        id: 'default-1',
        trigger: '.*ads\\..*',
        action: 'block',
        category: 'ads',
        lastUpdated: new Date()
    },
    {
        id: 'default-2',
        trigger: '.*tracking\\..*',
        action: 'block', 
        category: 'tracking',
        lastUpdated: new Date()
    },
    {
        id: 'default-3',
        trigger: '.*analytics\\..*',
        action: 'block',
        category: 'tracking',
        lastUpdated: new Date()
    }
];

// Get ad blocking rules with improved error handling
router.get('/rules', async (req, res) => {
    try {
        // First, try to fetch custom rules from database
        let rules = await AdBlockRule.find({
            isActive: true
        }).lean(); // Use .lean() for better performance

        // If no custom rules, use default rules
        if (rules.length === 0) {
            rules = DEFAULT_RULES;
        }

        // Add unique identifier to each rule if not present
        rules = rules.map(rule => ({
            ...rule,
            id: rule._id || rule.id || require('crypto').randomBytes(16).toString('hex')
        }));

        res.json(rules);
    } catch (error) {
        console.error('Error fetching ad block rules:', error);
        res.status(500).json({ 
            message: 'Error fetching ad block rules', 
            error: error.message 
        });
    }
});

// Create a new ad blocking rule (admin endpoint)
router.post('/rules', async (req, res) => {
    try {
        const { trigger, action, category, description } = req.body;
        
        // Validate input
        if (!trigger) {
            return res.status(400).json({ 
                message: 'Trigger is required' 
            });
        }

        const newRule = new AdBlockRule({
            trigger,
            action: action || 'block',
            category: category || 'custom',
            description: description || '',
            isActive: true,
            lastUpdated: new Date()
        });

        await newRule.save();
        
        // Convert Mongoose document to plain object and ensure id
        const savedRule = newRule.toObject();
        savedRule.id = savedRule._id.toString();

        res.status(201).json(savedRule);
    } catch (error) {
        console.error('Error creating ad block rule:', error);
        res.status(500).json({ 
            message: 'Error creating ad block rule', 
            error: error.message 
        });
    }
});

// Update an existing rule
router.put('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedRule = await AdBlockRule.findByIdAndUpdate(
            id, 
            {
                ...updateData,
                lastUpdated: new Date()
            },
            { new: true }
        );

        if (!updatedRule) {
            return res.status(404).json({ 
                message: 'Rule not found' 
            });
        }

        // Convert to plain object and ensure id
        const result = updatedRule.toObject();
        result.id = result._id.toString();

        res.json(result);
    } catch (error) {
        console.error('Error updating ad block rule:', error);
        res.status(500).json({ 
            message: 'Error updating ad block rule', 
            error: error.message 
        });
    }
});

module.exports = router;
