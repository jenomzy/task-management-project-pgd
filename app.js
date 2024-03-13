var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
require('dotenv').config();
var session = require('express-session');
var passport = require('passport');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var http = require('http');
var socketIo = require('socket.io');


var indexRouter = require('./routes/index');

var app = express();
var server = http.createServer(app);
var io = socketIo(server);

// Socket.io event handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle sending and receiving chat messages
  socket.on('sendMessage', async (data) => {
      try {
          // Assuming the logged-in user's ID is available in req.user
          const userId = socket.request.session.passport.user;

          // Create a new message object
          const message = {
              text: data.message,
              time: new Date(),
              userId: userId
          };

          // Determine the forum to save the message in based on the data
          let forumId;
          if (data.forumType === 'general') {
              forumId = await getGeneralForumId();
          } else if (data.forumType === 'team') {
              forumId = data.teamId; // Assuming teamId is passed in data
          }

          // Save the message to the respective forum
          const forum = await Forum.findById(forumId);
          if (forum) {
              forum.message.push(message);
              await forum.save();

              // Broadcast the received message to all clients
              io.emit('message', message);
          }
      } catch (error) {
          console.error('Error saving message:', error);
      }
  });

  socket.on('disconnect', () => {
      console.log('User disconnected');
  });
});

async function getGeneralForumId() {
  let generalForum = await Forum.findOne({ isGeneralForum: true });
  if (!generalForum) {
      generalForum = new Forum({ isGeneralForum: true });
      await generalForum.save();
  }
  return generalForum._id;
}

//Session management
app.use(session({
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false
}));

//Database connection
mongoose.connect(process.env.MONGODB_URI);

//mongoose.connect('mongodb://localhost/taskm');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.on('connected', function () {
    console.log('Connected to mongoose');
});
db.on('disconnected', function () {
    console.log('Mongoose connection disconnected');
});
process.on('SIGINT', function() {
    db.close(function () {
        console.log('Mongoose connection disconnected on app termination');
        process.exit(0);
    });
});

// view engine setup(path and view type)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Passport
require('./config/passport-config');
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use('/', indexRouter);

//Express validator
app.use(expressValidator());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
