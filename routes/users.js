const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
// Load User model
const User = require('../models/User');
//Load Task model
const Task = require('../models/Task')

const {
  ensureAuthenticated,
  forwardAuthenticated
} = require('../config/auth');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

// Register
router.post('/register', (req, res) => {
  const {
    name,
    email,
    password,
    password2
  } = req.body;
  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({
      msg: 'Please enter all fields'
    });
  }

  if (password != password2) {
    errors.push({
      msg: 'Passwords do not match'
    });
  }

  if (password.length < 6) {
    errors.push({
      msg: 'Password must be at least 6 characters'
    });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2
    });
  } else {
    User.findOne({
      email: email
    }).then(user => {
      if (user) {
        errors.push({
          msg: 'Email already exists'
        });
        res.render('register', {
          errors,
          name,
          email,
          password,
          password2
        });
      } else {
        const newUser = new User({
          name,
          email,
          password
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/users/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});



/*              *****************************************           */

//create-tasks page
router.get('/create', ensureAuthenticated, (req, res) => res.render('create-tasks'))

//Create Task
router.post('/tasks', async (req, res) => {
  const {
    title,
    description,
    completed,
  } = req.body
  const isCompleted = completed === 'true'
  const task = new Task({
    title,
    description,
    completed: isCompleted,
    owner: req.user._id
  })
  try {
    await task.save()
    res.redirect('/users/create')
  } catch (e) {
    res.status(500).send(e)
  }
})

//Read-tasks page
router.get('/read', ensureAuthenticated, async (req, res) => {
  const match = {}
  const sort = {}
  const totalTask = await Task.countDocuments({})
  if (req.query.completed) {
    match.completed = req.query.completed === 'true'
  }
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split('_')
    sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
  }
  if (!req.query.limit && !req.query.skip) {
    req.query.limit = 5
    req.query.skip = 0
  }
  await req.user.populate({
    path: 'tasks',
    match,
    options: {
      limit: parseInt(req.query.limit),
      skip: parseInt(req.query.skip),
      sort
    }
  }).execPopulate()

  res.render('display-tasks', {
    tasks: req.user.tasks,
    totalTask
  })
})

//Delete tasks
router.get('/users/delete/:id', ensureAuthenticated, async (req, res) => {
  const _id = req.params.id
  const task = await Task.findOne({
    _id,
    owner: req.user._id
  })
  await task.remove()
  await task.save()
  res.redirect('/users/read')
})

//Update tasks page
router.get('/users/update/:id', ensureAuthenticated, async (req, res) => {
  const _id = req.params.id
  const task = await Task.findById(_id)
  console.log(task);
  res.render('update-tasks', {
    task
  })
})

//Update tasks
router.post('/update/task/:id', async (req, res) => {
  try {
    const _id = req.params.id
    const task = await Task.findByIdAndUpdate(_id, req.body, {
      new: true,
      runValidators: true
    })
    res.redirect('/users/read')
  } catch (e) {
    res.status(500).send('Server not respond. Try again')
  }
})


module.exports = router;