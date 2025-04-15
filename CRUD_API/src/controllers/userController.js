const multer = require('multer');
const UserModel = require('../models/userModel');
const TaskModel = require('../models/taskModel');

// Multer setup for file uploads
const upload = multer({
  limits: {
    fileSize: 1000000 // 1MB max file size
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload an image file (jpg, jpeg or png)'));
    }
    cb(null, true);
  }
}).single('avatar');

const registerUser = async (req, res) => {
  try {
    const user = await UserModel.createUser(req.body);
    const token = await UserModel.generateAuthToken(user);
    res.status(201).send({ 
      user: UserModel.sanitizeUser(user), 
      token 
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const user = await UserModel.findByCredentials(req.body.email, req.body.password);
    const token = await UserModel.generateAuthToken(user);
    res.send({ 
      user: UserModel.sanitizeUser(user), 
      token 
    });
  } catch (error) {
    res.status(400).send({ error: 'Login failed. Check your email and password.' });
  }
};

const logoutUser = async (req, res) => {
  try {
    await UserModel.removeToken(req.user.id, req.token);
    res.send({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  res.send(UserModel.sanitizeUser(req.user));
};

const updateUserProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password', 'age'];
  
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  
  try {
    const updatedUser = await UserModel.updateUser(req.user.id, req.body);
    res.send(UserModel.sanitizeUser(updatedUser));
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const uploadAvatar = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }
    
    try {
      if (!req.file) {
        throw new Error('Please upload a file');
      }
      
      await UserModel.saveAvatar(req.user.id, req.file.buffer);
      res.send({ message: 'Avatar uploaded successfully' });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });
};

const getUserAvatar = async (req, res) => {
  try {
    const avatar = await UserModel.getAvatar(req.params.id);
    
    res.set('Content-Type', 'image/jpeg');
    res.send(avatar);
  } catch (error) {
    res.status(404).send({ error: 'Avatar not found' });
  }
};

const deleteAvatar = async (req, res) => {
  try {
    await UserModel.deleteAvatar(req.user.id);
    res.send({ message: 'Avatar deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    // Delete all user tasks first
    await TaskModel.deleteAllByOwner(req.user.id);
    
    // Then delete the user
    await UserModel.deleteUser(req.user.id);
    
    res.send({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserAvatar,
  deleteAvatar,
  deleteUser
};
