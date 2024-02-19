const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { ObjectId } = require('mongodb');
const mime = require('mime-types');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  async postUpload(req, res) {
    const token = req.headers['x-token'];
    const user_id = await redisClient.get(`auth_${token}`);
    if (!user_id) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { name, type, parentId=0, isPublic=false, data } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId !== 0) {
      const parentFile = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    try {
      let localPath = '';
      if (type !== 'folder') {
        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH, { recursive: true });
        }

        const fileName = uuidv4();
        localPath = path.join(FOLDER_PATH, fileName);
        const fileBuffer = Buffer.from(data, 'base64');
        fs.writeFileSync(localPath, fileBuffer);
      }

      const newFile = {
        userId: user_id,
        name,
        type,
        parentId,
        isPublic,
        localPath,
      };
      await dbClient.client.db().collection('files').insertOne(newFile);

      res.status(201).json(newFile);
    } catch (error) {
      console.error('Error creating new file:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(id), userId: userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json(file);
  }

  async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {  parentId = 0, page = 0 } = req.query;
    const skip = parseInt(page) * 20;
    const parentIdQuery = parentId !== 0 ? new ObjectId(parentId) : null;
    const pipeline = [
      { $match: { userId, parentId: parentIdQuery } },
      { $skip: skip },
      { $limit: 20 },
    ];

    const files = await dbClient.client.db().collection('files').aggregate(pipeline).toArray();

    res.json(files);
  }
  async putPublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(id), userId: userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    file.isPublic = true;
    res.status(200).json({ file });
  }

  async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(id), userId: userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    file.isPublic = false;
    res.status(200).json({ file });

  }

  async getFile(req, res) {
    const { id } = req.params;
    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(id) });
    const token = req.headers['x-token'];
    const user_id = await redisClient.get(`auth_${token}`);
    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (user_id !== file.userId)) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    const filePath = file.localPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const mimeType = mime.lookup(file.name);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.setHeader('Content-Type', mimeType);
      res.send(data);
    });
  }
}
module.exports = new FilesController();
