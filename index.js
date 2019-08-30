'use strict';

const fetch = typeof this.window !== 'undefined' ? window.fetch : require('node-fetch');

class KVdb {
  static BASE_URL = 'https://kvdb.io'

  constructor() {
    throw 'call KVdb.bucket(...) instead'
  }

  static bucket(id, access_token) {
    return new Bucket(id, access_token)
  }
}

class Bucket {
  constructor(id, access_token) {
    this.id = id
    this.access_token = access_token
  }

  _fetchParams() {
    const params = {
      headers: {
        'User-Agent': 'node-kvdb',
      }
    }
    if(this.access_token) params.headers['Authorization'] = `Bearer ${this.access_token}`
    return params
  }

  async get(key) {
    return fetch(`${KVdb.BASE_URL}/${this.id}/${key}`, this._fetchParams())
      .then(checkStatus)
      .then(res => res.text())
  }

  async set(key, value) {
    return fetch(`${KVdb.BASE_URL}/${this.id}/${key}`, {...this._fetchParams(), method: 'PUT', body: value})
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

    if(opts.limit) params.append('limit', opts.limit);
    if(opts.prefix) params.append('prefix', opts.prefix);
    if(opts.values) params.append('values', 'true');
    params.append('format', 'json');

    return fetch(`${KVdb.BASE_URL}/${this.id}/?${params.toString()}`)
      .then(checkStatus)
      .then(res => res.json())
  }
}

function checkStatus(res) {
  if(res.ok) {
    return res;
  } else {
    throw Error(res.statusText)
  }
}

module.exports = {KVdb: KVdb, Bucket: Bucket}
