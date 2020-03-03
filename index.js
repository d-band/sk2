const { map } = require('lodash');
const Knex = require('./lib/index');
const Runner = require('./lib/runner');

const CLIENTS = {
  mariadb: 'mysql2',
  mssql: 'mssql',
  mysql: 'mysql2',
  postgres: 'postgres',
  sqlite: 'sqlite3'
};

module.exports = function withSequelize(sequelize, config = {}) {
  const dialect = sequelize.getDialect();
  const Dialect = require(`./lib/dialects/${CLIENTS[dialect]}/index.js`);

  function getType(method) {
    switch (method) {
      case 'select':
      case 'pluck':
      case 'first':
        return sequelize.QueryTypes.SELECT;
      case 'insert':
        return sequelize.QueryTypes.INSERT;
      case 'del':
        return sequelize.QueryTypes.DELETE;
      case 'update':
      case 'counter':
        return sequelize.QueryTypes.UPDATE;
      default:
        return sequelize.QueryTypes.RAW;
    }
  }

  class SequelizeRunner extends Runner {
    run() {
      const sql = this.builder.toSQL();
      if (Array.isArray(sql)) {
        return this.queryArray(sql);
      }
      return this.query(sql);
    }
    async query(obj) {
     const options = {
        replacements: obj.bindings,
        ...obj.options
      };
      const { method } = obj;
      if (!options.type) {
        options.type = getType(method);
      }
      // run query
      const data = await sequelize.query(obj.sql, options);
      // format data
      let rows = data;
      let meta = data;
      if (options.type === sequelize.QueryTypes.RAW) {
        rows = data[0];
        meta = data[1];
      }
      // run output
      if (obj.output) {
        return obj.output.call(this, rows, meta);
      }
      // format response
      switch (method) {
        case 'select':
        case 'pluck':
        case 'first': {
          if (method === 'pluck') {
            return map(rows, obj.pluck);
          }
          return method === 'first' ? rows[0] : rows;
        }
        default:
          return data;
      }
    }
  }

  class Client extends Dialect {
    constructor(cfg) {
      super(cfg);
      this.connectionSettings = config.connection || {};
    }
    runner(builder) {
      return new SequelizeRunner(this, builder);
    }
    database() {
      return sequelize.getDatabaseName();
    }
  }

  const knex = Knex({ client: Client });

  knex.transaction = async (container) => {
    const tx = await sequelize.transaction();
    const instance = Knex({ client: Client });
    instance.queryBuilder = instance.context.queryBuilder = function() {
      return this.client.queryBuilder().options({ transaction: tx });
    };
    instance.commit = () => tx.commit();
    instance.rollback = () => tx.rollback();
    if (container) {
      try {
        const resp = await container(instance);
        await tx.commit();
        return resp;
      } catch(err) {
        await tx.rollback();
        throw err;
      }
    }
    return instance;
  };

  return knex;
};

module.exports.Knex = Knex;
