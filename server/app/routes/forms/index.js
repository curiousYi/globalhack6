'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
var fs = require('fs');
var bc = require('./birthCertificate');
var sc = require('./socialsecurity');


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

    var tempFile = __dirname + '/govFormTemplates/birth-certificate.pdf'
    fs.readFile(tempFile, function(err, data){
        if (err) return next(err);
        res.contentType('application/pdf');
        res.send(data);
    })

});

router.get('/birth-certificate/complete', ensureAuthenticated, function(req, res, next){

    console.log(req.query);

    bc(req.query.firstname, req.query.lastname, req.query.DOB).then(function(result){
        console.log('hello');
        return fs.writeFile(__dirname + "testabc.pdf", result, function(err) {
          if(err) {
            return console.log(err);
          }
          console.log("The file was saved!");
        });
      })
      .then(function(){
        fs.readFile( __dirname + "testabc.pdf", function(err, data){
            if (err) return next(err);
            res.contentType('application/pdf');
            res.send(data);
        })
      })
      .catch(function(err){
        console.log('something went wrong ', err)
      })

})

router.get('/social-security/complete', ensureAuthenticated, function(req, res, next){
    console.log(req.query);

    sc().then(function(result){
        console.log('hello');
        return fs.writeFile(__dirname + "test123.pdf", result, function(err) {
          if(err) {
            return console.log(err);
          }
          console.log("The file was saved!");
        });
      })
      .then(function(){
        fs.readFile( __dirname + "test123.pdf", function(err, data){
            if (err) return next(err);
            res.contentType('application/pdf');
            res.send(data);
        })
      })
      .catch(function(err){
        console.log('something went wrong ', err)
      })


})
router.get('/social-security', ensureAuthenticated, function (req, res, next) {

    var tempFile = __dirname + '/govFormTemplates/social-security.pdf'
    fs.readFile(tempFile, function(err, data){
        if (err) return next(err);
        res.contentType('application/pdf');
        res.send(data);
    })

});

module.exports = router;
