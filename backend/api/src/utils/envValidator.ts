export const validateEnv = () => {
    const required = [
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_SECRET',
        'ENGINE_URL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ CRITICAL: Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        process.exit(1);
    }

    console.log('✅ Environment variables validated');
};
