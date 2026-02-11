require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database
const { mongoose, connectPromise } = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Run automated initialization for MongoDB
const { seedStaff } = require('./utils/userSeed');

const seedData = async () => {
    try {
        // 1. Seed Admin
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            console.log('🚀 No admin found. Seeding default admin user...');
            const hash = bcrypt.hashSync('falmebet123', 10);
            await User.create({
                username: 'admin',
                password_hash: hash,
                name: 'System Admin',
                role: 'admin',
                branch: 'betfalme'
            });
            console.log('✅ Default admin user provisioned (admin / falmebet123).');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

        // 2. Seed Staff
        await seedStaff();

    } catch (err) {
        console.error('❌ Data seeding failed:', err.message);
        console.error(err.stack);
    }
};

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const scheduleRoutes = require('./routes/schedules');
const accountLogRoutes = require('./routes/accountLogs');
const payrollRoutes = require('./routes/payroll');
const chatRoutes = require('./routes/chat');

const app = express();
const server = require('http').createServer(app);

// Configure CORS origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

const io = require('socket.io')(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// Socket.io logic
const userStatuses = new Map();

io.on('connection', (socket) => {
    console.log('📱 User connected:', socket.id);

    socket.on('set_status', (data) => {
        userStatuses.set(data.userId, { socketId: socket.id, status: 'online' });
        io.emit('status_update', Array.from(userStatuses.entries()));
    });

    socket.on('join_channel', (channelId) => {
        socket.join(`channel_${channelId}`);
    });

    socket.on('typing', (data) => {
        socket.to(`channel_${data.channelId}`).emit('user_typing', data);
    });

    socket.on('send_message', (data) => {
        const fullMessage = { ...data, created_at: new Date().toISOString() };
        io.to(`channel_${data.channelId}`).emit('new_message', fullMessage);
    });

    socket.on('toggle_reaction', (data) => {
        io.to(`channel_${data.channelId}`).emit('reaction_update', data);
    });

    socket.on('disconnect', () => {
        for (const [userId, info] of userStatuses.entries()) {
            if (info.socketId === socket.id) {
                userStatuses.delete(userId);
                break;
            }
        }
        io.emit('status_update', Array.from(userStatuses.entries()));
        console.log('🔌 User disconnected:', socket.id);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/account-logs', accountLogRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Falmebet API Server is running. Access endpoints at /api/...' });
});

// Base API index – helps avoid confusing 404 when visiting /api directly
app.get('/api', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Falmebet API root. Key endpoints: /api/health, /api/auth/login, /api/users, /api/attendance, /api/schedules, /api/account-logs, /api/payroll, /api/chat',
    });
});

app.get('/api/health', (req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbStatus = states[mongoose.connection.readyState] || 'unknown';

    res.json({
        status: dbStatus === 'connected' ? 'ok' : 'error',
        database: dbStatus,
        message: dbStatus === 'connected' ? 'Falmebet API is running' : 'Database connection issues'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const startServer = () => {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api`);
    });
};

if (require.main === module) {
    (async () => {
        try {
            await connectPromise;
            console.log('🔗 Database ready, running seed...');
            await seedData();
            startServer();
        } catch (err) {
            console.error('❌ Server startup failed:', err.message);
            process.exit(1);
        }
    })();
}

module.exports = { app, server, seedData };
