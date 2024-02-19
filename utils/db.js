const { MongoClient } = require('mongodb');
const { promisify } = require('util');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(uri);
  }

  async isAlive() {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      return this.client.isConnected();
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    const count = await this.client.db().collection('users').countDocuments();
    return count;
  }

  async nbFiles() {
    const count = await this.client.db().collection('files').countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
