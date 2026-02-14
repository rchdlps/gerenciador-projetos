
import { config } from 'dotenv';
config();


async function measureLatency() {
    // Dynamic import to ensure dotenv loads first
    const { client } = await import('../src/lib/db');

    console.log('🔌 Connecting to DB...');

    const iterations = 10;
    const times: number[] = [];

    try {
        // Warmup
        await client`SELECT 1`;

        console.log(`⏱️  Measuring latency (${iterations} iterations)...`);

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await client`SELECT 1`;
            const end = performance.now();
            times.push(end - start);
            process.stdout.write('.');
        }

        console.log('\n');

        const min = Math.min(...times);
        const max = Math.max(...times);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

        console.log('📊 DB Latency Report:');
        console.log(`   Min: ${min.toFixed(2)}ms`);
        console.log(`   Max: ${max.toFixed(2)}ms`);
        console.log(`   Avg: ${avg.toFixed(2)}ms`);
        console.log(`   P95: ${p95.toFixed(2)}ms`);

    } catch (error) {
        console.error('❌ Failed to measure latency:', error);
    } finally {
        await client.end();
    }
}

measureLatency();
