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

//finding common liked movies between users
async function findOtherLikes(favorites, user) {
  let userSearch = await Users.find({
    FavoriteMovies: { $in: favorites },
    Username: { $ne: user },
  });
  let otherLikes = [];
  if (userSearch.length > 0) {
    userSearch.forEach((user) => {
      otherLikes.push(...user.FavoriteMovies);
    });
  }
  otherLikes = [...new Set(otherLikes)];
  let movieList = await Movies.find({
    _id: { $in: otherLikes },
  });
  return movieList.length > 0 ? movieList : [];
}

//finding recommended movies for users favorites
async function favoriteRecommend(favorites) {
  let recommended = await Movies.find({
    _id: { $in: favorites },
  });
  let recommendations = [];
  recommended.forEach((movie) => {
    if (movie.Recommended.length > 0) {
      recommendations.push(...movie.Recommended);
    }
  });
  let uniqueRecos = [...new Set(recommendations)];
  let recommendedIds = await Movies.find({
    odbID: { $in: uniqueRecos },
  });

  return recommendedIds;
}

//getting recommendations for user on login
app.get(
  '/foryou',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let favorites = req.user.FavoriteMovies;
    let otherUserFavorites = await findOtherLikes(favorites, req.user.Username);
    let recos = await favoriteRecommend(favorites);
    let returnMovies = [...recos, ...otherUserFavorites];

    returnMovies = returnMovies.reduce((unique, o) => {
      if (!unique.some((obj) => obj._id === o._id)) {
        unique.push(o);
      }
      return unique;
    }, []);

    if (returnMovies.length > 0) {
      returnMovies.sort((a, b) => b.Rating - a.Rating);
      res
        .status(201)
        .json(
          returnMovies.length > 20 ? returnMovies.slice(0, 20) : returnMovies
        );
    } else {
      res.status(404).send('No movies found');
    }
  }
);

app.get(
  '/mostliked',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let allFavorites = await Users.find({}, { FavoriteMovies: 1 });
    const tally = {};

    allFavorites.forEach((favorite) => {
      if (favorite.FavoriteMovies) {
        favorite.FavoriteMovies.forEach((m) => {
          tally[m.valueOf()] = tally[m.valueOf()] ? tally[m.valueOf()] + 1 : 1;
        });
      }
    });

    let returnMovies = await Movies.find({
      _id: { $in: Object.keys(tally) },
    });

    //sort array by tally
    returnMovies.sort((a, b) => {
      return tally[b._id] - tally[a._id];
    });
    res
      .status(201)
      .json(
        returnMovies.length > 20 ? returnMovies.slice(0, 20) : returnMovies
      );
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
