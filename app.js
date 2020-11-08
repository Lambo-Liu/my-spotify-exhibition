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

const indexRouter = require("./routes/index.js");
app.use("/", indexRouter);

app.listen(port, hostname, function() {
	console.log(`Server running at http://${hostname}:${port}/`);
});
