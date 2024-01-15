import { writeFile } from 'fs/promises';

export async function writeJSON (filename, jsonData) {
  await writeFile(filename, JSON.stringify(jsonData, null, 2));
}
