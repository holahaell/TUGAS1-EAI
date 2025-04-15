// In-memory storage
let tasks = [];
let taskIdCounter = 1;

class TaskModel {
  static async createTask(taskData, userId) {
    const newTask = {
      id: taskIdCounter++,
      description: taskData.description,
      completed: taskData.completed || false,
      owner: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    tasks.push(newTask);
    return newTask;
  }

  static async findById(taskId) {
    return tasks.find(task => task.id === parseInt(taskId));
  }

  static async findByIdAndOwner(taskId, userId) {
    return tasks.find(
      task => task.id === parseInt(taskId) && task.owner === userId
    );
  }

  static async findAllByOwner(userId) {
    return tasks.filter(task => task.owner === userId);
  }

  static async updateTask(taskId, userId, updates) {
    const taskIndex = tasks.findIndex(
      t => t.id === parseInt(taskId) && t.owner === userId
    );
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    // Update fields
    Object.keys(updates).forEach(field => {
      if (field in tasks[taskIndex]) {
        tasks[taskIndex][field] = updates[field];
      }
    });

    tasks[taskIndex].updatedAt = new Date();
    
    return tasks[taskIndex];
  }

  static async deleteTask(taskId, userId) {
    const taskIndex = tasks.findIndex(
      t => t.id === parseInt(taskId) && t.owner === userId
    );
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const deletedTask = tasks[taskIndex];
    tasks = tasks.filter(t => !(t.id === parseInt(taskId) && t.owner === userId));
    
    return deletedTask;
  }

  static async deleteAllByOwner(userId) {
    const userTasks = tasks.filter(t => t.owner === userId);
    tasks = tasks.filter(t => t.owner !== userId);
    return userTasks;
  }
}

module.exports = TaskModel;
