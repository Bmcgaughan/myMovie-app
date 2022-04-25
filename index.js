const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path'),
  mongoose = require('mongoose'),
  Models = require('./models.js');

const app = express();

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

//mongoose models
const Movies = Models.Movie;
const Users = Models.User;

//connect to MongoDB
mongoose.connect('mongodb://localhost:27017/MyFlixApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Movies.find({ Title: 'Pulp Fiction' }).then((movie) => {
//   console.log(movie);
// });

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

//setting endpoints for API
app.get('/', (req, res) => {
  res.send('Welcome to the App!');
});

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
app.get('/movies/:title',passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.title }).then((movie) => {
    if (movie) {
      res.status(200).json(movie);
    } else {
      res.status(400).send('Movie not Found');
    }
  });
});

//movies by genre
app.get('/movies/genre/:title', (req, res) => {
  Movies.findOne({ Title: req.params.title }).then((movie) => {
    if (movie) {
      res.status(200).send(`${req.params.title} is a ${movie.Genre.Name}`);
    } else {
      res.status(400).send('Movie not Found');
    }
  });
});

//info about director
app.get('/directors/:name', (req, res) => {
  Movies.findOne({ 'Director.Name': req.params.name }).then((movie) => {
    if (movie) {
      res.status(200).json(movie.Director);
    } else {
      res.status(400).send('Director Not Found');
    }
  });
  // res.status(200).send(`Request recived for ${req.params.name}`);
});

//add user
app.post('/users', (req, res) => {
  Users.findOne({ Username: req.body.Username }).then((user) => {
    if (user) {
      return res.status(400).send(`${req.body.Username} already exists`);
    } else {
      Users.create({
        Username: req.body.Username,
        Password: req.body.Password,
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
});

//update user information based on username
app.put('/users/:Username', (req, res) => {
  Users.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $set: {
        Username: req.body.Username,
        Password: req.body.Password,
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
});

//add favorite movie to user
app.post('/users/:Username/favorites/:MovieID', (req, res) => {
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
});

//delete favorite from user
app.delete('/users/:Username/favorites/:MovieID', (req, res) => {
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
});

//delete user
app.delete('/users/:Username', (req, res) => {
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
});

app.get('/documentation', (req, res) => {
  res.sendFile(__dirname + '/public/documentation.html');
});

app.listen(8080, () => {
  console.log('listening on port 8080');
});
