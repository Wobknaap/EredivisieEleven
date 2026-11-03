import {defineConfig,devices} from '@playwright/test';
const command=process.platform==='win32'?'npm.cmd run dev -- --host 127.0.0.1 --port 4173':'npm run dev -- --host 127.0.0.1 --port 4173';
export default defineConfig({testDir:'./tests/e2e',use:{baseURL:'http://127.0.0.1:4173',...devices['Desktop Chrome']},webServer:[{command,url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:30000},{command:'npm run api:dev',url:'http://127.0.0.1:8787/api/health',reuseExistingServer:!process.env.CI,timeout:30000}]});
