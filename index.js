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
  },

  {
    title: 'The Godfather',
    director: 'Frances Ford Coppola',
    stars: ['Marlon Brando', 'Al Pacino', 'James Caan'],
  },
  {
    title: 'The Dark Knight',
    director: 'Christopher Nolan',
    stars: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
  },
  {
    title: 'The Godfather: Part II',
    director: 'Francis Ford Coppola',
    stars: ['Al Pacino', 'Robert De Niro', 'Robert Duvall'],
  },
  {
    title: '12 Angry Men',
    director: 'Sidney Lumet',
    stars: ['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam'],
  },
  {
    title: "Schindler's List",
    director: 'Steven Spielberg',
    stars: ['Liam Neeson', 'Ralph Fiennes', 'Ben Kingsley'],
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    director: 'Peter Jackson',
    stars: ['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen'],
  },
  {
    title: 'Pulp Fiction',
    director: 'Quentin Tarantino',
    stars: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    director: 'Peter Jackson',
    stars: ['Elijah Wood', 'Orlando Bloom', 'Ian McKellen'],
  },
  {
    title: 'The Good, the Bad and the Ugly',
    director: 'Sergio Leone',
    stars: ['Clint Eastwood', 'Eli Wallach', 'Lee Van Cleef'],
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

app.get('/documentation', (res, req) => {
  res.sendFile('documentation.html');
});

app.listen(8080, () => {
  console.log('listening on port 8080');
});
