const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middlewares/auth');

// All task routes require authentication
router.use(auth);

// 10. POST Add Task
router.post('/', taskController.createTask);

// 11. GET Get All Tasks
router.get('/', taskController.getAllTasks);

// 12. GET Get Task by Id
router.get('/:id', taskController.getTaskById);

// Additional routes for CRUD operations
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;