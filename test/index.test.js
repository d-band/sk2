const expect = require('chai').expect;
const Sequelize = require('sequelize');
const sk2 = require('../index');

describe('koa-orm', function() {
  this.timeout(0);

  let sequelize = null;
  let knex = null;

  before(() => {
    sequelize = new Sequelize('knex_test', 'root', process.env.MYSQL_PASS, {
      dialect: 'mysql'
    });
    knex = sk2(sequelize);
  });

  after(async () => {
    await knex.schema.dropTableIfExists('accounts');
    await knex.schema.dropTableIfExists('users');
    await sequelize.close();
  });

  it('create table', async () => {
    await knex.schema
      .createTable('users', function(table) {
        table.increments('id');
        table.string('user_name');
      })
      .createTable('accounts', function(table) {
        table.increments('id');
        table.string('account_name');
        table.integer('count').defaultTo(0);
        table
          .integer('user_id')
          .unsigned()
          .references('users.id');
      });
    const data1 = await knex.schema.hasTable('users');
    const data2 = await knex.schema.hasTable('accounts');
    const data3 = await knex.schema.hasTable('not_found');

    expect(data1).to.be.true;
    expect(data2).to.be.true;
    expect(data3).to.be.false;
  });

  it('insert data', async () => {
    const rows = await knex('users').insert({
      user_name: 'Tim'
    });
    await knex('accounts').insert({
      account_name: 'knex', user_id: rows[0]
    });
    const users = await knex('users')
      .join('accounts', 'users.id', 'accounts.user_id')
      .select('users.user_name as user', 'accounts.account_name as account');

    expect(users).to.have.lengthOf(1);
    expect(users[0]).to.have.property('user', 'Tim');
    expect(users[0]).to.have.property('account', 'knex');
  });

  it('transaction rollback', async () => {
    const tx = await knex.transaction();
    await tx('users').insert([{
      user_name: 'Tom'
    }]);
    const users1 = await tx.select().from('users');
    expect(users1).to.have.lengthOf(2);
    await tx.rollback();
    const users2 = await knex.select().from('users');

    const len = users1.length - users2.length;
    expect(len).to.equal(1);
  });

  it('transaction rollback with container', async () => {
    let users1;
    try {
      await knex.transaction(async (tx) => {
        await tx('users').insert([{
          user_name: 'Tom'
        }]);
        users1 = await tx.select().from('users');
        throw new Error('auto rollback');
      });
    } catch(err) {
      expect(err).to.be.an('error');
      const users2 = await knex.select().from('users');
      const len = users1.length - users2.length;
      expect(len).to.equal(1);
    }
  });

  it('transaction commit', async () => {
    const tx = await knex.transaction();
    await tx('users').insert([{
      user_name: 'Tom'
    }]);
    const users1 = await tx.select().from('users');
    await tx.commit();
    const users2 = await knex.select().from('users');
    expect(users1).to.deep.equal(users2);
  });

  it('transaction commit with container', async () => {
    const users1 = await knex.transaction(async (tx) => {
      await tx('users').insert([{
        user_name: 'Tom2'
      }]);
      return await tx.select().from('users');
    });
    const users2 = await knex.select().from('users');
    expect(users1).to.deep.equal(users2);
  });

  it('schema renameColumn', async () => {
    await knex.schema
      .createTable('accounts_tmp', (table) => {
        table.increments('id');
        table.string('account_name');
        table
          .integer('user_id')
          .unsigned()
          .references('accounts_tmp.id');
      });
    await knex.schema.table('accounts_tmp', (table) => {
      table.renameColumn('user_id', 'userId');
    });
    const data = await knex.schema.hasColumn('accounts_tmp', 'userId');

    expect(data).to.be.true;
    await knex.schema.dropTableIfExists('accounts_tmp');
  });

  it('select', async () => {
    const user = await knex('users').select().first().orderBy('id');

    expect(user).to.have.property('id', 1);
    expect(user).to.have.property('user_name', 'Tim');

    const ids = await knex('users').select().pluck('id').orderBy('id');

    expect(ids).to.include(1);
    expect(ids).to.have.lengthOf(3);
  });

  it('update', async () => {
    await knex('users').where({
      id: 1
    }).update({
      user_name: 'Tim2'
    });

    const user = await knex('users').select().first().orderBy('id');

    expect(user).to.have.property('id', 1);
    expect(user).to.have.property('user_name', 'Tim2');

    await knex('accounts').where({ id: 1 }).increment('count', 3);

    const account = await knex('accounts').where({
      id: 1
    }).first();
    expect(account).to.have.property('count', 3);
  });

  it('delete', async () => {
    await knex('users').where('id', '>', '1').del();
    const ids = await knex('users').select().pluck('id').orderBy('id');

    expect(ids).to.include(1);
    expect(ids).to.have.lengthOf(1);
  });

  it('nest', async () => {
    const data1 = await knex.select(knex.raw('1 as `foo.bar.baz`')).options({
      nest: true
    });
    expect(data1).to.deep.equal([{
      foo: {
        bar: { baz: 1 }
      }
    }]);
    const data2 = await knex.select(knex.raw('1 as `foo.bar.baz`')).options({
      nest: true,
      type: sequelize.QueryTypes.RAW
    });
    expect(data2).to.deep.equal([{
      'foo.bar.baz': 1
    }]);
  });

});
