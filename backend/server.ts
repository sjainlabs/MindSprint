import { app } from './src/app';
import { getDatabase } from './src/db/database';

const port = Number(process.env.PORT ?? 3001);

const startServer = async (): Promise<void> => {
  await getDatabase();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`MindSprint backend listening on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend server', error);
  process.exit(1);
});
