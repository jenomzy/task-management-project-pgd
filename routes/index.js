var express = require('express');
var router = express.Router();
var passport = require('passport');
var bcrypt = require('bcrypt');
var expressValidator = require('express-validator');
router.use(expressValidator());
var hbs = require('hbs');
var multer = require('multer');
var path = require('path');

//Calling Database models
var User = require('../models/user.model');
var Forum = require('../models/forum.model');
var Task = require('../models/tasks.model');
var Team = require('../models/team.model');
//const { User, Team, Task, Forum } = require('./models');

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Destination folder for file uploads
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // File naming convention
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // Limit file size to 5MB
  fileFilter: function (req, file, cb) {
      // Allowed file extensions
      const filetypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
      if (mimetype && extname) {
          return cb(null, true);
      } else {
          cb('Error: Images, PDFs, text files, and DOC files only!');
      }
  }
}).single('file');

hbs.registerHelper('ifCond', function(v1, operator, v2, options) {
  switch (operator) {
      case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
      default:
          return options.inverse(this);
  }
});

// Register Handlebars helper to sum ongoing and completed tasks counts
hbs.registerHelper('sumTasksCount', function(ongoingTasksCount, completedTasksCount) {
  return ongoingTasksCount + completedTasksCount;
});

//Handlebars register To assign active status to tabs
hbs.registerHelper('activeTab', (currentTab, expectedTab) => {
  return currentTab === expectedTab ? 'active' : '';
});

//Handlebars register To check if the arguments are equal to each other
hbs.registerHelper('eq', function(arg1, arg2, options) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

//Handlebars register To check if the arguments are not equal to each other
hbs.registerHelper('neq', function(arg1, arg2, options) {
  return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
});

/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.isAuthenticated()){
    //console.log("Logged user is", req.user.username);
    res.render('index', {title: 'Home Page', user: req.user, activeTab: 'dashboard'});
  }
  else {
    res.render('login', {title: 'Login', message: req.flash('error') });
  }
});

//Request login
router.post('/login', passport.authenticate('local', { 
  failureFlash: true,
  failureRedirect: '/'
}),(req,res)=>{
  res.redirect('/');
});

//Request logout
router.get('/logout', (req, res, next) => {
  //console.log('Logged Out')
  req.logOut((err) => {
      if (err) return next(err);       
      res.redirect('/');})
});

//Member Duties

// GET route to fetch all tasks associated with the user
router.get('/usertasks', ensureAuthenticated, async (req, res) => {
  try {
    // Ensure the user is authenticated and retrieve the user ID
    const userId = req.user._id;

    // Find the user based on the user ID
    const user = await User.findById(userId);

    // If the user is not found, set an error flash message and redirect
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/'); // Redirect to homepage
    }

    // Get teams associated with the user
    const userTeams = user.team;

    // Find tasks assigned to the user's teams
    const tasks = await Task.find({ team: { $in: userTeams } }).populate({
      path: 'files',
      populate: {
        path: 'uploadedBy',
        ref: 'User',
        select: 'fname lname'
      }
    });

    // Separate ongoing and completed tasks
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
    const completedTasks = tasks.filter(task => task.status === 'completed');

    // Render the projects view with user, activeTab, tasks, and flash messages
    res.render('projects', { 
      title: 'Projects',
      user: req.user, 
      activeTab: 'tasks',
      ongoingTasks,
      completedTasks,
      tasks: tasks, 
      message: req.flash() // Flash messages for both success and error
    });
  } catch (error) {
    // Handle errors by setting an error flash message and redirecting
    console.error('Error fetching user tasks:', error);
    req.flash('error', 'Error fetching user tasks.');
    res.redirect('/'); // Redirect to homepage
  }
});

