// ExpressJS Core
require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
// Events
const EventEmitter = require("events");
const eventEmitter = new EventEmitter();

// Init Server
var app = express();

// Register Middlewares
app.use(cors("*"));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("eventEmitter", eventEmitter);
app.use("/uploads", express.static("uploads"));

// Health Check Route
app.get("/status", require("./modules/core/status"));

app.use("*", require("./modules/core/middlewares/auth"));

// Register Modules

app.use("/v1/recordings", require("./modules/recording"));

app.use("/v1/call", require("./modules/call"));
app.use("/v1/calls", require("./modules/call/routes-calls"));

app.use("/v1/billing", require("./modules/billing"));

// Error Handle
app.use(require("./modules/core/middlewares/error-handler"));

require("./asterisk/ari.handler");

// Export for Running Tests
module.exports = app;
