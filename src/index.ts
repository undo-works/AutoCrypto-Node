import cron from 'node-cron';
import { AutoTradeUseCase } from './coincheck/AutoTradeUseCase';
import "dotenv/config"

const manager = new AutoTradeUseCase();
manager.initializeStrategies().then(() => {

  // 20秒ごとに実行する例
  cron.schedule('*/5 * * * *', async () => {
    await manager.executeStrategies();
  }, {
    timezone: 'Asia/Tokyo'
  });

  console.log('Cronジョブが開始されました...');
});

