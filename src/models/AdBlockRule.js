const mongoose = require('mongoose');

const AdBlockRuleSchema = new mongoose.Schema({
    trigger: {
        type: String,
        required: true,
        trim: true
    },
    action: {
        type: String,
        enum: ['block', 'hide', 'redirect'],
        default: 'block'
    },
    category: {
        type: String,
        enum: ['ads', 'tracking', 'malware', 'adult', 'custom'],
        default: 'custom'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AdBlockRule', AdBlockRuleSchema);
