require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database
require('./config/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const scheduleRoutes = require('./routes/schedules');
const accountLogRoutes = require('./routes/accountLogs');
const payrollRoutes = require('./routes/payroll');
const chatRoutes = require('./routes/chat');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Falmebet API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
