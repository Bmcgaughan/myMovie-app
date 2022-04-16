const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path');

const app = express();

//setting up logging stream
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

//top 10 movies according to IMDB
const topMovies = [
  {
    title: 'The Shawshank Redemption',
    director: 'Frank Darabont',
    stars: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
    genre: 'Drama',
  },

  {
    title: 'The Godfather',
    director: 'Frances Ford Coppola',
    stars: ['Marlon Brando', 'Al Pacino', 'James Caan'],
    genre: 'Crime Drama',
  },
  {
    title: 'The Dark Knight',
    director: 'Christopher Nolan',
    stars: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    genre: 'Action',
  },
  {
    title: 'The Godfather: Part II',
    director: 'Francis Ford Coppola',
    stars: ['Al Pacino', 'Robert De Niro', 'Robert Duvall'],
    genre: 'Crime Drama',
  },
  {
    title: '12 Angry Men',
    director: 'Sidney Lumet',
    stars: ['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam'],
    genre: 'Drama',
  },
  {
    title: "Schindler's List",
    director: 'Steven Spielberg',
    stars: ['Liam Neeson', 'Ralph Fiennes', 'Ben Kingsley'],
    genre: 'Historical Drama',
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    director: 'Peter Jackson',
    stars: ['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen'],
    genre: 'Fantasy',
  },
  {
    title: 'Pulp Fiction',
    director: 'Quentin Tarantino',
    stars: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
    genre: 'Crime Drama',
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    director: 'Peter Jackson',
    stars: ['Elijah Wood', 'Orlando Bloom', 'Ian McKellen'],
    genre: 'Fantasy',
  },
  {
    title: 'The Good, the Bad and the Ugly',
    director: 'Sergio Leone',
    stars: ['Clint Eastwood', 'Eli Wallach', 'Lee Van Cleef'],
    genre: 'Western',
  },
];

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
