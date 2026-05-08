import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
};

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),

    db: {
        url: required('DATABASE_URL'),
    },

    jwt: {
        secret: required('JWT_SECRET'),
        refreshSecret: required('JWT_REFRESH_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    cors: {
        clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    },

    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
} as const;