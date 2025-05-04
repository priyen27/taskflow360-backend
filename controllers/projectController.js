const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");

// @desc Get all projects of logged-in user
exports.getProjects = async (req, res) => {
  try {
      const userId = req.user._id;
      const userRole = req.user.role;

      let projects;
      if (userRole === 'admin') {
          // Admins can see all projects
          projects = await Project.find()
              .populate('createdBy', 'name email')
              .populate('members.user', 'name email');
      } else {
          projects = await Project.find({
              $or: [
                  { createdBy: userId },
                  { 'members.user': userId }
              ]
          })
          .populate('createdBy', 'name email')
          .populate('members.user', 'name email');
      }

      res.json(projects);
  } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
};

// @desc Create new project
exports.createProject = async (req, res) => {
    const { name, description } = req.body;
  
    if (!name) return res.status(400).json({ message: 'Project name is required' });
  
    const project = await Project.create({
      name,
      description,
      members: [{ user: req.user._id, role: 'admin' }],
      createdBy: req.user._id,
    });
  
    res.status(201).json(project);
};

// @desc Update a project
exports.updateProject = async (req, res) => {
    const project = await Project.findById(req.params.id);
  
    if (!project) return res.status(404).json({ message: 'Project not found' });
  
    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
  
    project.name = req.body.name || project.name;
    project.description = req.body.description || project.description;
  
    const updated = await project.save();
    res.json(updated);
};
  
  // @desc Delete a project
exports.deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.createdBy.toString() !== req.user._id.toString()) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  // Delete all tasks related to this project
  await Task.deleteMany({ project: req.params.id });

  // Delete the project itself
  await Project.findByIdAndDelete(req.params.id);

  res.json({ message: 'Project and related tasks removed' });
};

exports.getProjectMembers = async (req, res) => {
  const project = await Project.findById(req.params.projectId).populate('members.user', 'name email _id');

  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isAuthorized =
    project.createdBy.toString() === req.user._id.toString() ||
    project.members.some((member) => member.user._id.toString() === req.user._id.toString());

  if (!isAuthorized) return res.status(403).json({ message: 'Not authorized to view members' });

  const membersWithInfo = project.members.map((m) => ({
    _id: m.user._id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));

  res.json(membersWithInfo);
};

// @desc Invite existing user to project by email
exports.inviteUserToProject = async (req, res) => {
  const { email, role } = req.body;
  const projectId = req.params.id;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Check if the requester is admin of the project
  const isAdmin = project.members.some(
    (member) =>
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
  );

  if (!isAdmin) return res.status(403).json({ message: 'Only admin can invite members' });

  // Find the user to be invited
  const userToInvite = await User.findOne({ email });
  if (!userToInvite) {
    return res.status(404).json({ message: 'User with this email not found' });
  }

  // Check if already a member
  const alreadyMember = project.members.some(
    (member) => member.user.toString() === userToInvite._id.toString()
  );
  if (alreadyMember) {
    return res.status(400).json({ message: 'User already a member of the project' });
  }

  // Add to project members
  project.members.push({ user: userToInvite._id, role: role || 'member' });
  await project.save();

  res.status(200).json({ message: 'User invited successfully' });
};

  