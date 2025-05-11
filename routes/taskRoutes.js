const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskSummaryByProject,
  getOverdueTasks
} = require('../controllers/taskController');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, createTask);
router.get('/project/:projectId', protect, getTasksByProject);
router.get('/analytics/task-summary', protect, getTaskSummaryByProject);
router.get('/analytics/overdue', protect, getOverdueTasks);
router
  .route('/:id')
  .get(protect, getTaskById)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

module.exports = router;
