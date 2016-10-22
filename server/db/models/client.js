'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('client', {
    firstName: {
        type: Sequelize.STRING
    },
    lastName: {
        type: Sequelize.STRING
    },
    SSN: {
        type: Sequelize.INTEGER
    },
    DOB: {
        type: Sequelize.STRING
    },
    gender: {
        type: Sequelize.ENUM('0', '1', '2', '3', '4', '8', '9', '99')
    },
    race: {
        type: Sequelize.ENUM('1', '2', '3', '4', '8', '9', '99')
    },
    veteranStatus: {
        type: Sequelize.BOOLEAN
    },
    hasBC: {
        type: Sequelize.BOOLEAN
    },
    hasSSC: {
        type: Sequelize.BOOLEAN
    },
    phone: {
        type: Sequelize.STRING
    }
}, {
    getterMethods: {
        getGender: function(value) {
            var options = {
                '0': 'female', 
                '1': 'male', 
                '2': 'transgender M to F', 
                '3': 'transgender F to M', 
                '4': 'does not identify with M,F,T', 
                '8': 'unknown', 
                '9': 'refused', 
                '99': 'not collected', 
            }
            for (var key in options) {
                if (value === key) {
                    return options[key];
                }
            }
        }
    },
});