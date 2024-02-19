const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');

class AuthController {
  async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credential = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credential, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    const hashedPassword = sha1(password);

    const query = {
      email: email,
      password: hashedPassword,
    };
    const user = await dbClient.client.db().collection('users').findOne(query);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    try {
      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 3600);
      res.status(200).json({ token });
    } catch (error) {
      console.error('Error generating token:', error);
      res.status(500).json({ error: 'Internal Server Error' });

    }
  }
  async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user_id = await redisClient.get(`auth_${token}`);
    if (!user_id) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    await redisClient.del(`auth_${token}`);
    res.status(204).send();
  }
}

module.exports = new AuthController();
