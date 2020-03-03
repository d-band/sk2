const fs = require('fs');
const path = require('path');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const cwd = path.join(__dirname, '..');

function isStaticRequire(node) {
  return node &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'StringLiteral' &&
    typeof node.arguments[0].value === 'string';
}

function extract(str) {
  const scopePattern = /^(?:(@[^/]+)[/]+)([^/]+)[/]?/;
  const basePattern = /^([^/]+)[/]?/;
  if (/^@/.test(str)) {
    const match = scopePattern.exec(str);
    if (!match || !match[1] || !match[2]) {
      return null;
    }
    return [match[1], match[2]].join('/');
  } else {
    const match = basePattern.exec(str);
    if (!match) {
      return null;
    }
    return match[1] || null;
  }
}

glob('lib/**/*.js', { cwd }, (err, files) => {
  const packages = {};

  files.forEach(file => {
    const code = fs.readFileSync(path.join(cwd, file), 'utf-8');
    const ast = parser.parse(code);

    traverse(ast, {
      CallExpression(path) {
        if (isStaticRequire(path.node)) {
          const name = path.node.arguments[0].value;

          if (/^\./.test(name)) return;
          packages[extract(name)] = 1;
        }
      }
    });
  });

  const deps = require('knex/package.json').dependencies;
  const dependencies = {};

  Object.keys(deps).forEach(k => {
    if (packages[k]) {
      dependencies[k] = deps[k];
    }
  });

  const pkg = require('../package.json');
  pkg.dependencies = dependencies;

  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify(pkg, null, '  '),
    'utf-8'
  );
  console.log('Resolve dependencies done.');
});
