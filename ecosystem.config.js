module.exports = {
  apps: [
    {
      name: 'assistant-card',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 4173',
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
