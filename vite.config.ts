import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], base: process.env.GITHUB_ACTIONS ? '/EredivisieEleven/' : '/', server:{proxy:{'/api':'http://127.0.0.1:8787'}}, test:{environment:'node',exclude:['tests/e2e/**','node_modules/**','dist/**','data/raw/**']} });
