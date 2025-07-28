import { SecretService } from '../modules/aws/aws-secrets.service';

// Import the necessary modules
const Transport = require('winston-transport');
const mysql = require('mysql2/promise'); // Use mysql2 for promise-based queries

let pool = null; // Define the pool globally

// Define the MySQLTransport class separately
class MySQLTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.name = 'mysql';
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const { level, message, ...meta } = info;

        const parsedMessage = JSON.parse(message);
        const action = parsedMessage?.action ?? '';
        const ip = parsedMessage?.ip ?? '';
        const api = parsedMessage?.api ?? '';
        const user = parsedMessage?.user ?? '';
        const method = parsedMessage?.method ?? '';
        const apptId = parsedMessage?.apptId ? parseInt(parsedMessage?.apptId) : null;

        const query = `INSERT INTO logs (level, message, action, ip, api, user, method, meta, timestamp, apptId)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            level,
            message,
            action,
            ip,
            api,
            user,
            method,
            JSON.stringify(meta),
            meta?.timestamp || new Date(),
            apptId
        ];

        pool.execute(query, values)
            .then(() => callback())
            .catch((err) => {
                console.error('Error writing log to MySQL:', err);
                callback(err);
            });
    }
}

// Create an async function to initialize the pool connection
async function initializePool() {
    if (!pool) {
        // Ensure the pool is initialized only once
        const secrets = await new SecretService().getSecret();

        pool = await mysql.createPool({
            host: secrets['DB_HOST'],
            user: secrets['DB_USERNAME'],
            password: secrets['DB_PASSWORD'],
            database: secrets['DB_DATABASE'],
            port: parseInt(secrets['DB_PORT']),
            waitForConnections: true,
            connectionLimit: 10, // Adjust the pool size as needed
            queueLimit: 0
        });
    }
}

// Export the MySQLTransport and initialization function
module.exports = { MySQLTransport, initializePool };
