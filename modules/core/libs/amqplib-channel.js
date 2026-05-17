const { getConnection } = require('./amqplib-conn');

exports.getChannel = async function () {
    try {
        const connection = await getConnection();
        channel = await connection.createChannel();
        return channel;
    } catch (error) {
        console.error('Failed to create AMQP channel', error);
        return;
    }
}
