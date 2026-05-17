module.exports = (error, req, res, next) => {
    console.error(error);
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong.",
            details: {}
        },
        meta: {
            timestamp: new Date().toISOString()
        }
    });
}
