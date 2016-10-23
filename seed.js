/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/
var xlsx = require('xlsx');

var workbook = xlsx.readFile('sd.xlsx');
var sheetNames = workbook.SheetNames;

var chalk = require('chalk');
var db = require('./server/db');
var User = db.model('user');
var Client = db.model('client');
var Promise = require('sequelize').Promise;

var seedUsers = function () {

    var users = [
        {
            email: 'testing@fsa.com',
            password: 'password'
        },
        {
            email: 'obama@gmail.com',
            password: 'potus'
        }
    ];

    var creatingUsers = users.map(function (userObj) {
        return User.create(userObj);
    });

    return Promise.all(creatingUsers);

};
var seedClients = function () {
    var clients = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

// return Client.bulkCreate(xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]))
    // var clients = [
    //     {
    //         First_Name: 'John',
    //         Last_Name: 'Doe',
    //         SSN: 111223333,
    //         DOB: '1940',
    //         Gender: '1',
    //         race: '2',
    //         VeteranStatus: true,
    //         hasBC: true,
    //         hasSSC: false,
    //         phone: '8885550000',
    //     }
    // ];

    var creatingClients = clients.map(function (clientObj) {
        return Client.create(clientObj);
    });

    return Promise.all(creatingClients);

};

db.sync({ force: true })
    .then(function () {
        return seedUsers();
    })
    .then(function () {
        return seedClients();
    })
    .then(function () {
        console.log(chalk.green('Seed successful!'));
        process.exit(0);
    })
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });
