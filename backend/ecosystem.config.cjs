// PM2: chạy một tiến trình duy nhất (hàng đợi crawl/AI và cron nằm trong tiến trình này nên không chạy cluster)
module.exports = {
  apps: [
    {
      name: "fepass-api",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=320",
      max_memory_restart: "400M", // máy 2 GB: tự khởi động lại nếu rò rỉ bộ nhớ
      kill_timeout: 8000, // chờ index.ts đóng kết nối DB êm trước khi buộc tắt
      env: { NODE_ENV: "production" },
      time: true,
    },
  ],
};
