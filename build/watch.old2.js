import { promisify } from 'util';
import * as childProcess from 'child_process';
const exec = promisify(childProcess.exec);

async function start () {
  console.log('Starting...');
  await exec('npm start', async () => {
    await start();
  });
}

await start();
