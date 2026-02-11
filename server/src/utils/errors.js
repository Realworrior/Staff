/**
 * Centralized error handler for API routes
 * Handles Mongoose connection/buffering errors specifically
 */
const handleError = (res, error, context = 'Operation') => {
    console.error(`❌ ${context} error:`, error);

    // Mongoose connection or buffering issues (usually due to missing/invalid MONGODB_URI)
    if (
        error.name === 'MongooseError' ||
        error.message.includes('buffering') ||
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoServerSelectionError'
    ) {
        return res.status(503).json({
            error: 'Database is currently unavailable. Please ensure MONGODB_URI is configured correctly in the .env file.'
        });
    }

    // MongoDB Duplicate Key Error (Unique Constraint)
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return res.status(409).json({
            error: `A record with this ${field} already exists.`,
            field: field
        });
    }

    // Default to Internal Server Error
    console.error(`❌ ${context} Error Details:`, error);
    res.status(500).json({
        error: `Internal server error during ${context.toLowerCase()}.`,
        debug_message: error.message,
        debug_stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
};

module.exports = { handleError };
