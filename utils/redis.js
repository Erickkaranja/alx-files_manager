const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.error(err.message);
    });
  }

  isAlive() {
    return this.client.ready;
  }

  async get(key) {
    const asyncget = promisify(this.client.get).bind(this.client);
    const val = await asyncget(key);
    return val;
  }

  async set(key, value, durationInSeconds) {
    const asyncset = promisify(this.client.setex).bind(this.client);
    await asyncset(key, durationInSeconds, value);
  }

  async del(key) {
    const asyncdel = promisify(this.client.del).bind(this.client);
    await asyncdel(key);
  }
}
const redisClient = new RedisClient();
module.exports = redisClient;
