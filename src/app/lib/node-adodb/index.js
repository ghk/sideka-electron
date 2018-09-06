'use strict';

var utils = require('./lib/utils');
var proxy = require('./lib/proxy');

class ADODB {
  constructor(connection) {
    this.connection = connection;
  }

  execute(sql, scalar) {
    var params = {
      connection: this.connection,
      sql: sql
    };

    var command = 'execute';

    if (utils.isString(scalar)) {
      command = 'scalar';
      params.scalar = scalar;
    }

    return proxy.exec(command, params);
  }

  query(sql) {
    return proxy.exec('query', {
      connection: this.connection,
      sql: sql
    });
  }

  executeWithTransaction(sql, scalar) {
    var params = {
      connection: this.connection,
      sql: sql
    };

    var command = 'executeWithTransaction';

    if (utils.isString(scalar)) {
      command = 'scalar';
      params.scalar = scalar;
    }

    return proxy.exec(command, params);
  }

  queryWithTransaction(sql) {
    return proxy.exec('queryWithTransaction', {
      connection: this.connection,
      sql: sql
    });
  }

  bulkExecuteWithTransaction(sql) {
    var params = {
      connection: this.connection,
      sql: sql
    };

    var command = 'bulkExecuteWithTransaction';
    return proxy.exec(command, params);
  }
}

module.exports = {
  open: (connection) => new ADODB(connection)
};
