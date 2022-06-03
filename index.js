const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path'),
  mongoose = require('mongoose'),
  Models = require('./models.js'),
  axios = require('axios');

const { check, validationResult } = require('express-validator');

const app = express();

//setting allowed request origins
const cors = require('cors');
app.use(cors());

const allowedOrigins = process.env.ALLOWED_ORIGIN.split(',');

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let message = `No access from this origin ${origin}`;
        return callback(new Error(message), false);
      }
      console.log(`allowed ${(allowedOrigins, origin)}`);
      return callback(null, true);
    },
  })
);

const passport = require('passport');

require('./passport');

//mongoose models
const Movies = Models.Movie;
const Users = Models.User;

//connect to local dev MongoDB
// mongoose.connect('mongodb://localhost:27017/MyFlixApp', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// connect to Mongo Atlas
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//setting up logging stream
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

//middleware - logging, static public folder, error logging
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(express.static('public'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('something is broken here');
});

//passing express app into Auth
let auth = require('./auth')(app);
let ext = require('./externalAPI')(app);

//setting endpoints for API
app.get('/', (req, res) => {
  res.send('Welcome to the App!');
});

//return json of all movies
app.get(
  '/movies',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send(`Error: ${error}`);
      });
  }
);

//movie by title
app.get(
  '/movies/:title',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.title }).then((movie) => {
      if (movie) {
        res.status(200).json(movie);
      } else {
        res.status(400).send('Movie not Found');
      }
    });
  }
);

//movies by genre
app.get(
  '/movies/genre/:title',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.title }).then((movie) => {
      if (movie) {
        res.status(200).send(`${req.params.title} is a ${movie.Genre.Name}`);
      } else {
        res.status(400).send('Movie not Found');
      }
    });
  }
);

//info about director
app.get(
  '/directors/:name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Director.Name': req.params.name }).then((movie) => {
      if (movie) {
        res.status(200).json(movie.Director);
      } else {
        res.status(400).send('Director Not Found');
      }
    });
  }
);

//add user
app.post(
  '/users',
  //validating inputs
  [
    check('Username', 'Username must be more than 5 characters')
      .isLength({
        min: 5,
      })
      .trim()
      .escape(),
    check(
      'Username',
      'Username cant contain non alpha-numeric characters'
    ).isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email address is not valid').isEmail(),
  ],
  (req, res) => {
    let validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(422).json({ errors: validationErrors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }).then((user) => {
      if (user) {
        return res.status(400).send(`${req.body.Username} already exists`);
      } else {
        Users.create({
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        })
          .then((user) => {
            res.status(201).json(user);
          })
          .catch((error) => {
            console.log(error);
            res.status(500).send(`Error: ${error}`);
          });
      }
    });
  }
);

//update user information based on username
app.put(
  '/users/:Username',
  [
    check('Username', 'Username must be more than 5 characters')
      .isLength({
        min: 5,
      })
      .trim()
      .escape(),
    check(
      'Username',
      'Username cant contain non alpha-numeric characters'
    ).isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email address is not valid').isEmail(),
  ],
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(401).send('Not Authorized');
    }
    console.log(req.user.Username);

    let validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(422).json({ errors: validationErrors.array() });
    }

    let hashedPassword = req.body.Password
      ? Users.hashPassword(req.body.Password)
      : null;
    //if submitting password update it gets hashed

    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.log(err);
          res.status(500).send(`Error: ${err}`);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//getting and returning JSON for specific user by Username
app.get(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(401).send('Not Authorized');
    }
    Users.findOne({ Username: req.params.Username })
      .then((user) => {
        if (user) {
          respData = {
            Username: user.Username,
            Email: user.Email,
            Birthday: user.Birthday,
            FavoriteMovies: user.FavoriteMovies,
          };
          res.status(201).json(respData);
        } else {
          res.status(400).send('User Not Found');
        }
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send(`Error: ${error}`);
      });
  }
);

//add favorite movie to user
app.post(
  '/users/:Username/favorites/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(401).send('Not Authorized');
    }
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $addToSet: {
          FavoriteMovies: req.params.MovieID,
        },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.log(err);
          res.status(500).send(`Error: ${err}`);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//delete favorite from user
app.delete(
  '/users/:Username/favorites/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(401).send('Not Authorized');
    }
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: {
          FavoriteMovies: req.params.MovieID,
        },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.log(err);
          res.status(500).send(`Error: ${err}`);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//delete user
app.delete(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(401).send('Not Authorized');
    }
    Users.findOneAndRemove({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          return res.status(400).send(`${req.params.Username} does not exist`);
        } else {
          res.status(200).send(`${req.params.Username} was deleted`);
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send(`Error: ${err}`);
      });
  }
);

app.get('/documentation', (req, res) => {
  res.sendFile(__dirname + '/public/documentation.html');
});

const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on ${port}`);
});
