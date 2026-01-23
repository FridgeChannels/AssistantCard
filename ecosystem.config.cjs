module.exports = {
  apps: [
    {
      name: 'assistant-card',
      script: 'npm',
      args: 'run preview',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
