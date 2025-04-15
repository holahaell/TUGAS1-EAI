// Simple in-memory file storage for prototype
class FileStorage {
    constructor() {
      this.storage = new Map();
    }
  
    store(key, data) {
      this.storage.set(key, data);
      return key;
    }
  
    retrieve(key) {
      return this.storage.get(key);
    }
  
    delete(key) {
      return this.storage.delete(key);
    }
  }
  
  module.exports = new FileStorage();