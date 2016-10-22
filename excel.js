var xlsx = require('xlsx');
var db = require('./server/models/index').db;
var Client = require('./server/models/index').Client;

var workbook = xlsx.readFile('sd.xlsx');
var sheetNames = workbook.SheetNames;


// console.log(xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));
// all client data in json form

// console.log(xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));

Client.bulkCreate(xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]))
.then(res => {
  // console.log(res);
})

// db.sync({force: true})