// Route to fetch task files
router.get('/task/:taskId/files', async (req, res) => {
  try {
      const taskId = req.params.taskId;
      // Find the task based on taskId and populate the files field with uploadedBy information
      const task = await Task.findById(taskId).populate({
          path: 'files',
          populate: {
              path: 'uploadedBy',
              model: 'User',
              select: 'fname lname'
          }
      });
      // If the task is not found, return an error response
      if (!task) {
          return res.status(404).json({ error: 'Task not found' });
      }
      // Extract the files array from the task and send it as a JSON response
      const files = task.files;
      res.json(files);
  } catch (error) {
      // Handle errors by sending a 500 Internal Server Error response
      console.error('Error fetching task files:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to fetch task information
router.get('/task/:taskId', ensureAuthenticated, async (req, res) => {
  try {
      const taskId = req.params.taskId;
      // Fetch task information from the database based on taskId
      const task = await Task.findById(taskId);
      // Send the task information as JSON response
      res.json(task);
  } catch (error) {
      console.error('Error fetching task information:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to fetch task comments
router.get('/task/:taskId/comments', ensureAuthenticated, async (req, res) => {
  try {
      const taskId = req.params.taskId;
      // Fetch task comments from the database based on taskId
      const comments = await Comment.find({ taskId });
      // Send the task comments as JSON response
      res.json(comments);
  } catch (error) {
      console.error('Error fetching task comments:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST route to handle file upload
router.post('/taskupload', ensureAuthenticated, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
          req.flash('error', 'File upload error. Contact admin.');
          res.redirect('/usertasks');
        } else {
            try {

                var userId = req.user._id;
                // Get other form data
                const { comment, taskId } = req.body;
                // Save file path to database
                const filePath = req.file.path;

                // Find the task by task ID
                const task = await Task.findById(taskId);
                if (!task) {
                  req.flash('error', 'Task not found. Cannot upload file.');
                  res.redirect('/usertasks');
                }

                // Add file to task files array
                task.files.push({
                    fileName: req.file.originalname,
                    filePath: filePath,
                    note: comment,
                    uploadedBy: userId
                });

                // Save the updated task
                await task.save();

                req.flash('success', 'File uploaded successfully.');
                res.redirect('/usertasks');
            } catch (error) {
              req.flash('error', 'File not uploaded.');
              res.redirect('/usertasks');
            }
        }
    });
});
//Member duties End

//Start fo Manager Duties

//Register new member
router.post('/register',  function (req, res, next) {
  //Get input from form page
  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email;
  var phone = req.body.phoneno;
  var password = req.body.pswd;
  var position = req.body.position;

  if(position == 'mm'){
    position = "Manager";
  }
  else if(position == 'teamm'){
    position = "Team Member";
  }
  else position = "Team Leader"

  //Input Validation
  req.checkBody('fname', 'Name is required').notEmpty();
  req.checkBody('lname', 'Name is required').notEmpty();
  //req.checkBody('phone', 'Phone Number is required').notEmpty();
  req.checkBody('position', 'Member Position is required').notEmpty();
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email not valid').isEmail();

  var errors = req.validationErrors();

  if(errors)
  {
      res.render('managemembers', {
          errors: console.log(errors),
          title: 'Home page'
      });
  }else
  {
      // var ifExists = User.findOne({ username: email })
      // if (ifExists)
      //   return console.log("User exists");
      let newUser = new User({
          fname: fname,
          lname: lname,
          username: email,
          position: position,
          phone: phone,
          password: bcrypt.hashSync(password,bcrypt.genSaltSync(10))
      });

      newUser
        .save()
        .then(() => {
          console.log("User created");
        })
        .catch((error) => {
          console.log("User not created", errors, error);
        });

      req.flash('success', 'User created successfully.');
      res.redirect('/usermanage');
  }
});

// Promote Member to Leader
router.post('/promote', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      const userId = req.body.userId;
      // Find the user by ID and update their position to "Team Leader"
      await User.findByIdAndUpdate(userId, { position: 'Team Leader' });

      req.flash('success', 'User promoted successfully.');
      res.redirect('/usermanage'); // Redirect to the team management page
  } catch (error) {
      console.error('Error promoting member:', error);
      req.flash('error', 'Error promoting member.');
      res.redirect('/usermanage');
  }
});

// Demote Leader to Member
router.post('/demote', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      const userId = req.body.userId;
      // Find the user by ID and update their position to "Team Member"
      await User.findByIdAndUpdate(userId, { position: 'Team Member' });

      req.flash('success', 'User demoted successfully.');
      res.redirect('/usermanage'); // Redirect to the team management page
  } catch (error) {
      console.error('Error demoting leader:', error);
      req.flash('error', 'Error demoting member.');
      res.redirect('/usermanage');
  }
});

// Create team
router.post('/createteam', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      const { teamName, leaderId, memberIds } = req.body;

      // Create a new team
      const newTeam = new Team({
          name: teamName,
          leader: leaderId,
          members: memberIds
      });

      // Save the team to the database
      const savedTeam = await newTeam.save();

      // Create a forum for the team
      const newForum = new Forum({
          forumname: teamName,
          teamId: savedTeam._id
      });

      // Save the forum to the database
      await newForum.save();

      // Update the leader's team field
      await User.findByIdAndUpdate(leaderId, { $push: { team: savedTeam._id } });

      // Update each member's team field
      for (const memberId of memberIds) {
          await User.findByIdAndUpdate(memberId, { $push: { team: savedTeam._id } });
      }

      req.flash('success', 'Team created successfully.');
      res.redirect('/teammanage');
  } catch (error) {
      console.error('Error creating team:', error);
      req.flash('error', 'Error creating team.');
      res.redirect('/teammanage');
  }
});

//Disband team
router.post('/disbandteam', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const teamId = req.body.teamId;

    // Find the team by ID
    const team = await Team.findById(teamId);

    if (!team) {
      req.flash('error', 'Error disbanding team.');
      res.redirect('/teammanage');
    }

    // Update the disbanded status to true
    team.disbanded = true;
    team.disbandedDate = new Date();
    await team.save();

    // Update the corresponding forum's active status to false
    await Forum.updateOne({ teamId: teamId }, { $set: { active: false } });

    req.flash('success', 'Team disbanded successfully.');
    res.redirect('/teammanage');
  } catch (error) {
    console.error('Error disbanding team:', error);
    req.flash('error', 'Error disbanding team.');
  }
});

