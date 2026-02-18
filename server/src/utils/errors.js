/**
 * Centralized error handler for API routes
 * Handles SQL/Sequelize connection and query errors
 */
const handleError = (res, error, context = 'Operation') => {
    console.error(`❌ ${context} error:`, error);

    // SQL Connection issues
    if (
        error.name === 'SequelizeConnectionError' ||
        error.name === 'SequelizeConnectionRefusedError' ||
        error.name === 'SequelizeHostNotFoundError' ||
        error.name === 'SequelizeHostNotReachableError' ||
        error.name === 'SequelizeInvalidConnectionError' ||
        error.name === 'SequelizeConnectionTimedOutError'
    ) {
        return res.status(503).json({
            error: 'Database connection failed. Please check your DATABASE_URL or Supabase credentials.',
            debug_message: error.message
        });
    }

    // SQL Constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors?.[0]?.path || 'field';
        return res.status(409).json({
            error: `A record with this ${field} already exists.`,
            field: field
        });
    }

    // Default to Internal Server Error
    res.status(500).json({
        error: `Internal server error during ${context.toLowerCase()}.`,
        debug_message: error.message,
        // We include stack only in non-prod, but debug_message is safe and helpful
        debug_stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
};

module.exports = { handleError };
