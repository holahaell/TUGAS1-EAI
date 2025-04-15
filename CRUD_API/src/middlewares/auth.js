const UserModel = require('../models/userModel');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header missing or invalid');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const user = await UserModel.findByToken(token);
    
    if (!user) {
      throw new Error('Authentication failed');
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
