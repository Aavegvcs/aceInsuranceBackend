import * as path from 'path';
import * as fs from 'fs';

export function getAssetPath(relativePath: string): string {
  const distPath = path.resolve(__dirname, 'assets', relativePath);
  const srcPath = path.resolve(__dirname, '../../assets', relativePath);
console.log("dist path", distPath);
console.log("src path", srcPath);

  if (fs.existsSync(distPath)) return distPath;
  if (fs.existsSync(srcPath)) return srcPath;

  throw new Error(`Asset not found: ${relativePath}`);
}
