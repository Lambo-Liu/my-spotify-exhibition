//
//  TO-DO LIST:
//   o Get data from API
//   o Organize data into object and pass into stats
//   o Frontend design for /stats page
//

const http = require("http");
const express = require("express");
const request = require("request");
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const path = require("path");
const url = require('url');

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
const hostname = "127.0.0.1";
const port = 3000;
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

const client_id = process.env.CLIENT_ID; // Client id
const client_secret = process.env.CLIENT_SECRET; // Secret key
const redirect_uri = "http://localhost:3000/stats"; // Redirect uri

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
    console.log("hi");
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
        const options = {
          url: "https://api.spotify.com/v1/me",
          headers: {"Authorization": "Bearer " + body.access_token},
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          //console.log(body);
        });
// !!!!!
        var songs = {
          url: "https://api.spotify.com/v1/me/top/tracks",
          limit: 50,
          headers: { "Authorization": "Bearer " + body.access_token},
          json: true
        };

        request.get(songs, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.render("stats");
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

app.listen(port, hostname, function() {
	console.log(`Server running at http://${hostname}:${port}/`);
});
