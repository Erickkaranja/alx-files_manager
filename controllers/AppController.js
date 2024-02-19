const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AppController {
  async getStatus(req, res) {
    const redisAlive = await redisClient.isAlive();
    const dbAlive = await dbClient.isAlive();
    if (redisAlive && dbAlive) {
      res.status(200).json({ redis: redisAlive, db: dbAlive });
    }
    else {
      res.status(400).json({ error: 'not connected' });
    }
  }
  async getStats(req, res) {
    const numUsers = await dbClient.nbUsers();
    const numFiles = await dbClient.nbFiles();

    res.status(200).json({ users: numUsers, files: numFiles });
  }

}
module.exports = new AppController();
