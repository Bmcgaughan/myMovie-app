const jwtSecret = 'your_jwt_secret';

const res = require('express/lib/response');
const jwt = require('jsonwebtoken'),
  passport = require('passport'),
  axios = require('axios'),
  Models = require('./models.js'),
  async = require('async'),
  schedule = require('node-schedule');

require('./passport');

const Movies = Models.Movie;

//clears Trending value for shows prior to updating with new results

async function clearTrend() {
  return Movies.updateMany({}, { $set: { Trending: false } });
}

//if show is found to exist it gets update to have Trending value
async function updateExist(shows) {
  const promises = shows.map(
    async (shows) =>
      await Movies.findOneAndUpdate(
        { odbID: shows },
        {
          $set: {
            Trending: true,
          },
        },
        { new: true }
      )
  );
  return Promise.all(promises);
}

//function for adding array of shows to database
async function addShows(shows) {
  Movies.insertMany(shows)
    .then((result) => {
      console.log('added', result);
    })
    .catch((e) => {
      console.log('addShows Error:', e);
    });
}

//check to see if show exists prior to adding or processing
async function showExists(show) {
  let showFound = await Movies.findOne({ odbID: show })
    .then((found) => {
      return found;
    })
    .catch((error) => {
      console.log('Exists Check Error:', error);
    });
  return showFound ? true : false;
}

//set up query to see if show exists in the main db
async function showExistDriver(shows) {
  let existing = [];
  let newShow = [];
  for (const show of shows) {
    let exists = await showExists(show.id);
    if (exists) {
      existing.push(show.id);
    } else {
      newShow.push(show.id);
    }
  }
  return { existing, newShow };
}

//process array of results into Movies model for insertion into Mongo
async function processTrend(data, existing, trend) {
  let showsToAdd = [];
  const baseURL = 'http://image.tmdb.org/t/p/original';
  if (data) {
    for (const show of data) {
      let newTV = new Movies();

      newTV.Title = show.name;
      newTV.Description = show.overview ? show.overview : 'N/A';
      newTV.odbID = show.id;
      newTV.Trending = trend ? true : false;
      newTV.ImagePath = baseURL + show.poster_path;
      newTV.Popularity = show.popularity ? show.popularity : null;
      newTV.Rating = show.vote_average ? show.vote_average : null;
      newTV.Network = show.networks[0].name ? show.networks[0].name : null;

      if (show.genres) {
        newTV.Genre.Name = show.genres[0] ? show.genres[0].name : '';
      }

      if (show.credits.cast) {
        let splice =
          show.credits.cast.length >= 3 ? 3 : show.credits.cast.length;
        const slicedArray = show.credits.cast.slice(0, splice);
        slicedArray.forEach((nm) => {
          newTV.Actors.push(nm.name);
        });
      }

      let direcCheck = {};
      if (show.credits.crew) {
        direcCheck = show.credits.crew.find((v) => {
          if (v.job === 'Director') {
            return v;
          }
        });
        if (!direcCheck) {
          direcCheck = show.credits.crew.find((v) => {
            if (v.job === 'Executive Producer') {
              return v;
            }
          });
        }
        newTV.Director.Name = direcCheck ? direcCheck.name : '';
      }
      showsToAdd.push(newTV);
    }
  }

  await clearTrend().then((cleared) => {
    console.log('cleared', cleared);
  });

  if (existing) {
    await updateExist(existing)
      .then((res) => {
        console.log('update Trend', res);
      })
      .catch((e) => {
        console.log('Update Exist Error', e);
      });
  }

  await addShows(showsToAdd);
  return showsToAdd;
}

//serves as a map to generate promise for each show in initial results
function getData(url) {
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((resp) => {
        resolve(resp.data);
      })
      .catch((e) => {
        reject(e);
      });
  });
}

//driver to generate array of promises for all shows where we need details
async function getDetails(data) {
  if (data.length === 0) {
    return null;
  }
  let userRequests = [];
  data.forEach((id) => {
    userRequests.push(
      getData(
        `https://api.themoviedb.org/3/tv/${id}?api_key=${process.env.TMDB}&language=en-US&append_to_response=credits`
      )
    );
  });
  return Promise.all(userRequests);
}

async function getTrending() {
  const resp = axios.get(
    `https://api.themoviedb.org/3/trending/tv/day?api_key=${process.env.TMDB}`
  );
  return resp;
}

async function getRecommended(id) {
  const resp = axios.get(
    `https://api.themoviedb.org/3/tv/${id}/recommendations?api_key=${process.env.TMDB}&language=en-US&page=1&append_to_response=credits`
  );
  return resp;
}

const trendJob = schedule.scheduleJob('0 */2 * * *', function () {
  try {
    getTrending()
      .then((response) => {
        return response.data.results;
      })
      .then((fullRes) => {
        showExistDriver(fullRes)
          .then((existSplit) => {
            return existSplit;
          })
          .then((idsToQuery) => {
            getDetails(idsToQuery.newShow)
              .then((newTVDetails) => {
                return newTVDetails;
              })
              .then((rawDetails) => {
                processTrend(rawDetails, idsToQuery.existing, true).then(
                  (processedTV) => {
                    console.log(processedTV);
                  }
                );
              })
              .catch((e) => {
                console.log(e);
              });
          })
          .catch((e) => {
            console.log('get details error', e);
          });
      })
      .catch((e) => {
        console.log(e);
      });
  } catch (err) {
    console.log('error:', err);
  }
});

//route to get trending shows for the week and process
module.exports = (router) => {
  router.get(
    '/trending',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
      try {
        getTrending()
          .then((response) => {
            return response.data.results;
          })
          .then((fullRes) => {
            showExistDriver(fullRes)
              .then((existSplit) => {
                res.locals.ids = {
                  ...existSplit.existing,
                  ...existSplit.newShow,
                };
                return existSplit;
              })
              .then((idsToQuery) => {
                getDetails(idsToQuery.newShow)
                  .then((newTVDetails) => {
                    return newTVDetails;
                  })
                  .then((rawDetails) => {
                    processTrend(rawDetails, idsToQuery.existing, true).then(
                      (processedTV) => {
                        res.status(200).send(res.locals.ids);
                        console.log(processedTV);
                      }
                    );
                  })
                  .catch((e) => {
                    res.status(500).send(`Error: ${e}`);
                  });
              })
              .catch((e) => {
                console.log('get details error', e);
                res.status(500).send(`Error: ${e}`);
              });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).send(`Error: ${e}`);
          });
      } catch (err) {
        console.log('error:', err);
        res.status(500).send(`Error: ${err}`);
      }
    }
  );

  router.get(
    '/movies/recommended/:id',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
      try {
        getRecommended(req.params.id)
          .then((response) => {
            return response.data.results;
          })
          .then((fullRes) => {
            showExistDriver(fullRes)
              .then((existSplit) => {
                res
                  .status(200)
                  .send({ ...existSplit.existing, ...existSplit.newShow });
                return existSplit;
              })
              .then((idsToQuery) => {
                getDetails(idsToQuery.newShow)
                  .then((newTVDetails) => {
                    return newTVDetails;
                  })
                  .then((rawDetails) => {
                    processTrend(rawDetails, null, null).then((processedTV) => {
                      console.log(processedTV);
                    });
                  })
                  .catch((e) => {
                    res.status(500).send(`Error: ${e}`);
                  });
              })
              .catch((e) => {
                console.log('get details error', e);
                res.status(500).send(`Error: ${e}`);
              });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).send(`Error: ${e}`);
          });
      } catch (err) {
        console.log('error:', err);
        res.status(500).send(`Error: ${err}`);
      }
    }
  );
};
