/* eslint-disable prettier/prettier */
import { SecretService } from 'src/modules/aws/aws-secrets.service';
import * as winston from 'winston';
const { MySQLTransport, initializePool } = require('./winston-sqlTransport');

// Declare a placeholder for the logger
let logger: winston.Logger;
let transports = null;

export const formatLogData = (message: string) => {
    const parts = message.split(' ');
    const logMessage = {
        ip: parts[0],
        user: parts[1],
        method: parts[2],
        api: parts[3],
        status: parts[4],
        responseContent: parts[5],
        responseTime: parts[6]
    };

    return { message: JSON.stringify(logMessage) };
};

async function initializeTransport() {
    const secrets = await new SecretService().getSecret();

    // Define log levels
    const levels = {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4
    };

    const level = () => {
        const env = secrets['NODE_ENV'] || 'development';
        const isDevelopment = env === 'development';
        return isDevelopment ? 'debug' : 'warn';
    };

    const colors = {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'white'
    };

    winston.addColors(colors);

    const format = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSSZ' }),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    );

    // Initialize the pool first, then create the logger
    initializePool()
        .then(() => {
            transports = [new winston.transports.Console(), new MySQLTransport()];
            // You can now use the logger
        })
        .catch((err) => {
            console.error('Error initializing logger:', err);
        });

    // const transports = [
    //   new winston.transports.Console(),
    //   // new MySQLTransport(),
    // ];

    // Initialize the logger instance
    logger = winston.createLogger({
        level: level(),
        levels,
        format,
        transports
    });
}

// Function to ensure the logger is initialized before it's used
export const getLogger = async (): Promise<winston.Logger> => {
    if (!logger) {
        await initializeTransport();
    }
    return logger;
};
