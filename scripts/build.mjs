import { cp, mkdir, readdir } from 'node:fs/promises';
import './bundle-machine.mjs';

await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'elvin.jpg', 'ElvinHarrizonBinMBenlyRyxler-Resume.pdf', 'google404b4d4b95e492ee.html', 'assets', 'vendor', 'certs']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
await cp('project/opt', 'dist/project/opt', { recursive: true });
console.log(`Static build ready in dist (${(await readdir('dist')).length} top-level entries).`);
