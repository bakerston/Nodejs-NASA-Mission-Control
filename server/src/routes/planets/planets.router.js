const express = require('express');

const {
    httpGetAllPlanets,
} = require('./planets.controller');

const plaentsRouter = express.Router();


plaentsRouter.get('/', httpGetAllPlanets);


module.exports = plaentsRouter;