import dotenv from 'dotenv';

dotenv.config();

function validateEnv() {
    const required = ['JUDGE0_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}\nPlease create a .env file based on .env.example`);
    }
}

validateEnv();

export const config = {
    port: process.env.PORT || 9000,
    nodeEnv: process.env.NODE_ENV || 'development',

    judge0: {
        apiKey: process.env.JUDGE0_API_KEY,
        apiUrl: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com/submissions',
        timeoutMs: parseInt(process.env.JUDGE0_TIMEOUT_MS) || 15000,
        pollIntervalMs: parseInt(process.env.JUDGE0_POLL_INTERVAL_MS) || 1000,
        maxPollAttempts: parseInt(process.env.JUDGE0_MAX_POLL_ATTEMPTS) || 30,
        maxSockets: parseInt(process.env.JUDGE0_MAX_SOCKETS) || 256,
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000,
    },

    execution: {
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS) || 40,
        maxQueueSize: parseInt(process.env.MAX_PENDING_EXECUTIONS) || 400,
    }
};
