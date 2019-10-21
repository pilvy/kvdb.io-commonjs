# KVdb.io JavaScript API client

API client for [KVdb.io](https://kvdb.io), a managed key-value storage service that lets you quickly build applications in the key-value domain without worrying about backend infrastructure.


## Features

* Minimal
* Async-ready and Promises-friendly
* Only a single dependency when used from node.js (node-fetch)
* Uses the Fetch API, making it compatible for use with both node.js and the browser


## Example Usage

```javascript
const { KVdb } = require('kvdb.io')

const bucket = KVdb.bucket('MY_BUCKET_ID', 'MY_ACCESS_TOKEN') // access token arg optional

const myapp = async () => {
  // set a key
  await bucket.set('users:1:flavor', 'oatmeal')

  // get a key
  let res = await bucket.get('users:1:flavor')
  console.log('flavor: ', res)

  // increment a key
  await bucket.incr('users:1:profile_views', 1)

  // list key by prefix (returns an array of keys)
  res = await bucket.list({prefix: 'users:1:'})
  console.log('keys: ', res)

  // list key-values by prefix (returns an array of [key, value] tuples)
  res = await bucket.list({prefix: 'users:1:', values: true})
  for (const [key, value] of res) {
    console.log(`key: ${key} => ${value}`)
  }

  // delete a key
  await bucket.delete('users:1:flavor')
}

myapp()
```


## License

MIT
