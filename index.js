const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path');

const app = express();

//setting up logging stream
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: a,
});


//top 10 movies according to IMDB
const topMovies = [
  {
    title: 'The Shawshank Redemption',
    director: 'Frank Darabont',
    stars: [
      {
        actor: 'Tim Robbins',
        actor: 'Morgan Freeman',
        actor: 'Bob Gunton',
      },
    ],
  },
  {
    title: 'The Godfather',
    director: 'Frances Ford Coppola',
    stars: [
      {
        actor: 'Marlon Brando',
        actor: 'Al Pacino',
        actor: 'James Caan',
      },
    ],
  },
  {
    title: 'The Dark Knight',
    director: 'Christopher Nolan',
    stars: [
      {
        actor: 'Christian Bale',
        actor: 'Heath Ledger',
        actor: 'Aaron Eckhart',
      },
    ],
  },
  {
    title: 'The Godfather: Part II',
    director: 'Francis Ford Coppola',
    stars: [
      {
        actor: 'Al Pacino',
        actor: 'Robert De Niro',
        actor: 'Robert Duvall',
      },
    ],
  },
  {
    title: '12 Angry Men',
    director: 'Sidney Lumet',
    stars: [
      {
        actor: 'Henry Fonda',
        actor: 'Lee J. Cobb',
        actor: 'Martin Balsam',
      },
    ],
  },
  {
    title: 'Schindler\'s List',
    director: 'Steven Spielberg',
    stars: [
      {
        actor: 'Liam Neeson',
        actor: 'Ralph Fiennes',
        actor: 'Ben Kingsley',
      },
    ],
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    director: 'Peter Jackson',
    stars: [
      {
        actor: 'Elijah Wood',
        actor: 'Viggo Mortensen',
        actor: 'Ian McKellen',
      },
    ],
  },
  {
    title: 'Pulp Fiction',
    director: 'Quentin Tarantino',
    stars: [
      {
        actor: 'John Travolta',
        actor: 'Uma Thurman',
        actor: 'Samuel L. Jackson',
      },
    ],
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    director: 'Peter Jackson',
    stars: [
      {
        actor: 'Elijah Wood',
        actor: 'Orlando Bloom',
        actor: 'Ian McKellen',
      },
    ],
  },
  {
    title: 'The Good, the Bad and the Ugly',
    director: 'Sergio Leone',
    stars: [
      {
        actor: 'Clint Eastwood',
        actor: 'Eli Wallach',
        actor: 'Lee Van Cleef',
      },
    ],
  }
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

app.get('/documentation', (res, req) =>{
    res.sendFile('documentation.html')
})

app.listen(8080, () => {
  console.log('listening on port 8080');
});
