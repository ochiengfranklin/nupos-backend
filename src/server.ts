import app from './app';
import { config } from './config/env';
import { db } from './db';
import { sql } from 'drizzle-orm';

const server = app.listen(config.port, () => {
    console.log(`\n🚀 POS API running`);
    console.log(`   Port        : ${config.port}`);
    console.log(`   Environment : ${config.nodeEnv}`);
    console.log(`   Health      : http://localhost:${config.port}/health\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
        console.log('Server closed. Process exiting.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled promise rejection:', reason);
    process.exit(1);
});