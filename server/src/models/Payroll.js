const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total_transport: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paid_at: { type: Date },
    created_at: { type: Date, default: Date.now }
});

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;
