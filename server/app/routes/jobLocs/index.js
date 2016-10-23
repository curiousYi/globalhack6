'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
module.exports = router;
var _ = require('lodash');
var JobLocs = require('../../../db/models/jobLoc')

var ensureAuthenticated = function (req, res, next) {
    var err;
    if (req.isAuthenticated()) {
        next();
    } else {
        err = new Error('You must be logged in.');
        err.status = 401;
        next(err);
    }
};

router.get('/', ensureAuthenticated, function (req, res, next) {
    JobLocs.findAll()
    .then(function(leads) {
        res.json(leads);
    })
    .catch(next);
});

router.post('/', function(req, res, next){
    JobLocs.create(req.body)
    .then(function(job){
        console.log('SUCCESS', job)
        res.send(job)
    })
    .catch(next)
})