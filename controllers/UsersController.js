const sha1 = require('sha1');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { ObjectId } = require('mongodb');

class UsersController {
  async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existsUser = await dbClient.client.db().collection('users').findOne({ email: email });
    if (existsUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = {
      email: email,
      password: hashedPassword,
    };

    const result = await dbClient.client.db().collection('users').insertOne(newUser);
    const insertedId = result.insertedId;
    res.status(201).json({ id: insertedId, email: newUser.email });
  }

  async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.client.db().collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    res.status(200).json({ id: user._id.toString(), email: user.email });
  }

}
module.exports = new UsersController();
