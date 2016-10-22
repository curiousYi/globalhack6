'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
var fs = require('fs');

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

router.get('/birth-certificate', ensureAuthenticated, function (req, res, next) {

    var tempFile = '/Users/yichao/Desktop/globalhack6/public/govFormTemplates/birth-certificate.pdf'

    fs.readFile(tempFile, function(err, data){
        if (err) return next(err);
        res.contentType('application/pdf');
        res.send(data);
    })

});

router.get('/social-security', ensureAuthenticated, function (req, res, next) {

    var tempFile = '/Users/yichao/Desktop/globalhack6/public/govFormTemplates/social-security.pdf'

    fs.readFile(tempFile, function(err, data){
        if (err) return next(err);
        res.contentType('application/pdf');
        res.send(data);
    })

});

module.exports = router;
