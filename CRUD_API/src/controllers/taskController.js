const TaskModel = require('../models/taskModel');

const createTask = async (req, res) => {
  try {
    const task = await TaskModel.createTask(req.body, req.user.id);
    res.status(201).send(task);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const getAllTasks = async (req, res) => {
  try {
    const tasks = await TaskModel.findAllByOwner(req.user.id);
    res.send(tasks);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await TaskModel.findByIdAndOwner(req.params.id, req.user.id);
    
    if (!task) {
      return res.status(404).send({ error: 'Task not found' });
    }
    
    res.send(task);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const updateTask = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['description', 'completed'];
  
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  
  try {
    const task = await TaskModel.updateTask(req.params.id, req.user.id, req.body);
    res.send(task);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    await TaskModel.deleteTask(req.params.id, req.user.id);
    res.send({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask
};
