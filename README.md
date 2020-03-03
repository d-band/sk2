# sk2

[![NPM version](https://img.shields.io/npm/v/sk2.svg)](https://www.npmjs.com/package/sk2)
[![NPM downloads](https://img.shields.io/npm/dm/sk2.svg)](https://www.npmjs.com/package/sk2)
[![Dependency Status](https://david-dm.org/d-band/sk2.svg)](https://david-dm.org/d-band/sk2)
[![Build Status](https://travis-ci.org/d-band/sk2.svg?branch=master)](https://travis-ci.org/d-band/sk2)
[![Coverage Status](https://coveralls.io/repos/github/d-band/sk2/badge.svg?branch=master)](https://coveralls.io/github/d-band/sk2?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/d-band/sk2.svg)](https://greenkeeper.io/)

> `sk2` is used for extend [sequelize](https://www.npmjs.com/package/sequelize) with [knex](https://www.npmjs.com/package/knex).

## Installation

```bash
npm install sk2
```

## Example

```js
const sk2 = require('sk2');
const Sequelize = require('sequelize');

const sequelize = new Sequelize('db_name', 'root', 'password', {
  dialect: 'mysql'
});

async function main() {
  const knex = sk2(sequelize);

  await knex.schema
    .createTable('users', function(table) {
      table.increments('id');
      table.string('user_name');
    })
    .createTable('accounts', function(table) {
      table.increments('id');
      table.string('account_name');
      table
        .integer('user_id')
        .unsigned()
        .references('users.id');
    });

  const rows = knex('users').insert({ user_name: 'Tim' });

  await knex('accounts').insert({
    account_name: 'sk2',
    user_id: rows[0]
  });

  const users = await knex('users')
    .join('accounts', 'users.id', 'accounts.user_id')
    .select('users.user_name as user', 'accounts.account_name as account');

  console.log(users);
  // [{ user: 'Tim', account: 'sk2' }]
}

main().then(() => {
  sequelize.close();
});
```

## License

MIT
