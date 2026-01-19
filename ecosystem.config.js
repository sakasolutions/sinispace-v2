module.exports = {
  apps: [
    {
      name: 'sinispace',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/sinispace-v2',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'db-admin',
      script: 'node',
      args: 'admin-db.js',
      cwd: '/var/www/sinispace-v2',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 3001
      },
      error_file: './logs/db-admin-error.log',
      out_file: './logs/db-admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
