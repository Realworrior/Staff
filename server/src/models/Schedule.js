const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    shift_type: { type: String },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: String, default: 'betfalme' },
    created_at: { type: Date, default: Date.now }
});

scheduleSchema.index({ user_id: 1, date: 1, start_time: 1 }, { unique: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
