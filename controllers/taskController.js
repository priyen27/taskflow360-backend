const Task = require('../models/Task');
const Project = require("../models/Project");

// @desc Create a task
exports.createTask = async (req, res) => {
  const { title, description, status, dueDate, project, assignee } = req.body;

  if (!title || !project) {
    return res.status(400).json({ message: 'Title and project are required' });
  }

  const projectDoc = await Project.findById(project);
  if (!projectDoc) return res.status(404).json({ message: 'Project not found' });

  // Only allow admins to assign tasks
  if (assignee && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can assign tasks' });
  }

  const task = await Task.create({
    title,
    description,
    status,
    dueDate,
    project,
    assignee: assignee || null,
    createdBy: req.user._id,
  });

  res.status(201).json(task);
};



// @desc Get all tasks for a project
exports.getTasksByProject = async (req, res) => {
  const { projectId } = req.params;

  let filter = { project: projectId };

  if (req.user.role === 'member') {
    filter.assignee = req.user._id;
  }

  const tasks = await Task.find(filter);

  res.json(tasks);
};


// @desc Get single task by ID
exports.getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const isAdmin = req.user.role === 'admin';
  const isAssignee = task.assignee?.toString() === req.user._id.toString();

  if (!isAdmin && !isAssignee) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  res.json(task);
};

// @desc Update a task
exports.updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const isAdmin = req.user.role === 'admin';
  const isCreator = task.createdBy.toString() === req.user._id.toString();
  const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();

  // Check if user has permission to update
  if (!isAdmin && !isCreator && !isAssignee) {
    return res.status(403).json({ message: 'Not authorized to update this task' });
  }

  const { title, description, status, dueDate, assignee } = req.body;

  // If user is assignee (but not admin/creator), they can only update status
  if (isAssignee && !isAdmin && !isCreator) {
    task.status = status || task.status;
  } else {
    // Admin or creator can update all fields
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.dueDate = dueDate || task.dueDate;
    
    // Only admin can reassign
    if (assignee && isAdmin) {
      task.assignee = assignee;
    }
  }

  const updated = await task.save();
  res.json(updated);
};

// @desc Delete a task
exports.deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const isAdmin = req.user.role === 'admin';
  const isAssignee = task.assignee?.toString() === req.user._id.toString();

  if (!isAdmin && !isAssignee) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted' });
};

