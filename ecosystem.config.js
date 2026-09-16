// PM2 process definition for production.
// This app uses a custom Node server (server.js) instead of `next start`,
// so PM2 needs to run that file directly rather than an npm script.
//
// First-time setup on the droplet (run once, manually):
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup            # then run the command it prints, so PM2 survives reboots
//
// After that, the GitHub Actions workflow just runs `pm2 reload blog-app`
// on every deploy.
module.exports = {
  apps: [
    {
      name: "blog-app",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        // PORT is read by server.js; change here if 3000 is already in use
        // on the droplet, and update your Nginx/reverse-proxy config to match.
        PORT: 3000,
      },
      // Restart on crash, but don't spin endlessly if it's stuck in a boot-loop
      max_restarts: 10,
      min_uptime: "15s",
    },
  ],
};
