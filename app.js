const http = require("http");
const express = require("express");
const path = require("path");

const app = express();

const hostname = "127.0.0.1";
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/modules/fontawesome", express.static(__dirname + "/node_modules/@fortawesome/fontawesome-free/"));
app.use("/modules/animate", express.static(__dirname + "/node_modules/animate.css/"));
app.use("/modules/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));
app.use("/modules/jquery", express.static(__dirname + "/node_modules/jquery/dist/"));

const indexRouter = require("./routes/index.js");
app.use("/", indexRouter);

app.listen(port, hostname, function() {
	console.log(`Server running at http://${hostname}:${port}/`);
});
