module.exports = {
  apps: [
    {
      name: 'assistant-card',
      script: './node_modules/.bin/vite',
      args: 'preview --host 0.0.0.0 --port 4173',
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
