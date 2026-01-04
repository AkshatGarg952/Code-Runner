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
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
};