// GET route to render the Team management page
router.get('/teammanage', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      // Fetch all teams from the database
      const teams = await Team.find().populate('leader').populate('members');
      const teamdis = await Team.find({ disbanded: false });
      const teamLeaders = await User.find({ position: 'Team Leader' });
      const teamMembers = await User.find({ position: 'Team Member' });
      var message = req.flash();

      // Render the task management page with task and team data
      res.render('teammanage', { title: 'Team Management', user: req.user, teams: teams, teamactive: teamdis, activeTab: 'manageteams', teamLeaders: teamLeaders, teamMembers: teamMembers, message: message });
  } catch (error) {
      console.error('Error fetching tasks and teams:', error);
      res.status(500).send('Error fetching tasks and teams');
  }
});

// GET route to render the task management page
router.get('/tasksmanage', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      // Fetch all tasks from the database and populate the team field with team names
      const tasks = await Task.find().populate({ path: 'team', select: 'name' });

      // Fetch all teams from the database
      const task = await Task.find({ status: 'ongoing' });

      // Fetch all teams from the database
      const teams = await Team.find({ disbanded: false });
      var message = req.flash();

      // Render the task management page with task and team data
      res.render('taskmanage', { 
          title: 'Task Management',
          user: req.user, 
          tasks,
          task,
          teams, 
          activeTab: 'managetasks', 
          message: message 
      });
  } catch (error) {
      console.error('Error fetching tasks and teams:', error);
      res.status(500).send('Error fetching tasks and teams');
  }
});


//Route to open user management page
router.get('/usermanage', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      // Fetch all users and teams
      const users = await User.find();
      const teams = await Team.find({ disbanded: false });
      const teamLeaders = await User.find({ position: 'Team Leader' });
      const teamMembers = await User.find({ position: 'Team Member' });

      // Separate managers from other users
      const managers = users.filter(user => user.position === 'Manager');
      const otherUsers = users.filter(user => user.position !== 'Manager');

      let message = req.flash();

      res.render('managemembers', { 
          title: 'User Management',
          user: req.user, 
          managers: managers,
          otherUsers: otherUsers, 
          teams: teams,
          teamLeaders: teamLeaders, 
          teamMembers: teamMembers, 
          activeTab: 'manageusers', 
          message: message 
      });
  } catch (error) {
      console.error('Error fetching users and teams:', error);
      res.status(500).send('Internal Server Error');
  }
});

