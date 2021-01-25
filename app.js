//
//  TO-DO LIST:
//   o Get statistics like danceability, accousticness, etc. into songs
//   o Play artist songs
//   o Mute button / volume control
//

const http = require("http");
const express = require("express");
const request = require("request");
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const path = require("path");
const url = require("url");
const aws = require("aws-sdk");

var redirect_uri = "https://my-spotify-exhibition.com/stats"; // Redirect uri

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
  redirect_uri = "http://localhost:3000/stats"; // Redirect uri
}

const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.SECRET;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors())
app.use(cookieParser(secret));

app.use("/modules/fontawesome", express.static(__dirname + "/node_modules/@fortawesome/fontawesome-free/"));
app.use("/modules/animate", express.static(__dirname + "/node_modules/animate.css/"));
app.use("/modules/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));
app.use("/modules/jquery", express.static(__dirname + "/node_modules/jquery/dist/"));

let s3 = new aws.S3({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET
});

const client_id = s3.client_id || process.env.CLIENT_ID; // Client id
const client_secret = s3.client_secret || process.env.CLIENT_SECRET; // Secret key

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = "spotify_auth_state";

function getArtistTopTracks(artist, access_token, callback) {
  const artistTopSongRequest = {
    url: "https://api.spotify.com/v1/artists/" + artist.id + "/top-tracks?market=US",
    headers: { "Authorization": "Bearer " + access_token},
    json: true
  };

  request.get(artistTopSongRequest, function(error, response, topSongs) {
    callback(topSongs);
  });
}

function addArtistsTopSong(artists, access_token, i, callback) {
  getArtistTopTracks(artists.items[i], access_token, function(topSongs) {
    if (i + 1 === artists.items.length) {
      callback(artists);
    } else {
      artists.items[i].preview_url = topSongs.tracks[0].preview_url;
      i++;
      addArtistsTopSong(artists, access_token, i, callback);
    }
  });
}

app.get("/login", function(req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scope = "user-read-private user-read-email user-read-recently-played user-top-read";
  res.redirect("https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get("/stats", function(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect("/login");
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        "Authorization": "Basic " + (Buffer.from(client_id + ":" + client_secret).toString("base64"))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const profile = {
          url: "https://api.spotify.com/v1/me",
          headers: {"Authorization": "Bearer " + body.access_token},
          json: true
        };

        const shortTermSongs = {
          url: "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50",
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        const mediumTermSongs = {
          url: "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50",
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        const longTermSongs = {
          url: "https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50",
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        const shortTermArtists = {
          url: "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=50",
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        const mediumTermArtists = {
          url: "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=50",
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        const longTermArtists = {
          url: "https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=50",
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        request.get(profile, function(error, response, profile) {
          request.get(shortTermSongs, function(error, response, shortTermSongs) {
            request.get(mediumTermSongs, function(error, response, mediumTermSongs) {
              request.get(longTermSongs, function(error, response, longTermSongs) {
                request.get(shortTermArtists, function(error, response, shortTermArtists) {
                  request.get(mediumTermArtists, function(error, response, mediumTermArtists) {
                    request.get(longTermArtists, function(error, response, longTermArtists) {
                      // if (shortTermArtists.total >= 1) {
                      //   addArtistsTopSong(shortTermArtists, body.access_token, 0, function(shortTermArtists) {
                      //     if (mediumTermArtists.total >= 1) {
                      //       addArtistsTopSong(mediumTermArtists, body.access_token, 0, function(mediumTermArtists) {
                      //         if (longTermArtists.total >= 1) {
                      //           addArtistsTopSong(longTermArtists, body.access_token, 0, function(longTermArtists) {
                      //             res.render("stats", {profile, shortTermSongs, mediumTermSongs, longTermSongs, shortTermArtists, mediumTermArtists, longTermArtists});
                      //           });
                      //         } else {
                      //           res.render("stats", {profile, shortTermSongs, mediumTermSongs, longTermSongs, shortTermArtists, mediumTermArtists, longTermArtists});
                      //         }
                      //       });
                      //     } else {
                      //       res.render("stats", {profile, shortTermSongs, mediumTermSongs, longTermSongs, shortTermArtists, mediumTermArtists, longTermArtists});
                      //     }
                      //   });
                      // } else {
                        res.render("stats", {profile, shortTermSongs, mediumTermSongs, longTermSongs, shortTermArtists, mediumTermArtists, longTermArtists});
                      // }
                    });
                  });
                });
              });
            });
          });
        });

      } else {
				res.redirect('/?' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get("/refresh_token", function(req, res) {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: { "Authorization": "Basic " + (Buffer.from(client_id + ":" + client_secret).toString("base64")) },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        "access_token": access_token
      });
    }
  });
});

app.get("/", function(req, res) {
  res.render("home");
});

app.listen(port, function() {;
	console.log("Server running");
});
