const mongoose = require('mongoose');

const accountLogSchema = new mongoose.Schema({
    phone_number: { type: String, required: true },
    branch: { type: String, required: true, enum: ['betfalme', 'sofa_safi'] },
    status: { type: String, default: 'open', enum: ['open', 'pending', 'closed'] },
    request_count: { type: Number, default: 1 },
    last_request_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

accountLogSchema.index({ phone_number: 1, branch: 1 }, { unique: true });

accountLogSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

const AccountLog = mongoose.model('AccountLog', accountLogSchema);

module.exports = AccountLog;
