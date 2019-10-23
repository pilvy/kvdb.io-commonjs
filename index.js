'use strict';
(function(global, factory) {
  factory = factory.bind(global)
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : (global.KVdb = factory())
}(this, (function() { 'user strict';
const fetch = typeof this.window !== 'undefined' ? window.fetch : require('node-fetch');

let KVdb

class Bucket {
  constructor(id, access_token) {
    this.id = id
    this.access_token = access_token
  }

  _fetchParams(opts) {
    opts = opts || {}
    const params = {
      headers: {
        'Accept': 'application/json'
      }
    }
    if(this.access_token) params.headers['Authorization'] = `Bearer ${this.access_token}`
    if(opts.type) params.headers['Content-Type'] = opts.type
    return params
  }

  async get(key) {
    return fetch(`${KVdb.BASE_URL}/${this.id}/${key}`, this._fetchParams())
      .then(checkStatus)
      .then(res => res.text())
  }

  async set(key, value, opts) {
    return fetch(`${KVdb.BASE_URL}/${this.id}/${key}`, {...this._fetchParams(opts), method: 'PUT', body: value})
      .then(checkStatus)
      .then(res => res.text())
  }

  async incr(key, increment) {
    if(increment > 0) increment = '+' + increment;
    return fetch(`${KVdb.BASE_URL}/${this.id}/${key}`, {...this._fetchParams(), method: 'PATCH', body: increment})
      .then(checkStatus)
      .then(res => res.text())
  }

  async delete(key) {
    return fetch(`${KVdb.BASE_URL}/${this.id}/${key}`, {...this._fetchParams(), method: 'DELETE'})
      .then(res => res.text())
  }

  async list(opts) {
    opts = opts || {}
    const params = new URLSearchParams();

    if(opts.skip) params.append('skip', opts.skip);
    if(opts.limit) params.append('limit', opts.limit);
    if(opts.prefix) params.append('prefix', opts.prefix);
    if(opts.reverse) params.append('reverse', 'true');
    if(opts.values) params.append('values', 'true');
    params.append('format', 'json');

    return fetch(`${KVdb.BASE_URL}/${this.id}/?${params.toString()}`, this._fetchParams())
      .then(checkStatus)
      .then(res => res.json())
  }

  async accessToken(opts) {
    opts = opts || {}
    const params = new URLSearchParams();

    if(opts.prefix) params.append('prefix', opts.prefix);
    if(opts.permissions && opts.permissions instanceof Array) params.append('permissions', opts.permissions.join(','));
    if(opts.ttl) params.append('ttl', opts.ttl);

    return fetch(`${KVdb.BASE_URL}/${this.id}/tokens/`, {...this._fetchParams({type: 'application/x-www-form-urlencoded'}), method: 'POST', body: params.toString()})
      .then(checkStatus)
      .then(res => res.json())
      .then(res => res.access_token)
  }

  localStorage(opts) {
    return new KVdbWebStorage(this)
  }
}

function checkStatus(res) {
  if(res.ok) {
    return res;
  } else {
    throw Error(`${res.status} - ${res.statusText}`)
  }
}

// Emulate Web Storage API (experimental)
class KVdbWebStorage {
  constructor(bucket) {
    this.bucket = bucket
  }

  // When passed a number n, this method will return the name of the nth key in the storage.
  async key(index) {
    return this.bucket.list({skip: index, limit: 1})
      .then(keyName => keyName)
      .catch(err => null)
  }

  // When passed a key name, will return that key's value.
  async getItem(keyName) {
    return this.bucket.get(keyName)
      .then(keyValue => keyValue)
      .catch(err => null)
  }

  // When passed a key name and value, will add that key to the storage, or update that key's value if it already exists.
  async setItem(keyName, keyValue) {
    return this.bucket.set(keyName, keyValue)
  }

  // When passed a key name, will remove that key from the storage.
  async removeItem(keyName) {
    return this.bucket.delete(keyName)
  }

  // Returns an integer representing the number of data items stored in the Storage object.
  async length() {
    return this.bucket.list()
      .then(keys => keys.length)
      .catch(err => -1)
  }

  // When invoked, will empty all keys out of the storage.
  async clear() {
    const keys = await this.bucket.list()
    const waiting = keys.map(key => this.bucket.delete(key))
    return Promise.all(waiting)
  }
}

function executeCallback(promise, callback) {
  if(callback) {
    promise.then(
      function(result) {
        callback(null, result);
      },
      function(error) {
        callback(error);
      }
    );
  }
}

let localForageDriver = {}

function getLocalForageDriver(localforage) {
  localForageDriver = {
    _driver: KVdb.LOCALFORAGE_DRIVER,
    _support: true,
    _initStorage: function(options) {
      this.bucket = options.bucket
      var dbInfo = {}
      dbInfo.serializer = localforage.getSerializer()
      this._dbInfo = dbInfo
      return Promise.resolve()
    },
    async clear(callback) {
      const bucket = this._config.bucket

      const promise = bucket.list()
        .then(keys => keys.map(key => bucket.delete(key)))
        .then(deletes => Promise.all(deletes))

      executeCallback(promise, callback)
      return promise
    },
    async getItem(key, callback) {
      const bucket = this._config.bucket
      const dbInfo = this._dbInfo

      const promise = Promise.all([bucket.get(key), dbInfo.serializer])
        .then(([value, serializer]) => serializer.deserialize(value))

      executeCallback(promise, callback)
      return promise
    },
    async iterate(iterator, callback) {
      const bucket = this._config.bucket
      const dbInfo = this._dbInfo

      const promise = Promise.all([bucket.list({values: true}), dbInfo.serializer])
        .then(([keyValues, serializer]) => keyValues.map(([k, v]) => [k, serializer.deserialize(v)]))
        .then(keyValues => {
          let i = 1
          for(let [key, value] of keyValues) {
            const res = iterator(value, key, i++)
            if(res !== void 0) {
              return res
            }
          }
        })

      executeCallback(promise, callback)
      return promise
    },
    async key(n, callback) {
      const bucket = this._config.bucket
      const dbInfo = this._dbInfo

      const promise = Promise.all([bucket.list({skip: index, limit: 1}), dbInfo.serializer])
        .then(([value, serializer]) => serializer.deserialize(value))

      executeCallback(promise, callback)
      return promise
    },
    async keys(callback) {
      const bucket = this._config.bucket

      const promise = bucket.list()
        .then(keys => keys)

      executeCallback(promise, callback)
      return promise
    },
    async length(callback) {
      const bucket = this._config.bucket

      const promise = bucket.list()
        .then(keys => keys.length)

      executeCallback(promise, callback)
      return promise
    },
    async removeItem(key, callback) {
      const bucket = this._config.bucket

      const promise = bucket.delete(key)

      executeCallback(promise, callback)
      return promise
    },
    async setItem(key, value, callback) {
      const bucket = this._config.bucket
      const dbInfo = this._dbInfo

      const originalValue = value
      const promise = dbInfo.serializer
        .then(serializer => {
          return new Promise((resolve, reject) => {
            serializer.serialize(value, (value, err) => {
              if(err) return reject(err)

              return resolve(value)
            })
          })
        })
        .then(newValue => bucket.set(key, newValue, {type: 'application/json'}))
        .then(() => originalValue)

      executeCallback(promise, callback)
      return promise
    },
  }
  localforage.defineDriver(localForageDriver)
  return localForageDriver
}

  KVdb = {
    BASE_URL: 'https://kvdb.io',
    LOCALFORAGE_DRIVER: 'localForageDriver',
    bucket: (id, access_token) => new Bucket(id, access_token),
    Bucket: Bucket,
    WebStorage: KVdbWebStorage,
    installLocalForageDriver: getLocalForageDriver,
  }

  return KVdb
}))); // end of UMD
