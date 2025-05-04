const express = require('express');
const router = express.Router();
const { createProject,
    getProjects,
    updateProject,
    deleteProject, getProjectMembers, inviteUserToProject } = require("../controllers/projectController.js")
const protect = require("../middleware/authMiddleware.js")

router.route('/')
  .get(protect, getProjects)
  .post(protect, createProject);

router.route('/:id')
  .put(protect, updateProject)
  .delete(protect, deleteProject);

router.get('/:projectId/members', protect, getProjectMembers);

router.post('/:id/invite', protect, inviteUserToProject);

module.exports = router;
