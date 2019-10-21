'use strict';

const fetch = typeof this.window !== 'undefined' ? window.fetch : require('node-fetch');

class KVdb {
  constructor() {
    throw 'call KVdb.bucket(...) instead'
  }

  static bucket(id, access_token) {
    return new Bucket(id, access_token)
  }
}

KVdb.BASE_URL = 'https://kvdb.io'

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
}

function checkStatus(res) {
  if(res.ok) {
    return res;
  } else {
    throw Error(`${res.status} - ${res.statusText}`)
  }
}

if(typeof module !== 'undefined') module.exports = {KVdb: KVdb, Bucket: Bucket}
