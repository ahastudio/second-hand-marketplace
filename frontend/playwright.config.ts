import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:25800', trace: 'retain-on-failure' },
  webServer: [
    {
      // E2E 전용 DB(postgres-e2e, 25802)에 연결된 백엔드
      command: 'cd ../backend && ./gradlew bootRun',
      port: 25801,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        SPRING_DATASOURCE_URL: 'jdbc:postgresql://localhost:25802/marketplace_e2e',
        SPRING_DATASOURCE_USERNAME: 'marketplace',
        SPRING_DATASOURCE_PASSWORD: 'marketplace',
      },
    },
    {
      command: 'npm run dev -- --port 25800 --strictPort',
      port: 25800,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
