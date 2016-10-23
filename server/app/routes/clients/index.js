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

router.get('/', ensureAuthenticated, function (req, res, next) {
    Client.findOne({
        where: {
            First_Name: req.query.firstName,
            Last_Name: req.query.lastName,
            DOB: req.query.DOB,
        }
    })
    .then(function(client){
        res.send(client);
    })
    .catch(next);
});

router.post('/', function(req, res, next){
    Client.create(req.body)
    .then(function(person){
        res.send(person)
    })
})

router.put('/', function(req, res, next){
    Client.findOne({
        where: {
            First_Name: req.body.firstName,
            Last_Name: req.body.lastName,
            DOB: req.body.DOB,
        }
    })
    .then(function(person){
        return person.update({
            First_Name: req.body.firstName,
            Last_Name: req.body.lastName,
            SSN: req.body.SSN,
            DOB: req.body.DOB,
            Gender: req.body.gender,
            Race: req.body.race,
            VeteranStatus: req.body.veteranStatus,
            phone: req.body.phone
        })
    })
    .then(function(updatedPerson){
        res.send(updatedPerson);
    })
})
