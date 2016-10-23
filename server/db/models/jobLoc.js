var Sequelize = require('sequelize');

var db = require('../_db');

var JobLoc = db.define('jobLoc', {
    employer: {
        type: Sequelize.STRING
    },
    description: {
        type: Sequelize.TEXT
    },
    industry: {
        type: Sequelize.STRING
    },
    latitude: {
        type: Sequelize.FLOAT
    },
    longitude: {
        type: Sequelize.FLOAT
    }
});

module.exports = JobLoc;
