const path = require('path');
const fs = require('fs-extra');

async function main() {
  const dir = path.dirname(require.resolve('knex/package.json'));
  const libDir = path.join(__dirname, '../lib');
  const typesDir = path.join(__dirname, '../types');
  // clean
  await fs.remove(libDir);
  await fs.remove(typesDir);
  // copy
  await fs.copy(path.join(dir, 'lib'), path.join(__dirname, '../lib'));
  await fs.copy(path.join(dir, 'types'), path.join(__dirname, '../types'));
}

main().then(() => {
  console.log('Copy source files done.');
}).catch(e => {
  console.error(e);
});
