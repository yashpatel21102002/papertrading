module.exports = {
  apps: [
    {
      name: 'papertrading-api',
      script: './dist/index.js',
      instances: 'max',        // one worker per CPU core
      exec_mode: 'cluster',    // Node.js cluster module — shared port, load-balanced
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // Restart policy
      restart_delay: 1000,
      max_restarts: 10,
      // Graceful shutdown — lets in-flight requests finish
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
