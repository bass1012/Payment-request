const app = require('./index');
const { logger } = require('./utils/logger');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info('server.started', { port: Number(PORT) });
});

