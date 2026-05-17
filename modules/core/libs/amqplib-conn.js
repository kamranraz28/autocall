const amqp = require('amqplib');

// Singleton connection instance
let connectionPromise = null;

/**
 * Returns the singleton AMQP connection.
 * Ensures only one connection is created and reused.
 * @returns {Promise<amqp.Connection>} The singleton connection instance.
 */
function getConnection() {
    if (!process.env.AMQP_URI) {
        throw new Error('No AMQP Connection URI defined');
    }

    if (!connectionPromise) {
        // Initialize the connection only once
        connectionPromise = amqp.connect(process.env.AMQP_URI)
            .then((conn) => {
                console.log('AMQP Connection established');

                // Set up event listeners to reset the connection on issues
                conn.on('error', (err) => {
                    console.error('AMQP connection error:', err);
                    connectionPromise = null; // Reset connection on error
                });

                conn.on('close', () => {
                    console.warn('AMQP connection closed');
                    connectionPromise = null; // Reset connection on close
                });

                return conn;
            })
            .catch((err) => {
                console.error('Failed to establish AMQP connection:', err);
                connectionPromise = null; // Ensure retry on future calls
                throw err;
            });
    }

    return connectionPromise;
}

module.exports = {
    getConnection
};
