module.exports = {
  apps: [
    {
      name: 'assistant-card',
      script: './node_modules/.bin/serve',
      args: 'dist -l 4173 -s',
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
