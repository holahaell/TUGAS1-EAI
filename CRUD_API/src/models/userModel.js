const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory storage
let users = [];
let userIdCounter = 1;

const JWT_SECRET = 'your-secret-key-for-prototype';

class UserModel {
  static async createUser(userData) {
    // Check if email already exists
    const existingUser = users.find(user => user.email === userData.email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 8);

    // Create new user
    const newUser = {
      id: userIdCounter++,
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      age: userData.age || 0,
      avatar: null,
      tokens: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);
    return newUser;
  }

  static async generateAuthToken(user) {
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    // Find user and add token
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].tokens.push({ token });
      return token;
    }
    
    throw new Error('User not found');
  }

  static async findByCredentials(email, password) {
    const user = users.find(user => user.email === email);
    if (!user) {
      throw new Error('Unable to login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Unable to login');
    }

    return user;
  }

  static async findById(id) {
    return users.find(user => user.id === parseInt(id));
  }

  static async findByToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return users.find(user => 
        user.id === decoded.id && 
        user.tokens.some(t => t.token === token)
      );
    } catch (error) {
      return null;
    }
  }

  static async updateUser(userId, updates) {
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = users[userIndex];
    
    // Update fields
    Object.keys(updates).forEach(field => {
      if (field === 'password') {
        // Don't update password here - handled separately
      } else if (field in user) {
        user[field] = updates[field];
      }
    });

    // Handle password update
    if (updates.password) {
      user.password = await bcrypt.hash(updates.password, 8);
    }

    user.updatedAt = new Date();
    users[userIndex] = user;
    
    return user;
  }

  static async saveAvatar(userId, avatarBuffer) {
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex].avatar = avatarBuffer;
    users[userIndex].updatedAt = new Date();
    
    return users[userIndex];
  }

  static async getAvatar(userId) {
    const user = users.find(u => u.id === parseInt(userId));
    
    if (!user || !user.avatar) {
      throw new Error('Avatar not found');
    }
    
    return user.avatar;
  }

  static async removeToken(userId, tokenToRemove) {
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex].tokens = users[userIndex].tokens.filter(
      t => t.token !== tokenToRemove
    );
    
    return users[userIndex];
  }

  static async deleteUser(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const deletedUser = users[userIndex];
    users = users.filter(u => u.id !== userId);
    
    return deletedUser;
  }

  static async deleteAvatar(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex].avatar = null;
    
    return users[userIndex];
  }

  // Helper to sanitize user object (remove sensitive data)
  static sanitizeUser(user) {
    if (!user) return null;
    
    const { password, tokens, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = UserModel;
