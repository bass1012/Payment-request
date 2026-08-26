require('dotenv').config();
const prisma = require('../src/config/database');
const { runSlaNotifications } = require('../src/services/sla-notification.service');
const { logger } = require('../src/utils/logger');

async function main() {
  const result = await runSlaNotifications();
  logger.info('sla_notification.run_completed', result);
}

main()
  .catch((error) => {
    logger.error('sla_notification.run_failed', { error });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
