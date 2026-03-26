__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  var _SQLiteDatabase = require(_dependencyMap[0]);
  Object.keys(_SQLiteDatabase).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) {
      Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () {
          return _SQLiteDatabase[k];
        }
      });
    }
  });
  var _SQLiteSession = require(_dependencyMap[1]);
  Object.keys(_SQLiteSession).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) {
      Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () {
          return _SQLiteSession[k];
        }
      });
    }
  });
  var _SQLiteStatement = require(_dependencyMap[2]);
  Object.keys(_SQLiteStatement).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) {
      Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () {
          return _SQLiteStatement[k];
        }
      });
    }
  });
  var _hooks = require(_dependencyMap[3]);
  Object.keys(_hooks).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) {
      Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () {
          return _hooks[k];
        }
      });
    }
  });
},963,[967,972,973,976]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  function _interopDefault(e) {
    return e && e.__esModule ? e : {
      default: e
    };
  }
  Object.defineProperty(exports, "SQLiteDatabase", {
    enumerable: true,
    get: function () {
      return SQLiteDatabase;
    }
  });
  Object.defineProperty(exports, "defaultDatabaseDirectory", {
    enumerable: true,
    get: function () {
      return defaultDatabaseDirectory;
    }
  });
  Object.defineProperty(exports, "bundledExtensions", {
    enumerable: true,
    get: function () {
      return bundledExtensions;
    }
  });
  exports.openDatabaseAsync = openDatabaseAsync;
  exports.openDatabaseSync = openDatabaseSync;
  exports.deserializeDatabaseAsync = deserializeDatabaseAsync;
  exports.deserializeDatabaseSync = deserializeDatabaseSync;
  exports.deleteDatabaseAsync = deleteDatabaseAsync;
  exports.deleteDatabaseSync = deleteDatabaseSync;
  exports.backupDatabaseAsync = backupDatabaseAsync;
  exports.backupDatabaseSync = backupDatabaseSync;
  exports.addDatabaseChangeListener = addDatabaseChangeListener;
  require(_dependencyMap[0]);
  var _ExpoSQLite = require(_dependencyMap[1]);
  var ExpoSQLite = _interopDefault(_ExpoSQLite);
  var _NativeDatabase = require(_dependencyMap[2]);
  var _SQLiteSession = require(_dependencyMap[3]);
  var _SQLiteStatement = require(_dependencyMap[4]);
  var _pathUtils = require(_dependencyMap[5]);
  /**
   * A SQLite database.
   */
  class SQLiteDatabase {
    constructor(databasePath, options, nativeDatabase) {
      this.databasePath = databasePath;
      this.options = options;
      this.nativeDatabase = nativeDatabase;
    }
    /**
     * Asynchronous call to return whether the database is currently in a transaction.
     */
    isInTransactionAsync() {
      return this.nativeDatabase.isInTransactionAsync();
    }
    /**
     * Close the database.
     */
    closeAsync() {
      return this.nativeDatabase.closeAsync();
    }
    /**
     * Execute all SQL queries in the supplied string.
     * > Note: The queries are not escaped for you! Be careful when constructing your queries.
     *
     * @param source A string containing all the SQL queries.
     */
    execAsync(source) {
      return this.nativeDatabase.execAsync(source);
    }
    /**
     * [Serialize the database](https://sqlite.org/c3ref/serialize.html) as `Uint8Array`.
     *
     * @param databaseName The name of the current attached databases. The default value is `main` which is the default database name.
     */
    serializeAsync(databaseName = 'main') {
      return this.nativeDatabase.serializeAsync(databaseName);
    }
    /**
     * Create a [prepared SQLite statement](https://www.sqlite.org/c3ref/prepare.html).
     *
     * @param source A string containing the SQL query.
     */
    async prepareAsync(source) {
      const nativeStatement = new ExpoSQLite.default.NativeStatement();
      await this.nativeDatabase.prepareAsync(nativeStatement, source);
      return new _SQLiteStatement.SQLiteStatement(this.nativeDatabase, nativeStatement);
    }
    /**
     * Create a new session for the database.
     * @see [`sqlite3session_create`](https://www.sqlite.org/session/sqlite3session_create.html)
     * @param dbName The name of the database to create a session for. The default value is `main`.
     */
    async createSessionAsync(dbName = 'main') {
      const nativeSession = new ExpoSQLite.default.NativeSession();
      await this.nativeDatabase.createSessionAsync(nativeSession, dbName);
      return new _SQLiteSession.SQLiteSession(this.nativeDatabase, nativeSession);
    }
    /**
     * Load a SQLite extension.
     * @param libPath The path to the extension library file.
     * @param entryPoint The entry point of the extension. If not provided, the default entry point is inferred by [`sqlite3_load_extension`](https://www.sqlite.org/c3ref/load_extension.html).
     *
     * @platform android
     * @platform ios
     * @platform macos
     * @platform tvos
     *
     * @example
     * ```ts
     * // Load `sqlite-vec` from `bundledExtensions`. You need to enable `withSQLiteVecExtension` to include `sqlite-vec`.
     * const extension = SQLite.bundledExtensions['sqlite-vec'];
     * await db.loadExtensionAsync(extension.libPath, extension.entryPoint);
     *
     * // You can also load a custom extension.
     * await db.loadExtensionAsync('/path/to/extension');
     * ```
     */
    loadExtensionAsync(libPath, entryPoint) {
      return this.nativeDatabase.loadExtensionAsync(libPath, entryPoint);
    }
    /**
     * Execute a transaction and automatically commit/rollback based on the `task` result.
     *
     * > **Note:** This transaction is not exclusive and can be interrupted by other async queries.
     *
     * @example
     * ```ts
     * db.withTransactionAsync(async () => {
     *   await db.execAsync('UPDATE test SET name = "aaa"');
     *
     *   //
     *   // We cannot control the order of async/await order, so order of execution is not guaranteed.
     *   // The following UPDATE query out of transaction may be executed here and break the expectation.
     *   //
     *
     *   const result = await db.getFirstAsync<{ name: string }>('SELECT name FROM Users');
     *   expect(result?.name).toBe('aaa');
     * });
     * db.execAsync('UPDATE test SET name = "bbb"');
     * ```
     * If you worry about the order of execution, use `withExclusiveTransactionAsync` instead.
     *
     * @param task An async function to execute within a transaction.
     */
    async withTransactionAsync(task) {
      try {
        await this.execAsync('BEGIN');
        await task();
        await this.execAsync('COMMIT');
      } catch (e) {
        await this.execAsync('ROLLBACK');
        throw e;
      }
    }
    /**
     * Execute a transaction and automatically commit/rollback based on the `task` result.
     *
     * The transaction may be exclusive.
     * As long as the transaction is converted into a write transaction,
     * the other async write queries will abort with `database is locked` error.
     *
     * > **Note:** This function is not supported on web.
     *
     * @param task An async function to execute within a transaction. Any queries inside the transaction must be executed on the `txn` object.
     * The `txn` object has the same interfaces as the [`SQLiteDatabase`](#sqlitedatabase) object. You can use `txn` like a [`SQLiteDatabase`](#sqlitedatabase) object.
     *
     * @platform android
     * @platform ios
     * @platform macos
     * @platform tvos
     *
     * @example
     * ```ts
     * db.withExclusiveTransactionAsync(async (txn) => {
     *   await txn.execAsync('UPDATE test SET name = "aaa"');
     * });
     * ```
     */
    async withExclusiveTransactionAsync(task) {
      {
        throw new Error('withExclusiveTransactionAsync is not supported on web');
      }
      const transaction = await Transaction.createAsync(this);
      let error;
      try {
        await transaction.execAsync('BEGIN');
        await task(transaction);
        await transaction.execAsync('COMMIT');
      } catch (e) {
        await transaction.execAsync('ROLLBACK');
        error = e;
      } finally {
        await transaction.closeAsync();
      }
      if (error) {
        throw error;
      }
    }
    /**
     * Synchronous call to return whether the database is currently in a transaction.
     */
    isInTransactionSync() {
      return this.nativeDatabase.isInTransactionSync();
    }
    /**
     * Close the database.
     */
    closeSync() {
      return this.nativeDatabase.closeSync();
    }
    /**
     * Execute all SQL queries in the supplied string.
     *
     * > **Note:** The queries are not escaped for you! Be careful when constructing your queries.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param source A string containing all the SQL queries.
     */
    execSync(source) {
      return this.nativeDatabase.execSync(source);
    }
    /**
     * [Serialize the database](https://sqlite.org/c3ref/serialize.html) as `Uint8Array`.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param databaseName The name of the current attached databases. The default value is `main` which is the default database name.
     */
    serializeSync(databaseName = 'main') {
      return this.nativeDatabase.serializeSync(databaseName);
    }
    /**
     * Create a [prepared SQLite statement](https://www.sqlite.org/c3ref/prepare.html).
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param source A string containing the SQL query.
     */
    prepareSync(source) {
      const nativeStatement = new ExpoSQLite.default.NativeStatement();
      this.nativeDatabase.prepareSync(nativeStatement, source);
      return new _SQLiteStatement.SQLiteStatement(this.nativeDatabase, nativeStatement);
    }
    /**
     * Create a new session for the database.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @see [`sqlite3session_create`](https://www.sqlite.org/session/sqlite3session_create.html)
     * @param dbName The name of the database to create a session for. The default value is `main`.
     */
    createSessionSync(dbName = 'main') {
      const nativeSession = new ExpoSQLite.default.NativeSession();
      this.nativeDatabase.createSessionSync(nativeSession, dbName);
      return new _SQLiteSession.SQLiteSession(this.nativeDatabase, nativeSession);
    }
    /**
     * Load a SQLite extension.
     * @param libPath The path to the extension library file.
     * @param entryPoint The entry point of the extension. If not provided, the default entry point is inferred by [`sqlite3_load_extension`](https://www.sqlite.org/c3ref/load_extension.html).
     *
     * @platform android
     * @platform ios
     * @platform macos
     * @platform tvos
     *
     * @example
     * ```ts
     * // Load `sqlite-vec` from `bundledExtensions`. You need to enable `withSQLiteVecExtension` to include `sqlite-vec`.
     * const extension = SQLite.bundledExtensions['sqlite-vec'];
     * db.loadExtensionSync(extension.libPath, extension.entryPoint);
     *
     * // You can also load a custom extension.
     * db.loadExtensionSync('/path/to/extension');
     * ```
        */
    loadExtensionSync(libPath, entryPoint) {
      this.nativeDatabase.loadExtensionSync(libPath, entryPoint);
    }
    /**
     * Execute a transaction and automatically commit/rollback based on the `task` result.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param task An async function to execute within a transaction.
     */
    withTransactionSync(task) {
      try {
        this.execSync('BEGIN');
        task();
        this.execSync('COMMIT');
      } catch (e) {
        this.execSync('ROLLBACK');
        throw e;
      }
    }
    async runAsync(source, ...params) {
      const statement = await this.prepareAsync(source);
      let result;
      try {
        result = await statement.executeAsync(...params);
      } finally {
        await statement.finalizeAsync();
      }
      return result;
    }
    async getFirstAsync(source, ...params) {
      const statement = await this.prepareAsync(source);
      let firstRow;
      try {
        const result = await statement.executeAsync(...params);
        firstRow = await result.getFirstAsync();
      } finally {
        await statement.finalizeAsync();
      }
      return firstRow;
    }
    async *getEachAsync(source, ...params) {
      const statement = await this.prepareAsync(source);
      try {
        const result = await statement.executeAsync(...params);
        for await (const row of result) {
          yield row;
        }
      } finally {
        await statement.finalizeAsync();
      }
    }
    async getAllAsync(source, ...params) {
      const statement = await this.prepareAsync(source);
      let allRows;
      try {
        const result = await statement.executeAsync(...params);
        allRows = await result.getAllAsync();
      } finally {
        await statement.finalizeAsync();
      }
      return allRows;
    }
    runSync(source, ...params) {
      const statement = this.prepareSync(source);
      let result;
      try {
        result = statement.executeSync(...params);
      } finally {
        statement.finalizeSync();
      }
      return result;
    }
    getFirstSync(source, ...params) {
      const statement = this.prepareSync(source);
      let firstRow;
      try {
        const result = statement.executeSync(...params);
        firstRow = result.getFirstSync();
      } finally {
        statement.finalizeSync();
      }
      return firstRow;
    }
    *getEachSync(source, ...params) {
      const statement = this.prepareSync(source);
      try {
        const result = statement.executeSync(...params);
        for (const row of result) {
          yield row;
        }
      } finally {
        statement.finalizeSync();
      }
    }
    getAllSync(source, ...params) {
      const statement = this.prepareSync(source);
      let allRows;
      try {
        const result = statement.executeSync(...params);
        allRows = result.getAllSync();
      } finally {
        statement.finalizeSync();
      }
      return allRows;
    }
    /**
     * Synchronize the local database with the remote libSQL server.
     * This method is only available from libSQL integration.
     */
    syncLibSQL() {
      if (typeof this.nativeDatabase.syncLibSQL !== 'function') {
        throw new Error('syncLibSQL is not supported in the current environment');
      }
      return this.nativeDatabase.syncLibSQL();
    }
  }
  /**
   * The default directory for SQLite databases.
   */
  const defaultDatabaseDirectory = ExpoSQLite.default.defaultDatabaseDirectory;
  /**
   * The pre-bundled SQLite extensions.
   */
  const bundledExtensions = ExpoSQLite.default.bundledExtensions;
  /**
   * Open a database.
   *
   * @param databaseName The name of the database file to open.
   * @param options Open options.
   * @param directory The directory where the database file is located. The default value is `defaultDatabaseDirectory`. This parameter is not supported on web.
   */
  async function openDatabaseAsync(databaseName, options, directory) {
    const openOptions = options ?? {};
    const databasePath = (0, _pathUtils.createDatabasePath)(databaseName, directory);
    await ExpoSQLite.default.ensureDatabasePathExistsAsync(databasePath);
    const nativeDatabase = new ExpoSQLite.default.NativeDatabase(databasePath, (0, _NativeDatabase.flattenOpenOptions)(openOptions));
    await nativeDatabase.initAsync();
    return new SQLiteDatabase(databasePath, openOptions, nativeDatabase);
  }
  /**
   * Open a database.
   *
   * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
   *
   * @param databaseName The name of the database file to open.
   * @param options Open options.
   * @param directory The directory where the database file is located. The default value is `defaultDatabaseDirectory`. This parameter is not supported on web.
   */
  function openDatabaseSync(databaseName, options, directory) {
    const openOptions = options ?? {};
    const databasePath = (0, _pathUtils.createDatabasePath)(databaseName, directory);
    ExpoSQLite.default.ensureDatabasePathExistsSync(databasePath);
    const nativeDatabase = new ExpoSQLite.default.NativeDatabase(databasePath, (0, _NativeDatabase.flattenOpenOptions)(openOptions));
    nativeDatabase.initSync();
    return new SQLiteDatabase(databasePath, openOptions, nativeDatabase);
  }
  /**
   * Given a `Uint8Array` data and [deserialize to memory database](https://sqlite.org/c3ref/deserialize.html).
   *
   * @param serializedData The binary array to deserialize from [`SQLiteDatabase.serializeAsync()`](#serializeasyncdatabasename).
   * @param options Open options.
   */
  async function deserializeDatabaseAsync(serializedData, options) {
    const openOptions = options ?? {};
    const nativeDatabase = new ExpoSQLite.default.NativeDatabase(':memory:', (0, _NativeDatabase.flattenOpenOptions)(openOptions), serializedData);
    await nativeDatabase.initAsync();
    return new SQLiteDatabase(':memory:', openOptions, nativeDatabase);
  }
  /**
   * Given a `Uint8Array` data and [deserialize to memory database](https://sqlite.org/c3ref/deserialize.html).
   *
   * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
   *
   * @param serializedData The binary array to deserialize from [`SQLiteDatabase.serializeSync()`](#serializesyncdatabasename)
   * @param options Open options.
   */
  function deserializeDatabaseSync(serializedData, options) {
    const openOptions = options ?? {};
    const nativeDatabase = new ExpoSQLite.default.NativeDatabase(':memory:', (0, _NativeDatabase.flattenOpenOptions)(openOptions), serializedData);
    nativeDatabase.initSync();
    return new SQLiteDatabase(':memory:', openOptions, nativeDatabase);
  }
  /**
   * Delete a database file.
   *
   * @param databaseName The name of the database file to delete.
   * @param directory The directory where the database file is located. The default value is `defaultDatabaseDirectory`.
   */
  async function deleteDatabaseAsync(databaseName, directory) {
    const databasePath = (0, _pathUtils.createDatabasePath)(databaseName, directory);
    return await ExpoSQLite.default.deleteDatabaseAsync(databasePath);
  }
  /**
   * Delete a database file.
   *
   * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
   *
   * @param databaseName The name of the database file to delete.
   * @param directory The directory where the database file is located. The default value is `defaultDatabaseDirectory`.
   */
  function deleteDatabaseSync(databaseName, directory) {
    const databasePath = (0, _pathUtils.createDatabasePath)(databaseName, directory);
    return ExpoSQLite.default.deleteDatabaseSync(databasePath);
  }
  /**
   * Backup a database to another database.
   *
   * @see https://www.sqlite.org/c3ref/backup_finish.html
   *
   * @param options - The backup options
   * @param options.sourceDatabase - The source database to backup from
   * @param options.sourceDatabaseName - The name of the source database. The default value is `main`
   * @param options.destDatabase - The destination database to backup to
   * @param options.destDatabaseName - The name of the destination database. The default value is `m
   */
  function backupDatabaseAsync({
    sourceDatabase,
    sourceDatabaseName,
    destDatabase,
    destDatabaseName
  }) {
    return ExpoSQLite.default.backupDatabaseAsync(destDatabase.nativeDatabase, destDatabaseName ?? 'main', sourceDatabase.nativeDatabase, sourceDatabaseName ?? 'main');
  }
  /**
   * Backup a database to another database.
   *
   * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
   *
   * @see https://www.sqlite.org/c3ref/backup_finish.html
   *
   * @param options - The backup options
   * @param options.sourceDatabase - The source database to backup from
   * @param options.sourceDatabaseName - The name of the source database. The default value is `main`
   * @param options.destDatabase - The destination database to backup to
   * @param options.destDatabaseName - The name of the destination database. The default value is `m
   */
  function backupDatabaseSync({
    sourceDatabase,
    sourceDatabaseName,
    destDatabase,
    destDatabaseName
  }) {
    return ExpoSQLite.default.backupDatabaseSync(destDatabase.nativeDatabase, destDatabaseName ?? 'main', sourceDatabase.nativeDatabase, sourceDatabaseName ?? 'main');
  }
  /**
   * Add a listener for database changes.
   * > Note: to enable this feature, you must set [`enableChangeListener` to `true`](#sqliteopenoptions) when opening the database.
   *
   * @param listener A function that receives the `databaseName`, `databaseFilePath`, `tableName` and `rowId` of the modified data.
   * @returns A `Subscription` object that you can call `remove()` on when you would like to unsubscribe the listener.
   */
  function addDatabaseChangeListener(listener) {
    return ExpoSQLite.default.addListener('onDatabaseChange', listener);
  }
  /**
   * A new connection specific used for [`withExclusiveTransactionAsync`](#withexclusivetransactionasynctask).
   * @hidden not going to pull all the database methods to the document.
   */
  class Transaction extends SQLiteDatabase {
    static async createAsync(db) {
      const options = Object.assign({}, db.options, {
        useNewConnection: true
      });
      const nativeDatabase = new ExpoSQLite.default.NativeDatabase(db.databasePath, (0, _NativeDatabase.flattenOpenOptions)(options));
      await nativeDatabase.initAsync();
      return new Transaction(db.databasePath, options, nativeDatabase);
    }
  }
},967,[1,968,971,972,973,975]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function () {
      return _default;
    }
  });
  var _expo = require(_dependencyMap[0]);
  let ExpoSQLite;
  if (typeof window === 'undefined') {
    ExpoSQLite = require(_dependencyMap[1]).default;
  } else if (typeof globalThis.ExpoDomWebView !== 'undefined') {
    ExpoSQLite = (0, _expo.requireNativeModule)('ExpoSQLite');
  } else {
    ExpoSQLite = require(_dependencyMap[2]).default;
  }
  var _default = ExpoSQLite;
},968,[2,969,970]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function () {
      return _default;
    }
  });
  Object.defineProperty(exports, "NativeSession", {
    enumerable: true,
    get: function () {
      return NativeSession;
    }
  });
  Object.defineProperty(exports, "SQLiteModule", {
    enumerable: true,
    get: function () {
      return SQLiteModule;
    }
  });
  var _expo = require(_dependencyMap[0]);
  // expo-sqlite is not supported on server runtime, this file contains a dummy implementation for the server runtime

  class NativeDatabase {
    id = 0;
    constructor(databasePath, options, serializedData) {
      this.databasePath = databasePath;
      this.options = options;
      this.serializedData = serializedData;
    }
    async initAsync() {}
    initSync() {}
    async isInTransactionAsync() {
      return false;
    }
    isInTransactionSync() {
      return false;
    }
    async closeAsync() {}
    closeSync() {}
    async execAsync(source) {}
    execSync(source) {}
    async serializeAsync(schemaName) {
      return new Uint8Array();
    }
    serializeSync(schemaName) {
      return new Uint8Array();
    }
    async prepareAsync(nativeStatement, source) {}
    prepareSync(nativeStatement, source) {}
    async createSessionAsync(nativeSession, dbName) {}
    createSessionSync(nativeSession, dbName) {}
    async loadExtensionAsync(filePath, entryPoint) {}
    loadExtensionSync(filePath, entryPoint) {}
  }
  class NativeStatement {
    id = 0;
    async runAsync(database, bindParams, bindBlobParams, shouldPassAsArray) {
      return {
        lastInsertRowId: 0,
        changes: 0,
        firstRowValues: []
      };
    }
    runSync(database, bindParams, bindBlobParams, shouldPassAsArray) {
      return {
        lastInsertRowId: 0,
        changes: 0,
        firstRowValues: []
      };
    }
    async stepAsync(database) {
      return null;
    }
    stepSync(database) {
      return null;
    }
    async getAllAsync(database) {
      return [];
    }
    getAllSync(database) {
      return [];
    }
    async resetAsync(database) {}
    resetSync(database) {}
    async getColumnNamesAsync() {
      return [];
    }
    getColumnNamesSync() {
      return [];
    }
    async finalizeAsync(database) {}
    finalizeSync(database) {}
  }
  class NativeSession {
    id = 0;
    async attachAsync(database, table) {}
    attachSync(database, table) {}
    async enableAsync(database, enabled) {}
    enableSync(database, enabled) {}
    async closeAsync(database) {}
    closeSync(database) {}
    async createChangesetAsync(database) {
      return new Uint8Array();
    }
    createChangesetSync(database) {
      return new Uint8Array();
    }
    async createInvertedChangesetAsync(database) {
      return new Uint8Array();
    }
    createInvertedChangesetSync(database) {
      return new Uint8Array();
    }
    async applyChangesetAsync(database, changeset) {}
    applyChangesetSync(database, changeset) {}
    async invertChangesetAsync(database, changeset) {
      return new Uint8Array();
    }
    invertChangesetSync(database, changeset) {
      return new Uint8Array();
    }
  }
  class SQLiteModule extends _expo.NativeModule {
    defaultDatabaseDirectory = '.';
    bundledExtensions = {};
    async deleteDatabaseAsync(databasePath) {}
    deleteDatabaseSync(databasePath) {}
    async ensureDatabasePathExistsAsync(databasePath) {}
    ensureDatabasePathExistsSync(databasePath) {}
    async backupDatabaseAsync(destDatabase, destDatabaseName, sourceDatabase, sourceDatabaseName) {}
    backupDatabaseSync(destDatabase, destDatabaseName, sourceDatabase, sourceDatabaseName) {}
    async importAssetDatabaseAsync(databasePath, assetDatabasePath, forceOverwrite) {}
    NativeDatabase = NativeDatabase;
    NativeStatement = NativeStatement;
    NativeSession = NativeSession;
  }
  const SQLiteModuleInstance = (0, _expo.registerWebModule)(SQLiteModule, 'SQLiteModule');
  var _default = SQLiteModuleInstance;
},969,[2]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function () {
      return _default;
    }
  });
  Object.defineProperty(exports, "NativeSession", {
    enumerable: true,
    get: function () {
      return NativeSession;
    }
  });
  Object.defineProperty(exports, "SQLiteModule", {
    enumerable: true,
    get: function () {
      return SQLiteModule;
    }
  });
  var _expo = require(_dependencyMap[0]);
  var _WorkerChannel = require(_dependencyMap[1]);
  // Copyright 2015-present 650 Industries. All rights reserved.

  let worker = null;
  let nextNativeDatabaseId = 0;
  let nextNativeStatementId = 0;
  let nextNativeSessionId = 0;
  function getWorker() {
    if (!worker) {
      worker = new (require(_dependencyMap[3]).unstable_createWorker)(new URL(require(_dependencyMap[3]).unstable_resolve(_dependencyMap[2], _dependencyMap.paths), window.location.href));
      worker.addEventListener('message', event => {
        if (event.data.type === 'onDatabaseChange') {
          // @ts-expect-error EventEmitter type for NativeModule is not inferred correctly on web.
          SQLiteModuleInstance.emit(event.data.type, event.data.data);
          return;
        }
        (0, _WorkerChannel.workerMessageHandler)(event);
      });
    }
    return worker;
  }
  class NativeDatabase {
    constructor(databasePath, options, serializedData) {
      this.databasePath = databasePath;
      this.options = options;
      this.serializedData = serializedData;
      this.id = nextNativeDatabaseId++;
    }
    async initAsync() {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'open', {
        nativeDatabaseId: this.id,
        databasePath: this.databasePath,
        options: this.options ?? {},
        serializedData: this.serializedData
      });
    }
    initSync() {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'open', {
        nativeDatabaseId: this.id,
        databasePath: this.databasePath,
        options: this.options ?? {},
        serializedData: this.serializedData
      });
    }
    async isInTransactionAsync() {
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'isInTransaction', {
        nativeDatabaseId: this.id
      });
    }
    isInTransactionSync() {
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'isInTransaction', {
        nativeDatabaseId: this.id
      });
    }
    async closeAsync() {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'close', {
        nativeDatabaseId: this.id
      });
    }
    closeSync() {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'close', {
        nativeDatabaseId: this.id
      });
    }
    async execAsync(source) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'exec', {
        nativeDatabaseId: this.id,
        source
      });
    }
    execSync(source) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'exec', {
        nativeDatabaseId: this.id,
        source
      });
    }
    async serializeAsync(schemaName) {
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'serialize', {
        nativeDatabaseId: this.id,
        schemaName
      });
    }
    serializeSync(schemaName) {
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'serialize', {
        nativeDatabaseId: this.id,
        schemaName
      });
    }
    async prepareAsync(nativeStatement, source) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'prepare', {
        nativeDatabaseId: this.id,
        nativeStatementId: nativeStatement.id,
        source
      });
    }
    prepareSync(nativeStatement, source) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'prepare', {
        nativeDatabaseId: this.id,
        nativeStatementId: nativeStatement.id,
        source
      });
    }
    async createSessionAsync(nativeSession, dbName) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionCreate', {
        nativeDatabaseId: this.id,
        nativeSessionId: nativeSession.id,
        dbName
      });
    }
    createSessionSync(nativeSession, dbName) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionCreate', {
        nativeDatabaseId: this.id,
        nativeSessionId: nativeSession.id,
        dbName
      });
    }
    loadExtensionAsync(filePath, entryPoint) {
      throw new Error('Not implemented on web');
    }
    loadExtensionSync(filePath, entryPoint) {
      throw new Error('Not implemented on web');
    }
  }
  class NativeStatement {
    constructor() {
      this.id = nextNativeStatementId++;
    }
    async runAsync(database, bindParams, bindBlobParams, shouldPassAsArray) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'run', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id,
        bindParams,
        bindBlobParams,
        shouldPassAsArray
      });
    }
    runSync(database, bindParams, bindBlobParams, shouldPassAsArray) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'run', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id,
        bindParams,
        bindBlobParams,
        shouldPassAsArray
      });
    }
    async stepAsync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'step', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    stepSync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'step', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    async getAllAsync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'getAll', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    getAllSync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'getAll', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    async resetAsync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'reset', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    resetSync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'reset', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    async getColumnNamesAsync() {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'getColumnNames', {
        nativeStatementId: this.id
      });
    }
    getColumnNamesSync() {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'getColumnNames', {
        nativeStatementId: this.id
      });
    }
    async finalizeAsync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'finalize', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
    finalizeSync(database) {
      if (this.id == null) {
        throw new Error('Statement not prepared');
      }
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'finalize', {
        nativeDatabaseId: database.id,
        nativeStatementId: this.id
      });
    }
  }
  class NativeSession {
    constructor() {
      this.id = nextNativeSessionId++;
    }
    async attachAsync(database, table) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionAttach', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        table
      });
    }
    attachSync(database, table) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionAttach', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        table
      });
    }
    async enableAsync(database, enabled) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionEnable', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        enabled
      });
    }
    enableSync(database, enabled) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionEnable', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        enabled
      });
    }
    async closeAsync(database) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionClose', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id
      });
    }
    closeSync(database) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionClose', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id
      });
    }
    async createChangesetAsync(database) {
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionCreateChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id
      });
    }
    createChangesetSync(database) {
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionCreateChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id
      });
    }
    async createInvertedChangesetAsync(database) {
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionCreateInvertedChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id
      });
    }
    createInvertedChangesetSync(database) {
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionCreateInvertedChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id
      });
    }
    async applyChangesetAsync(database, changeset) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionApplyChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        changeset
      });
    }
    applyChangesetSync(database, changeset) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionApplyChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        changeset
      });
    }
    async invertChangesetAsync(database, changeset) {
      return await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'sessionInvertChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        changeset
      });
    }
    invertChangesetSync(database, changeset) {
      return (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'sessionInvertChangeset', {
        nativeDatabaseId: database.id,
        nativeSessionId: this.id,
        changeset
      });
    }
  }
  class SQLiteModule extends _expo.NativeModule {
    defaultDatabaseDirectory = '.';
    bundledExtensions = {};
    async deleteDatabaseAsync(databasePath) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'deleteDatabase', {
        databasePath
      });
    }
    deleteDatabaseSync(databasePath) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'deleteDatabase', {
        databasePath
      });
    }
    async ensureDatabasePathExistsAsync(databasePath) {
      // No-op for web
    }
    ensureDatabasePathExistsSync(databasePath) {
      // No-op for web
    }
    async backupDatabaseAsync(destDatabase, destDatabaseName, sourceDatabase, sourceDatabaseName) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'backupDatabase', {
        destNativeDatabaseId: destDatabase.id,
        destDatabaseName,
        sourceNativeDatabaseId: sourceDatabase.id,
        sourceDatabaseName
      });
    }
    backupDatabaseSync(destDatabase, destDatabaseName, sourceDatabase, sourceDatabaseName) {
      (0, _WorkerChannel.invokeWorkerSync)(getWorker(), 'backupDatabase', {
        destNativeDatabaseId: destDatabase.id,
        destDatabaseName,
        sourceNativeDatabaseId: sourceDatabase.id,
        sourceDatabaseName
      });
    }
    async importAssetDatabaseAsync(databasePath, assetDatabasePath, forceOverwrite) {
      await (0, _WorkerChannel.invokeWorkerAsync)(getWorker(), 'importAssetDatabase', {
        databasePath,
        assetDatabasePath,
        forceOverwrite
      });
    }
    NativeDatabase = NativeDatabase;
    NativeStatement = NativeStatement;
    NativeSession = NativeSession;
  }
  const SQLiteModuleInstance = (0, _expo.registerWebModule)(SQLiteModule, 'SQLiteModule');
  var _default = SQLiteModuleInstance;
},970,{"0":2,"1":964,"2":977,"3":823,"paths":{"977":"/_expo/static/js/web/worker-cc2e985602aadf1c433223756fd15cb9.js"}});
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  const _excluded = ["libSQLOptions"];
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  function _interopDefault(e) {
    return e && e.__esModule ? e : {
      default: e
    };
  }
  exports.flattenOpenOptions = flattenOpenOptions;
  var _babelRuntimeHelpersObjectWithoutPropertiesLoose = require(_dependencyMap[0]);
  var _objectWithoutPropertiesLoose = _interopDefault(_babelRuntimeHelpersObjectWithoutPropertiesLoose);
  /**
   * Flattens the SQLiteOpenOptions that are passed to the native module.
   */
  function flattenOpenOptions(options) {
    const {
        libSQLOptions
      } = options,
      restOptions = (0, _objectWithoutPropertiesLoose.default)(options, _excluded);
    const result = Object.assign({}, restOptions);
    if (libSQLOptions) {
      Object.assign(result, {
        libSQLUrl: libSQLOptions.url,
        libSQLAuthToken: libSQLOptions.authToken,
        libSQLRemoteOnly: libSQLOptions.remoteOnly
      });
    }
    return result;
  }
},971,[129]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  Object.defineProperty(exports, "SQLiteSession", {
    enumerable: true,
    get: function () {
      return SQLiteSession;
    }
  });
  /**
   * A class that represents an instance of the SQLite session extension.
   * @see [Session Extension](https://www.sqlite.org/sessionintro.html)
   */
  class SQLiteSession {
    constructor(nativeDatabase, nativeSession) {
      this.nativeDatabase = nativeDatabase;
      this.nativeSession = nativeSession;
    }
    //#region Asynchronous API
    /**
     * Attach a table to the session asynchronously.
     * @see [`sqlite3session_attach`](https://www.sqlite.org/session/sqlite3session_attach.html)
     * @param table The table to attach. If `null`, all tables are attached.
     */
    attachAsync(table) {
      return this.nativeSession.attachAsync(this.nativeDatabase, table);
    }
    /**
     * Enable or disable the session asynchronously.
     * @see [`sqlite3session_enable`](https://www.sqlite.org/session/sqlite3session_enable.html)
     * @param enabled Whether to enable or disable the session.
     */
    enableAsync(enabled) {
      return this.nativeSession.enableAsync(this.nativeDatabase, enabled);
    }
    /**
     * Close the session asynchronously.
     * @see [`sqlite3session_delete`](https://www.sqlite.org/session/sqlite3session_delete.html)
     */
    closeAsync() {
      return this.nativeSession.closeAsync(this.nativeDatabase);
    }
    /**
     * Create a changeset asynchronously.
     * @see [`sqlite3session_changeset`](https://www.sqlite.org/session/sqlite3session_changeset.html)
     */
    createChangesetAsync() {
      return this.nativeSession.createChangesetAsync(this.nativeDatabase);
    }
    /**
     * Create an inverted changeset asynchronously.
     * This is a shorthand for [`createChangesetAsync()`](#createchangesetasync) + [`invertChangesetAsync()`](#invertchangesetasyncchangeset).
     */
    createInvertedChangesetAsync() {
      return this.nativeSession.createInvertedChangesetAsync(this.nativeDatabase);
    }
    /**
     * Apply a changeset asynchronously.
     * @see [`sqlite3changeset_apply`](https://www.sqlite.org/session/sqlite3changeset_apply.html)
     * @param changeset The changeset to apply.
     */
    applyChangesetAsync(changeset) {
      return this.nativeSession.applyChangesetAsync(this.nativeDatabase, changeset);
    }
    /**
     * Invert a changeset asynchronously.
     * @see [`sqlite3changeset_invert`](https://www.sqlite.org/session/sqlite3changeset_invert.html)
     * @param changeset The changeset to invert.
     */
    invertChangesetAsync(changeset) {
      return this.nativeSession.invertChangesetAsync(this.nativeDatabase, changeset);
    }
    //#endregion
    //#region Synchronous API
    /**
     * Attach a table to the session synchronously.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param table The table to attach.
     * @see [`sqlite3session_attach`](https://www.sqlite.org/session/sqlite3session_attach.html)
     */
    attachSync(table) {
      this.nativeSession.attachSync(this.nativeDatabase, table);
    }
    /**
     * Enable or disable the session synchronously.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param enabled Whether to enable or disable the session.
     * @see [`sqlite3session_enable`](https://www.sqlite.org/session/sqlite3session_enable.html)
     */
    enableSync(enabled) {
      this.nativeSession.enableSync(this.nativeDatabase, enabled);
    }
    /**
     * Close the session synchronously.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @see [`sqlite3session_delete`](https://www.sqlite.org/session/sqlite3session_delete.html)
     */
    closeSync() {
      this.nativeSession.closeSync(this.nativeDatabase);
    }
    /**
     * Create a changeset synchronously.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @see [`sqlite3session_changeset`](https://www.sqlite.org/session/sqlite3session_changeset.html)
     */
    createChangesetSync() {
      return this.nativeSession.createChangesetSync(this.nativeDatabase);
    }
    /**
     * Create an inverted changeset synchronously.
     * This is a shorthand for [`createChangesetSync()`](#createchangesetsync) + [`invertChangesetSync()`](#invertchangesetsyncchangeset).
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     */
    createInvertedChangesetSync() {
      return this.nativeSession.createInvertedChangesetSync(this.nativeDatabase);
    }
    /**
     * Apply a changeset synchronously.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param changeset The changeset to apply.
     * @see [`sqlite3changeset_apply`](https://www.sqlite.org/session/sqlite3changeset_apply.html)
     */
    applyChangesetSync(changeset) {
      this.nativeSession.applyChangesetSync(this.nativeDatabase, changeset);
    }
    /**
     * Invert a changeset synchronously.
     *
     * > **Note:** Running heavy tasks with this function can block the JavaScript thread and affect performance.
     *
     * @param changeset The changeset to invert.
     * @see [`sqlite3changeset_invert`](https://www.sqlite.org/session/sqlite3changeset_invert.html)
     */
    invertChangesetSync(changeset) {
      return this.nativeSession.invertChangesetSync(this.nativeDatabase, changeset);
    }
  }
},972,[]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  Object.defineProperty(exports, "SQLiteStatement", {
    enumerable: true,
    get: function () {
      return SQLiteStatement;
    }
  });
  var _paramUtils = require(_dependencyMap[0]);
  /**
   * A prepared statement returned by [`SQLiteDatabase.prepareAsync()`](#prepareasyncsource) or [`SQLiteDatabase.prepareSync()`](#preparesyncsource) that can be binded with parameters and executed.
   */
  class SQLiteStatement {
    constructor(nativeDatabase, nativeStatement) {
      this.nativeDatabase = nativeDatabase;
      this.nativeStatement = nativeStatement;
    }
    async executeAsync(...params) {
      const {
        lastInsertRowId,
        changes,
        firstRowValues
      } = await this.nativeStatement.runAsync(this.nativeDatabase, ...(0, _paramUtils.normalizeParams)(...params));
      return createSQLiteExecuteAsyncResult(this.nativeDatabase, this.nativeStatement, firstRowValues, {
        rawResult: false,
        lastInsertRowId,
        changes
      });
    }
    async executeForRawResultAsync(...params) {
      const {
        lastInsertRowId,
        changes,
        firstRowValues
      } = await this.nativeStatement.runAsync(this.nativeDatabase, ...(0, _paramUtils.normalizeParams)(...params));
      return createSQLiteExecuteAsyncResult(this.nativeDatabase, this.nativeStatement, firstRowValues, {
        rawResult: true,
        lastInsertRowId,
        changes
      });
    }
    /**
     * Get the column names of the prepared statement.
     */
    getColumnNamesAsync() {
      return this.nativeStatement.getColumnNamesAsync();
    }
    /**
     * Finalize the prepared statement. This will call the [`sqlite3_finalize()`](https://www.sqlite.org/c3ref/finalize.html) C function under the hood.
     *
     * Attempting to access a finalized statement will result in an error.
     * > **Note:** While `expo-sqlite` will automatically finalize any orphaned prepared statements upon closing the database, it is considered best practice
     * > to manually finalize prepared statements as soon as they are no longer needed. This helps to prevent resource leaks.
     * > You can use the `try...finally` statement to ensure that prepared statements are finalized even if an error occurs.
     */
    async finalizeAsync() {
      await this.nativeStatement.finalizeAsync(this.nativeDatabase);
    }
    executeSync(...params) {
      const {
        lastInsertRowId,
        changes,
        firstRowValues
      } = this.nativeStatement.runSync(this.nativeDatabase, ...(0, _paramUtils.normalizeParams)(...params));
      return createSQLiteExecuteSyncResult(this.nativeDatabase, this.nativeStatement, firstRowValues, {
        rawResult: false,
        lastInsertRowId,
        changes
      });
    }
    executeForRawResultSync(...params) {
      const {
        lastInsertRowId,
        changes,
        firstRowValues
      } = this.nativeStatement.runSync(this.nativeDatabase, ...(0, _paramUtils.normalizeParams)(...params));
      return createSQLiteExecuteSyncResult(this.nativeDatabase, this.nativeStatement, firstRowValues, {
        rawResult: true,
        lastInsertRowId,
        changes
      });
    }
    /**
     * Get the column names of the prepared statement.
     */
    getColumnNamesSync() {
      return this.nativeStatement.getColumnNamesSync();
    }
    /**
     * Finalize the prepared statement. This will call the [`sqlite3_finalize()`](https://www.sqlite.org/c3ref/finalize.html) C function under the hood.
     *
     * Attempting to access a finalized statement will result in an error.
     *
     * > **Note:** While `expo-sqlite` will automatically finalize any orphaned prepared statements upon closing the database, it is considered best practice
     * > to manually finalize prepared statements as soon as they are no longer needed. This helps to prevent resource leaks.
     * > You can use the `try...finally` statement to ensure that prepared statements are finalized even if an error occurs.
     */
    finalizeSync() {
      this.nativeStatement.finalizeSync(this.nativeDatabase);
    }
  }
  /**
   * Create the `SQLiteExecuteAsyncResult` instance.
   *
   * NOTE: Since Hermes does not support the `Symbol.asyncIterator` feature, we have to use an AsyncGenerator to implement the `AsyncIterableIterator` interface.
   * This is done by `Object.defineProperties` to add the properties to the AsyncGenerator.
   */
  async function createSQLiteExecuteAsyncResult(database, statement, firstRowValues, options) {
    const instance = new SQLiteExecuteAsyncResultImpl(database, statement, firstRowValues, options);
    const generator = instance.generatorAsync();
    Object.defineProperties(generator, {
      lastInsertRowId: {
        value: options.lastInsertRowId,
        enumerable: true,
        writable: false,
        configurable: true
      },
      changes: {
        value: options.changes,
        enumerable: true,
        writable: false,
        configurable: true
      },
      getFirstAsync: {
        value: instance.getFirstAsync.bind(instance),
        enumerable: true,
        writable: false,
        configurable: true
      },
      getAllAsync: {
        value: instance.getAllAsync.bind(instance),
        enumerable: true,
        writable: false,
        configurable: true
      },
      resetAsync: {
        value: instance.resetAsync.bind(instance),
        enumerable: true,
        writable: false,
        configurable: true
      }
    });
    return generator;
  }
  /**
   * Create the `SQLiteExecuteSyncResult` instance.
   */
  function createSQLiteExecuteSyncResult(database, statement, firstRowValues, options) {
    const instance = new SQLiteExecuteSyncResultImpl(database, statement, firstRowValues, options);
    const generator = instance.generatorSync();
    Object.defineProperties(generator, {
      lastInsertRowId: {
        value: options.lastInsertRowId,
        enumerable: true,
        writable: false,
        configurable: true
      },
      changes: {
        value: options.changes,
        enumerable: true,
        writable: false,
        configurable: true
      },
      getFirstSync: {
        value: instance.getFirstSync.bind(instance),
        enumerable: true,
        writable: false,
        configurable: true
      },
      getAllSync: {
        value: instance.getAllSync.bind(instance),
        enumerable: true,
        writable: false,
        configurable: true
      },
      resetSync: {
        value: instance.resetSync.bind(instance),
        enumerable: true,
        writable: false,
        configurable: true
      }
    });
    return generator;
  }
  class SQLiteExecuteAsyncResultImpl {
    columnNames = null;
    isStepCalled = false;
    constructor(database, statement, firstRowValues, options) {
      this.database = database;
      this.statement = statement;
      this.firstRowValues = firstRowValues;
      this.options = options;
    }
    async getFirstAsync() {
      if (this.isStepCalled) {
        throw new Error('The SQLite cursor has been shifted and is unable to retrieve the first row without being reset. Invoke `resetAsync()` to reset the cursor first if you want to retrieve the first row.');
      }
      this.isStepCalled = true;
      const columnNames = await this.getColumnNamesAsync();
      const firstRowValues = this.popFirstRowValues();
      if (firstRowValues != null) {
        return composeRowIfNeeded(this.options.rawResult, columnNames, firstRowValues);
      }
      const firstRow = await this.statement.stepAsync(this.database);
      return firstRow != null ? composeRowIfNeeded(this.options.rawResult, columnNames, firstRow) : null;
    }
    async getAllAsync() {
      if (this.isStepCalled) {
        throw new Error('The SQLite cursor has been shifted and is unable to retrieve all rows without being reset. Invoke `resetAsync()` to reset the cursor first if you want to retrieve all rows.');
      }
      this.isStepCalled = true;
      const firstRowValues = this.popFirstRowValues();
      if (firstRowValues == null) {
        // If the first row is empty, this SQL query may be a write operation. We should not call `statement.getAllAsync()` to write again.
        return [];
      }
      const columnNames = await this.getColumnNamesAsync();
      const allRows = await this.statement.getAllAsync(this.database);
      if (firstRowValues != null && firstRowValues.length > 0) {
        return composeRowsIfNeeded(this.options.rawResult, columnNames, [firstRowValues, ...allRows]);
      }
      return composeRowsIfNeeded(this.options.rawResult, columnNames, allRows);
    }
    async *generatorAsync() {
      this.isStepCalled = true;
      const columnNames = await this.getColumnNamesAsync();
      const firstRowValues = this.popFirstRowValues();
      if (firstRowValues != null) {
        yield composeRowIfNeeded(this.options.rawResult, columnNames, firstRowValues);
      }
      let result;
      do {
        result = await this.statement.stepAsync(this.database);
        if (result != null) {
          yield composeRowIfNeeded(this.options.rawResult, columnNames, result);
        }
      } while (result != null);
    }
    resetAsync() {
      const result = this.statement.resetAsync(this.database);
      this.isStepCalled = false;
      return result;
    }
    popFirstRowValues() {
      if (this.firstRowValues != null) {
        const firstRowValues = this.firstRowValues;
        this.firstRowValues = null;
        return firstRowValues.length > 0 ? firstRowValues : null;
      }
      return null;
    }
    async getColumnNamesAsync() {
      if (this.columnNames == null) {
        this.columnNames = await this.statement.getColumnNamesAsync();
      }
      return this.columnNames;
    }
  }
  class SQLiteExecuteSyncResultImpl {
    columnNames = null;
    isStepCalled = false;
    constructor(database, statement, firstRowValues, options) {
      this.database = database;
      this.statement = statement;
      this.firstRowValues = firstRowValues;
      this.options = options;
    }
    getFirstSync() {
      if (this.isStepCalled) {
        throw new Error('The SQLite cursor has been shifted and is unable to retrieve the first row without being reset. Invoke `resetSync()` to reset the cursor first if you want to retrieve the first row.');
      }
      const columnNames = this.getColumnNamesSync();
      const firstRowValues = this.popFirstRowValues();
      if (firstRowValues != null) {
        return composeRowIfNeeded(this.options.rawResult, columnNames, firstRowValues);
      }
      const firstRow = this.statement.stepSync(this.database);
      return firstRow != null ? composeRowIfNeeded(this.options.rawResult, columnNames, firstRow) : null;
    }
    getAllSync() {
      if (this.isStepCalled) {
        throw new Error('The SQLite cursor has been shifted and is unable to retrieve all rows without being reset. Invoke `resetSync()` to reset the cursor first if you want to retrieve all rows.');
      }
      const firstRowValues = this.popFirstRowValues();
      if (firstRowValues == null) {
        // If the first row is empty, this SQL query may be a write operation. We should not call `statement.getAllAsync()` to write again.
        return [];
      }
      const columnNames = this.getColumnNamesSync();
      const allRows = this.statement.getAllSync(this.database);
      if (firstRowValues != null && firstRowValues.length > 0) {
        return composeRowsIfNeeded(this.options.rawResult, columnNames, [firstRowValues, ...allRows]);
      }
      return composeRowsIfNeeded(this.options.rawResult, columnNames, allRows);
    }
    *generatorSync() {
      const columnNames = this.getColumnNamesSync();
      const firstRowValues = this.popFirstRowValues();
      if (firstRowValues != null) {
        yield composeRowIfNeeded(this.options.rawResult, columnNames, firstRowValues);
      }
      let result;
      do {
        result = this.statement.stepSync(this.database);
        if (result != null) {
          yield composeRowIfNeeded(this.options.rawResult, columnNames, result);
        }
      } while (result != null);
    }
    resetSync() {
      const result = this.statement.resetSync(this.database);
      this.isStepCalled = false;
      return result;
    }
    popFirstRowValues() {
      if (this.firstRowValues != null) {
        const firstRowValues = this.firstRowValues;
        this.firstRowValues = null;
        return firstRowValues.length > 0 ? firstRowValues : null;
      }
      return null;
    }
    getColumnNamesSync() {
      if (this.columnNames == null) {
        this.columnNames = this.statement.getColumnNamesSync();
      }
      return this.columnNames;
    }
  }
  function composeRowIfNeeded(rawResult, columnNames, columnValues) {
    return rawResult ? columnValues // T would be a ValuesOf<> from caller
    : (0, _paramUtils.composeRow)(columnNames, columnValues);
  }
  function composeRowsIfNeeded(rawResult, columnNames, columnValuesList) {
    return rawResult ? columnValuesList // T[] would be a ValuesOf<>[] from caller
    : (0, _paramUtils.composeRows)(columnNames, columnValuesList);
  }
  //#endregion
},973,[974]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.normalizeParams = normalizeParams;
  exports.composeRow = composeRow;
  exports.composeRows = composeRows;
  exports.normalizeStorageIndex = normalizeStorageIndex;
  /**
   * Normalize the bind params to data structure that can be passed to native module.
   * The data structure is a tuple of [primitiveParams, blobParams, shouldPassAsArray].
   * @hidden
   */
  function normalizeParams(...params) {
    let bindParams = params.length > 1 ? params : params[0];
    if (bindParams == null) {
      bindParams = [];
    }
    if (typeof bindParams !== 'object' || bindParams instanceof ArrayBuffer || ArrayBuffer.isView(bindParams)) {
      bindParams = [bindParams];
    }
    const shouldPassAsArray = Array.isArray(bindParams);
    if (Array.isArray(bindParams)) {
      bindParams = bindParams.reduce((acc, value, index) => {
        acc[index] = value;
        return acc;
      }, {});
    }
    const primitiveParams = {};
    const blobParams = {};
    for (const key in bindParams) {
      const value = bindParams[key];
      if (value instanceof Uint8Array) {
        blobParams[key] = value;
      } else {
        primitiveParams[key] = value;
      }
    }
    return [primitiveParams, blobParams, shouldPassAsArray];
  }
  /**
   * Compose `columnNames` and `columnValues` to an row object.
   * @hidden
   */
  function composeRow(columnNames, columnValues) {
    // TODO(cedric): make these types more generic and tighten the returned object type based on provided column names/values
    const row = {};
    if (columnNames.length !== columnValues.length) {
      throw new Error(`Column names and values count mismatch. Names: ${columnNames.length}, Values: ${columnValues.length}`);
    }
    for (let i = 0; i < columnNames.length; i++) {
      row[columnNames[i]] = columnValues[i];
    }
    return row;
  }
  /**
   * Compose `columnNames` and `columnValuesList` to an array of row objects.
   * @hidden
   */
  function composeRows(columnNames, columnValuesList) {
    if (columnValuesList.length === 0) {
      return [];
    }
    if (columnNames.length !== columnValuesList[0].length) {
      // We only check the first row because SQLite returns the same column count for all rows.
      throw new Error(`Column names and values count mismatch. Names: ${columnNames.length}, Values: ${columnValuesList[0].length}`);
    }
    const results = [];
    for (const columnValues of columnValuesList) {
      // TODO(cedric): make these types more generic and tighten the returned object type based on provided column names/values
      const row = {};
      for (let i = 0; i < columnNames.length; i++) {
        row[columnNames[i]] = columnValues[i];
      }
      results.push(row);
    }
    return results;
  }
  /**
   * Normalize the index for the Storage.getKeyByIndexSync and Storage.getKeyByIndexAsync methods.
   * @returns The normalized index or `null` if the index is out of bounds.
   * @hidden
   */
  function normalizeStorageIndex(index) {
    const value = Math.floor(Number(index));
    // Boundary checks
    if (Object.is(value, -0)) {
      return 0;
    }
    if (!Number.isSafeInteger(value)) {
      // Chromium uses zero index when the index is out of bounds
      return 0;
    }
    if (value < 0) {
      return null;
    }
    return value;
  }
},974,[]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  function _interopDefault(e) {
    return e && e.__esModule ? e : {
      default: e
    };
  }
  exports.createDatabasePath = createDatabasePath;
  var _ExpoSQLite = require(_dependencyMap[0]);
  var ExpoSQLite = _interopDefault(_ExpoSQLite);
  /**
   * Resolves the database directory from the given directory or the default directory.
   *
   * @hidden
   */
  function resolveDbDirectory(directory) {
    const resolvedDirectory = directory ?? ExpoSQLite.default.defaultDatabaseDirectory;
    if (resolvedDirectory == null) {
      throw new Error('Both provided directory and defaultDatabaseDirectory are null.');
    }
    return resolvedDirectory;
  }
  /**
   * Creates a normalized database path by combining the directory and database name.
   *
   * Ensures the directory does not end with a trailing slash and the database name
   * does not start with a leading slash, preventing redundant slashes in the final path.
   *
   * @hidden
   */
  function createDatabasePath(databaseName, directory) {
    if (databaseName === ':memory:') return databaseName;
    const resolvedDirectory = resolveDbDirectory(directory);
    function removeTrailingSlash(path) {
      return path.replace(/\/*$/, '');
    }
    function removeLeadingSlash(path) {
      return path.replace(/^\/+/, '');
    }
    return `${removeTrailingSlash(resolvedDirectory)}/${removeLeadingSlash(databaseName)}`;
  }
},975,[968]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  const _excluded = ["children", "onError", "useSuspense"];
  /**
   * Create a context for the SQLite database
   */
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  function _interopDefault(e) {
    return e && e.__esModule ? e : {
      default: e
    };
  }
  Object.defineProperty(exports, "SQLiteProvider", {
    enumerable: true,
    get: function () {
      return SQLiteProvider;
    }
  });
  exports.useSQLiteContext = useSQLiteContext;
  exports.importDatabaseFromAssetAsync = importDatabaseFromAssetAsync;
  exports.deepEqual = deepEqual;
  var _babelRuntimeHelpersObjectWithoutPropertiesLoose = require(_dependencyMap[0]);
  var _objectWithoutPropertiesLoose = _interopDefault(_babelRuntimeHelpersObjectWithoutPropertiesLoose);
  var _expoAsset = require(_dependencyMap[1]);
  var _react = require(_dependencyMap[2]);
  var _ExpoSQLite = require(_dependencyMap[3]);
  var ExpoSQLite = _interopDefault(_ExpoSQLite);
  var _SQLiteDatabase = require(_dependencyMap[4]);
  var _pathUtils = require(_dependencyMap[5]);
  var _reactJsxRuntime = require(_dependencyMap[6]);
  const SQLiteContext = /*#__PURE__*/(0, _react.createContext)(null);
  /**
   * Context.Provider component that provides a SQLite database to all children.
   * All descendants of this component will be able to access the database using the [`useSQLiteContext`](#usesqlitecontext) hook.
   */
  const SQLiteProvider = /*#__PURE__*/(0, _react.memo)(function SQLiteProvider(_ref) {
    let {
        children,
        onError,
        useSuspense = false
      } = _ref,
      props = (0, _objectWithoutPropertiesLoose.default)(_ref, _excluded);
    if (onError != null && useSuspense) {
      throw new Error('Cannot use `onError` with `useSuspense`, use error boundaries instead.');
    }
    if (useSuspense) {
      return /*#__PURE__*/(0, _reactJsxRuntime.jsx)(SQLiteProviderSuspense, Object.assign({}, props, {
        children: children
      }));
    }
    return /*#__PURE__*/(0, _reactJsxRuntime.jsx)(SQLiteProviderNonSuspense, Object.assign({}, props, {
      onError: onError,
      children: children
    }));
  }, (prevProps, nextProps) => prevProps.databaseName === nextProps.databaseName && deepEqual(prevProps.options, nextProps.options) && deepEqual(prevProps.assetSource, nextProps.assetSource) && prevProps.directory === nextProps.directory && prevProps.onInit === nextProps.onInit && prevProps.onError === nextProps.onError && prevProps.useSuspense === nextProps.useSuspense);
  /**
   * A global hook for accessing the SQLite database across components.
   * This hook should only be used within a [`<SQLiteProvider>`](#sqliteprovider) component.
   *
   * @example
   * ```tsx
   * export default function App() {
   *   return (
   *     <SQLiteProvider databaseName="test.db">
   *       <Main />
   *     </SQLiteProvider>
   *   );
   * }
   *
   * export function Main() {
   *   const db = useSQLiteContext();
   *   console.log('sqlite version', db.getFirstSync('SELECT sqlite_version()'));
   *   return <View />
   * }
   * ```
   */
  function useSQLiteContext() {
    const context = (0, _react.useContext)(SQLiteContext);
    if (context == null) {
      throw new Error('useSQLiteContext must be used within a <SQLiteProvider>');
    }
    return context;
  }
  let databaseInstance = null;
  function SQLiteProviderSuspense({
    databaseName,
    directory,
    options,
    assetSource,
    children,
    onInit
  }) {
    const databasePromise = getDatabaseAsync({
      databaseName,
      directory,
      options,
      assetSource,
      onInit
    });
    const database = use(databasePromise);
    return /*#__PURE__*/(0, _reactJsxRuntime.jsx)(SQLiteContext.Provider, {
      value: database,
      children: children
    });
  }
  function SQLiteProviderNonSuspense({
    databaseName,
    directory,
    options,
    assetSource,
    children,
    onInit,
    onError
  }) {
    const databaseRef = (0, _react.useRef)(null);
    const [loading, setLoading] = (0, _react.useState)(true);
    const [error, setError] = (0, _react.useState)(null);
    (0, _react.useEffect)(() => {
      async function setup() {
        try {
          const db = await openDatabaseWithInitAsync({
            databaseName,
            directory,
            options,
            assetSource,
            onInit
          });
          databaseRef.current = db;
          setLoading(false);
        } catch (e) {
          setError(e);
        }
      }
      async function teardown(db) {
        try {
          await db?.closeAsync();
        } catch (e) {
          setError(e);
        }
      }
      setup();
      return () => {
        const db = databaseRef.current;
        teardown(db);
        databaseRef.current = null;
        setLoading(true);
      };
    }, [databaseName, directory, options, onInit]);
    if (error != null) {
      const handler = onError ?? (e => {
        throw e;
      });
      handler(error);
    }
    if (loading || !databaseRef.current) {
      return null;
    }
    return /*#__PURE__*/(0, _reactJsxRuntime.jsx)(SQLiteContext.Provider, {
      value: databaseRef.current,
      children: children
    });
  }
  function getDatabaseAsync({
    databaseName,
    directory,
    options,
    assetSource,
    onInit
  }) {
    if (databaseInstance?.promise != null && databaseInstance?.databaseName === databaseName && databaseInstance?.directory === directory && databaseInstance?.options === options && databaseInstance?.onInit === onInit) {
      return databaseInstance.promise;
    }
    let promise;
    if (databaseInstance?.promise != null) {
      promise = databaseInstance.promise.then(db => {
        db.closeAsync();
      }).then(() => {
        return openDatabaseWithInitAsync({
          databaseName,
          directory,
          options,
          assetSource,
          onInit
        });
      });
    } else {
      promise = openDatabaseWithInitAsync({
        databaseName,
        directory,
        options,
        assetSource,
        onInit
      });
    }
    databaseInstance = {
      databaseName,
      directory,
      options,
      onInit,
      promise
    };
    return promise;
  }
  async function openDatabaseWithInitAsync({
    databaseName,
    directory,
    options,
    assetSource,
    onInit
  }) {
    if (assetSource != null) {
      await importDatabaseFromAssetAsync(databaseName, assetSource, directory);
    }
    const database = await (0, _SQLiteDatabase.openDatabaseAsync)(databaseName, options, directory);
    if (onInit != null) {
      await onInit(database);
    }
    return database;
  }
  /**
   * Imports an asset database into the SQLite database directory.
   *
   * Exposed only for testing purposes.
   * @hidden
   */
  async function importDatabaseFromAssetAsync(databaseName, assetSource, directory) {
    const asset = await _expoAsset.Asset.fromModule(assetSource.assetId).downloadAsync();
    if (!asset.localUri) {
      throw new Error(`Unable to get the localUri from asset ${assetSource.assetId}`);
    }
    const path = (0, _pathUtils.createDatabasePath)(databaseName, directory);
    await ExpoSQLite.default.importAssetDatabaseAsync(path, asset.localUri, assetSource.forceOverwrite ?? false);
  }
  /**
   * Compares two objects deeply for equality.
   */
  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (a == null || b == null) {
      return false;
    }
    if (typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }
    return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => deepEqual(a[key], b[key]));
  }
  // Referenced from https://github.com/reactjs/react.dev/blob/6570e6cd79a16ac3b1a2902632eddab7e6abb9ad/src/content/reference/react/Suspense.md
  /**
   * A custom hook like [`React.use`](https://react.dev/reference/react/use) hook using private Suspense implementation.
   */
  function use(promise) {
    if (isReactUsePromise(promise)) {
      if (promise.status === 'fulfilled') {
        if (promise.value === undefined) {
          throw new Error('[use] Unexpected undefined value from promise');
        }
        return promise.value;
      } else if (promise.status === 'rejected') {
        throw promise.reason;
      } else if (promise.status === 'pending') {
        throw promise;
      }
      throw new Error('[use] Promise is in an invalid state');
    }
    const suspensePromise = promise;
    suspensePromise.status = 'pending';
    suspensePromise.then(result => {
      suspensePromise.status = 'fulfilled';
      suspensePromise.value = result;
    }, reason => {
      suspensePromise.status = 'rejected';
      suspensePromise.reason = reason;
    });
    throw suspensePromise;
  }
  function isReactUsePromise(promise) {
    return typeof promise === 'object' && promise !== null && 'status' in promise;
  }
  //#endregion
},976,[129,320,37,968,967,975,348]);