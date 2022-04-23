const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path');

const app = express();

//setting up logging stream
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

//middleware - logging, static public folder, error logging
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.static('public'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('something is broken here');
});

app.get('/', (req, res) => {
  res.send('Welcome to the App!');
});

app.get('/movies', (req, res) => {
  res.json(topMovies);
});

//movie by title
app.get('/movies/:title', (req, res) => {
  let movie = topMovies.find((movie) => {
    return movie.title === req.params.title;
  });
  if (movie) {
    res.json(movie);
  } else {
    res.status(400).send('Movie not Found');
  }
});

//movies by genre
app.get('/movies/genre/:title', (req, res) => {
  let movie = topMovies.find((movie) => {
    return movie.title === req.params.title;
  });
  if (movie) {
    res.status(200).send(`${req.params.title} is a ${movie.genre}`);
  } else {
    res.status(400).send('Movie not Found');
  }
});

app.get('/directors/:name', (req, res) => {
  res.status(200).send(`Request recived for ${req.params.name}`);
});

app.post('/users', (req, res) => {
  res.status(200).send(`Request recived for new user`);
});

app.put('/users/:name', (req, res) => {
  res.status(200).send(`Request recived to update name for ${req.params.name}`);
});

app.post('/users/:id/favorites/:title', (req, res) => {
  res
    .status(200)
    .send(
      `Adding ${req.params.title} to favorites for user ID ${req.params.id}`
    );
});

app.delete('/users/:id/favorites/:title', (req, res) => {
  res
    .status(200)
    .send(
      `Deleteing ${req.params.title} from favorites for user ID ${req.params.id}`
    );
});

app.delete('/users/:name', (req, res) => {
  res.status(200).send(`Deleting user ${req.params.name}`);
});

app.get('/documentation', (req, res) => {
  res.sendFile(__dirname + '/public/documentation.html');
});

app.listen(8080, () => {
  console.log('listening on port 8080');
});
