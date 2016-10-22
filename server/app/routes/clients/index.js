'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
module.exports = router;
var _ = require('lodash');
var Client = require('../../../db/models/client')

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

router.get('/indiv', ensureAuthenticated, function (req, res, next) {
    Client.findOne({
        where: {
            firstName: req.query.firstName, 
            lastName: req.query.lastName, 
            DOB: req.query.DOB, 
        }
    })
    .then(function(client){
        console.log('here is client info', client)
        res.send(client);
    })
    .catch(next);
});
