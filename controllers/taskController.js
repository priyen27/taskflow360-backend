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

exports.getTaskSummaryByProject = async (req, res) => {
  const summary = await Task.aggregate([
    { $match: { createdBy: req.user._id } },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in progress"] }, 1, 0] } },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "_id",
        as: "project"
      }
    },
    { $unwind: "$project" },
    {
      $project: {
        _id: 0,
        projectId: "$project._id",
        projectName: "$project.name",
        total: 1,
        todo: 1,
        inProgress: 1,
        done: 1
      }
    }
  ]);
  res.json(summary);
};

exports.getOverdueTasks = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    const matchConditions = [
      { dueDate: { $lt: new Date() } },
      { status: { $ne: 'done' } }
    ];

    if (isAdmin) {
      // Later in pipeline: match project.createdBy
    } else {
      matchConditions.push({ assignee: req.user._id });
    }

    const overdueTasks = await Task.aggregate([
      { $match: { $and: matchConditions } },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: '$project' },
      ...(isAdmin ? [
        { $match: { 'project.createdBy': req.user._id } }
      ] : []),
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          dueDate: 1,
          projectId: '$project._id',
          projectName: '$project.name'
        }
      }
    ]);

    res.status(200).json(overdueTasks);
  } catch (err) {
    console.error('Error fetching overdue tasks:', err);
    res.status(500).json({ message: 'Failed to fetch overdue tasks' });
  }
};
