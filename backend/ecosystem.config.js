module.exports = {
  apps: [
    {
      name: "rag-backend",
      script: "dist/server.js",
      cwd: "/var/www/rag-app/backend",
      env_file: ".env",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};

