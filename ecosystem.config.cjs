module.exports = {
  apps: [
    {
      name: 'assistant-card',
      script: 'npm',
      args: 'run start',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
