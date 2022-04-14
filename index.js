const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),
  path = require('path');

const app = express();

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: a,
});

app.use(morgan('combined', { stream: accessLogStream }));

app.use((err, req, res, next) =>{
    console.error(err.stack);
    res.status(500).send('something is broken here')
})


app.get('/', (req, res) => {
  res.send('Welcome to the App!');
});

app.get('/secreturl', (req, res) => {
  res.send('This is the secret URL');
});

app.listen(8080, () => {
  console.log('listening on port 8080');
});
