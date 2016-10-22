'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
module.exports = router;

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

router.get('/birth-certificate', ensureAuthenticated, function (req, res) {
    console.log('in the birth cert route')
    res.send('hi')

});
