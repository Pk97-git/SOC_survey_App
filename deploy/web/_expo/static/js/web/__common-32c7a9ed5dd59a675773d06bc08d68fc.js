__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.sendWorkerResult = sendWorkerResult;
  exports.workerMessageHandler = workerMessageHandler;
  exports.invokeWorkerAsync = invokeWorkerAsync;
  exports.invokeWorkerSync = invokeWorkerSync;
  var _Deferred = require(_dependencyMap[0]);
  var _SyncSerializer = require(_dependencyMap[1]);
  // Copyright 2015-present 650 Industries. All rights reserved.

  let messageId = 0;
  const deferredMap = new Map();
  const PENDING = 1;
  const RESOLVED = 2;
  let hasWarnedSync = false;

  /**
   * For worker to send result to the main thread.
   */
  function sendWorkerResult({
    id,
    result,
    error,
    syncTrait
  }) {
    if (syncTrait) {
      const {
        lockBuffer,
        resultBuffer
      } = syncTrait;
      const lock = new Int32Array(lockBuffer);
      const resultArray = new Uint8Array(resultBuffer);
      const resultJson = error != null ? (0, _SyncSerializer.serialize)({
        error
      }) : (0, _SyncSerializer.serialize)({
        result
      });
      const resultBytes = new TextEncoder().encode(resultJson);
      const length = resultBytes.length;
      resultArray.set(new Uint32Array([length]), 0);
      resultArray.set(resultBytes, 4);
      Atomics.store(lock, 0, RESOLVED);
    } else {
      if (result) {
        self.postMessage({
          id,
          result
        });
      } else {
        self.postMessage({
          id,
          error
        });
      }
    }
  }

  /**
   * For main thread to handle worker messages.
   */
  function workerMessageHandler(event) {
    const {
      id,
      result,
      error,
      isSync
    } = event.data;
    if (!isSync) {
      const deferred = deferredMap.get(id);
      if (deferred) {
        if (error) {
          deferred.reject(new Error(error));
        } else {
          deferred.resolve(result);
        }
        deferredMap.delete(id);
      }
    }
  }

  /**
   * For main thread to invoke worker function asynchronously.
   */
  async function invokeWorkerAsync(worker, type, data) {
    const id = messageId++;
    const deferred = new _Deferred.Deferred();
    deferredMap.set(id, deferred);
    worker.postMessage({
      type,
      id,
      data,
      isSync: false
    });
    return deferred.getPromise();
  }

  /**
   * For main thread to invoke worker function synchronously.
   */
  function invokeWorkerSync(worker, type, data) {
    const id = messageId++;
    const lockBuffer = new SharedArrayBuffer(4);
    const lock = new Int32Array(lockBuffer);
    const resultBuffer = new SharedArrayBuffer(1048576);
    const resultArray = new Uint8Array(resultBuffer);
    Atomics.store(lock, 0, PENDING);
    worker.postMessage({
      type,
      id,
      data,
      isSync: true,
      lockBuffer,
      resultBuffer
    });
    let i = 0;
    // @ts-expect-error: Remove this when TypeScript supports Atomics.pause
    const useAtomicsPause = typeof Atomics.pause === 'function';
    while (Atomics.load(lock, 0) === PENDING) {
      ++i;
      if (useAtomicsPause) {
        if (i > 1_000_000) {
          throw new Error('Sync operation timeout');
        }
        // @ts-expect-error: Remove this when TypeScript supports Atomics.pause
        Atomics.pause();
      } else {
        // NOTE(kudo): Unfortunate for the busy loop,
        // because we don't have a way for main thread to yield its execution to other callbacks.
        if (i > 1000_000_000) {
          throw new Error('Sync operation timeout');
        }
      }
    }
    const length = new Uint32Array(resultArray.buffer, 0, 1)[0];
    const resultCopy = new Uint8Array(length);
    resultCopy.set(new Uint8Array(resultArray.buffer, 4, length));
    const resultJson = new TextDecoder().decode(resultCopy);
    const {
      result,
      error
    } = (0, _SyncSerializer.deserialize)(resultJson);
    if (error) throw new Error(error);
    return result;
  }
},964,[965,966]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  Object.defineProperty(exports, "Deferred", {
    enumerable: true,
    get: function () {
      return Deferred;
    }
  });
  // Copyright 2015-present 650 Industries. All rights reserved.

  class Deferred {
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolveCallback = resolve;
        this.rejectCallback = reject;
      });
    }
    resolve(value) {
      this.resolveCallback(value);
    }
    reject(reason) {
      this.rejectCallback(reason);
    }
    getPromise() {
      return this.promise;
    }
  }
},965,[]);
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.serialize = serialize;
  exports.deserialize = deserialize;
  // Copyright 2015-present 650 Industries. All rights reserved.

  const UINT8ARRAY_TYPE = '__uint8array__';
  function isUint8ArrayMarker(value) {
    return value !== null && typeof value === 'object' && UINT8ARRAY_TYPE in value && Array.isArray(value.data);
  }

  /**
   * Serializes a value to a string that supports Uint8Arrays.
   */
  function serialize(value) {
    return JSON.stringify(value, (_, v) => {
      if (v instanceof Uint8Array) {
        return {
          [UINT8ARRAY_TYPE]: true,
          data: Array.from(v)
        };
      }
      return v;
    });
  }

  /**
   * Deserializes a string to value that supports Uint8Arrays.
   */
  function deserialize(json) {
    return JSON.parse(json, (_, value) => {
      if (isUint8ArrayMarker(value)) {
        return new Uint8Array(value.data);
      }
      return value;
    });
  }
},966,[]);