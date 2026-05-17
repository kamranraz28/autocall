module.exports = (req, res, next) => {
    if (req.headers["x-service-token"] !== process.env.SERVICE_TOKEN) return res.status(401).json({ message: "Unauthorized access." });
    return next();
}
