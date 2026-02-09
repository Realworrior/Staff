const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clock_in: { type: Date, required: true },
    clock_out: { type: Date },
    location: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    status: { type: String, default: 'present' },
    notes: { type: String },
    created_at: { type: Date, default: Date.now }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
