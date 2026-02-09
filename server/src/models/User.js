const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'supervisor', 'staff'], default: 'staff' },
    branch: { type: String, default: 'betfalme' },
    avatar: { type: String },
    transport_allowance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Update timestamp on save
userSchema.pre('save', async function () {
    this.updated_at = Date.now();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