// GET route to edit user details
router.get('/edit-user/:userId', ensureAuthenticated, isAdmin, async(req, res) => {
  var userId = req.params.userId;

  try {
      // Find user by userId
      const user = await User.findOne({ _id: userId }).exec();

      if (!user) {
          // Handle user not found
          res.status(404).send('User not found');
          return;
      }

      // Render a page for editing user details
      var message = req.flash();
      res.render('editUser', { title: 'Edit User', user: req.user, users: user, activeTab: 'manageusers', message: message });
  } catch (error) {
      // Handle error
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// POST route to update user details
router.post('/update/user/:userId', ensureAuthenticated, isAdmin, function(req, res) {
  var userId = req.params.userId;

  // Find user by userId
  User.findOne({ _id: userId }, function(err, user) {
      if (err || !user) {
          req.flash('error', 'User not found.');
          res.redirect('/edit/user/' + userId);
      }

      // Update user details with form data
      user.fname = req.body.fname;
      user.lname = req.body.lname;
      user.position = req.body.position;
      user.phone = req.body.phone;

      // Save the updated user
      user.save(function(err) {
          if (err) {
              // Handle error
              req.flash('error', 'Error updating user.');
              res.redirect('/edit/user/' + userId);
          }
          // Redirect back to the edit page with success message
          req.flash('success', 'User updated successfully.');
          res.redirect('/edit/user/' + userId);
      });
  });
});

// GET route to view tasks of a user
router.get('/view-projects/:userId', ensureAuthenticated, isAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find teams where the user is a member or a leader
    const teams = await Team.find({ $or: [{ leader: userId }, { members: userId }] });

    // Extract team IDs from the teams found
    const teamIds = teams.map(team => team._id);

    // Find tasks assigned to any of the user's teams
    const tasks = await Task.find({ team: { $in: teamIds } });

    // Separate ongoing and completed tasks
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
    const completedTasks = tasks.filter(task => task.status === 'completed');

    // Get the list of teams the user is a member of along with their status
    const userTeams = teams.map(team => ({ name: team.name, status: team.disbanded ? 'Disbanded' : 'Active' }));

    // Render a page with the user's tasks
    const message = req.flash();
    res.render('userTasks', { title: 'User Projects', user: req.user, ongoingTasks, completedTasks, userTeams, activeTab: 'manageusers', message });
  } catch (error) {
    console.error('Error:', error);
    req.flash('error', 'Error fetching user tasks.');
    res.redirect('/usermanage');
  }
});

//POST route to handle task completion
router.post('/complete-team-task', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const taskId = req.body.task;

    // Find the task by its ID and update its status to "completed"
    await Task.findByIdAndUpdate(taskId, { status: 'completed' });

    // Update ongoing and completed task count for team leader and members
    const taskInfo = await Task.findById(taskId);
    const teamInfo = await Team.findById(taskInfo.team);
    await User.updateMany({ _id: { $in: teamInfo.members } }, { $inc: { ongoingTasksCount: -1, completedTasksCount: 1 } });
    await User.findByIdAndUpdate(teamInfo.leader, { $inc: { ongoingTasksCount: -1, completedTasksCount: 1 } });

    req.flash('success', 'Task completed successfully.');
    res.redirect('/tasksmanage');
  } catch (error) {
    console.error('Error completing task:', error);
    req.flash('error', 'Error completing task.');
    res.redirect('/tasksmanage');
  }
});

// POST route to handle creating a team task
router.post('/create-team-task', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      // Extract task data from request body
      const { taskName, description, priority, dueDate, team } = req.body;
      const dateOnly = new Date(dueDate).toISOString().split('T')[0];

      // Create a new task object
      const newTask = new Task({
          taskName,
          description,
          priority,
          dueDate: dateOnly,
          team
      });

      // Save the new task to the database
      await newTask.save();

      // Update ongoing task count for team leader and members
      const teamInfo = await Team.findById(team);
      await User.updateMany({ _id: { $in: teamInfo.members } }, { $inc: { ongoingTasksCount: 1 } });
      await User.findByIdAndUpdate(teamInfo.leader, { $inc: { ongoingTasksCount: 1 } });

      req.flash('success', 'Task created successfully.');
      res.redirect('/tasksmanage');
  } catch (error) {
      console.error('Error creating team task:', error);
      req.flash('error', 'Error creating team task.');
      res.redirect('/tasksmanage');
  }
});

//Manager Duties End

