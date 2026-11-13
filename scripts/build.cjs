// Buildless Cloudflare hosting serves these checked-in bundles without a runtime build.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const styles = ['fonts.css','styles.css','schedule.css','guide.css','typography.css','vision-before.css','cataract-before.css','cataract-medication.css','eye-drops-guide.css'];
const scripts = ['scripts/pwa-install.js','scripts/supabase-config.js','scripts/public-content.js','scripts/holidays.js','scripts/schedule-source.js','scripts/schedule-model.js','scripts/guide-reference.js','scripts/guide.js','scripts/vision-before.js','scripts/cataract-before.js','scripts/cataract-medication.js','scripts/eye-drops-guide.js','app.js'];
const read = file => fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const css = styles.map(file => `/* ${file} */\n` + read(file).replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (match, quote, url) => {
  if (/^(?:data:|https?:|\/|#)/.test(url)) return match;
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(file),url));
  return `url("${path.posix.relative('assets',target)}")`;
})).join('\n');
const js = scripts.map(file => `/* ${file} */\n${read(file)}\n;`).join('\n');
for (const [file, output] of [['assets/app.css',css],['assets/app.js',js]]) {
  const target = path.join(root,file);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || read(file) !== output) throw Error(`${file} is stale. Run npm run build.`);
  } else fs.writeFileSync(target,output);
}
console.log(`App bundles: ${Buffer.byteLength(css)} CSS bytes, ${Buffer.byteLength(js)} JS bytes`);
