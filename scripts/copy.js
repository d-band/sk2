const path = require('path');
const fs = require('fs-extra');

const sk2_type = `import sequelize = require('sequelize');

declare function sk2<TRecord = any, TResult = unknown[]>(
  sequelize: sequelize.Sequelize,
  config: Knex.Config
): Knex<TRecord, TResult>;

declare namespace sk2 {
  export { Knex };
}

export = sk2;`;

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

  const tsFile = path.join(__dirname, '../types/index.d.ts');
  const source = fs.readFileSync(tsFile, 'utf-8');
  fs.writeFileSync(tsFile, source.replace('export = Knex;', sk2_type));
}

main().then(() => {
  console.log('Copy source files done.');
}).catch(e => {
  console.error(e);
});