// GET route to render the forum page
router.get('/forum', async (req, res) => {
  try {
    // Retrieve general chat messages from active general forum
    const generalForum = await Forum.findOne({ isGeneralForum: true, active: true });
    const generalMessages = generalForum ? generalForum.message : [];

    // Retrieve teams the logged-in user is a member of or a leader of
    const userId = req.user._id;
    const userTeams = await Team.find({ $or: [{ members: userId }, { leader: userId }] });

    // Retrieve active team chat groups and their messages for user's teams
    const teamChatGroupsWithMessages = [];

    for (const team of userTeams) {
      const teamForum = await Forum.findOne({ teamId: team._id, active: true });
      if (teamForum) {
        const teamMessages = teamForum.message;
        teamChatGroupsWithMessages.push({ team, messages: teamMessages });
      }
    }

    res.render('forum', { title: 'Forum', user: req.user, activeTab: 'forum', generalMessages, teamChatGroups: teamChatGroupsWithMessages });
  } catch (error) {
    console.error('Error fetching forum data:', error);
    res.redirect('/');
  }
});

//profile link
router.get('/profile', ensureAuthenticated, async (req, res) => {
  var message = req.flash();
  res.render('profile', { title: 'Profile', user: req.user, activeTab: 'profile', message: message });
});

// Route for creating the general forum
router.post('/create-general-forum', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
      // Check if the general forum already exists
      const existingForum = await Forum.findOne({ isGeneralForum: true });

      // If the general forum already exists, return an error
      if (existingForum) {
          req.flash('error', 'General forum already exists.');
          return res.redirect('/profile');
      }

      // Create a new general forum
      const newGeneralForum = new Forum({ isGeneralForum: true });

      // Save the general forum to the database
      await newGeneralForum.save();

      req.flash('success', 'General forum created successfully.');
      res.redirect('/profile');
  } catch (error) {
      console.error('Error creating general forum:', error);
      req.flash('error', 'Error creating general forum.');
      res.redirect('/profile');
  }
});

//Delete
router.post('/dbdrop/user', function(req, res, next){
  User.collection.drop();
  res.redirect('/db');
});
router.post('/dbdrop/team', function(req, res, next){
  Team.collection.drop();
  res.redirect('/db');
});
router.post('/dbdrop/task', function(req, res, next){
  Task.collection.drop();
  res.redirect('/db');
});
router.post('/dbdrop/forum', function(req, res, next){
  Forum.collection.drop();
  res.redirect('/db');
});


//View all collectons
router.get('/db', async (req, res) => {
  try {
    // Fetch all users and teams
    const users = await User.find();
    const tasks = await Task.find();
    const teams = await Team.find().populate('leader').populate('members');
    const comments = await Forum.find();

    res.render('db', { users: users, tasks: tasks, teams: teams, comments: comments });
} catch (error) {
    console.error('Error fetching database:', error);
    res.status(500).send('Internal Server Error');
}
});

router.get('/test', async (req, res, next) => {
  try {
      const userId = req.user._id;

      // Retrieve user's information
      const user = await User.findById(userId);

      // Retrieve user's teams
      const teams = await Team.find({ $or: [{ members: userId }, { leader: userId }] });

      // Retrieve tasks assigned to the user or their teams
      const tasks = await Task.find({ $or: [{ team: { $in: teams.map(team => team._id) } }, { team: null }] });

      // Filter tasks with deadlines within the next 7 days and format dates
      const upcomingTasks = tasks.filter(task => {
          const deadline = new Date(task.dueDate);
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          return deadline <= sevenDaysFromNow;
      }).map(task => ({
          ...task.toObject(),
          dueDate: formatDate(task.dueDate)
      }));

      // Retrieve recent forum activity for the user's teams
      const forumActivity = await Forum.find({ teamId: { $in: teams.map(team => team._id) } })
          .sort({ 'message.time': -1 })
          .limit(10);

      res.render('test', { title: 'Home Page', user: req.user, activeTab: 'dashboard', user, teams, tasks, forumActivity, upcomingTasks });
  } catch (error) {
      console.error('Error fetching data for dashboard:', error);
      res.status(500).json({ error: 'An error occurred while fetching data for dashboard' });
  }
});

// Define formatDate helper function
const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  } else {
      res.redirect('/');
  }
}

function isAdmin(req, res, next) {
  if (req.user && req.user.position === 'Manager') {
      return next();
  }
  return res.status(403).send('Unauthorized');
}


module.exports = router;