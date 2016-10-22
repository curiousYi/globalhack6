var pdfFillForm = require('pdf-fill-form');
var fs = require('fs');
var pdfFillObj = {};
var clientObj;
var xlsx = require('xlsx');
var rita = require('rita');
var RS = rita.RiString;
const r = rita.Rita;

// var db = require('./server/models/index').db;
// var Client = require('./server/models/index').Client;

var workbook = xlsx.readFile('sd.xlsx');

var allClientData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: true});


function getJsDateFromExcel(excelDate) {

// JavaScript dates can be constructed by passing milliseconds
// since the Unix epoch (January 1, 1970) example: new Date(12312512312);

// 1. Subtract number of days between Jan 1, 1900 and Jan 1, 1970, plus 1 (Google "excel leap year bug")
// 2. Convert to milliseconds.

return new Date((excelDate - (25567 + 2))*86400*1000);

}


// console.log(allClientData);
// get Client UUID
// look up data via UUID
// hard code 90077 for now
allClientData.forEach(client => {
  if(client.UUID == 90077){
    clientObj = client;
    // console.log(client);
  }
})
// console.log(clientObj);

// reading data
pdfFillForm.read('ss-5.pdf')
.then(res => {
  // console.log(res);
  res.forEach(field => {
    console.log(field.name);
    // for each field in the pdf form, look in the database to see if there's relevant info
    if(field.name.toLowerCase().search(/(?=.*mother)(?=.*first)(?=.*name)/) > -1){
      if(clientObj.Mother_First_Name){
        pdfFillObj[field.name] = clientObj.Mother_First_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*mother)(?=.*middle)(?=.*name)/) > -1){
      if(clientObj.Mother_Middle_Name){
        pdfFillObj[field.name] = clientObj.Mother_Middle_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*mother)(?=.*last)(?=.*name)/) > -1){
      if(clientObj.Mother_Last_Name){
        pdfFillObj[field.name] = clientObj.Mother_Last_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*father)(?=.*first)(?=.*name)/) > -1){
      if(clientObj.Father_First_Name){
        pdfFillObj[field.name] = clientObj.Father_First_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*father)(?=.*middle)(?=.*name)/) > -1){
      if(clientObj.Father_Middle_Name){
        pdfFillObj[field.name] = clientObj.Father_Middle_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*father)(?=.*last)(?=.*name)/) > -1){
      if(clientObj.Father_Last_Name){
        pdfFillObj[field.name] = clientObj.Father_Last_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*first)(?=.*diff)(?=.*name)/) > -1){
      if(clientObj.First_Name){
        pdfFillObj[field.name] = clientObj.First_Diff_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*middle)(?=.*diff)(?=.*name)/) > -1){
      if(clientObj.Middle_Name){
        pdfFillObj[field.name] = clientObj.Middle_Diff_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*last)(?=.*diff)(?=.*name)/) > -1){
      if(clientObj.Last_Name){
        pdfFillObj[field.name] = clientObj.Last_Diff_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*first)(?=.*name)/) > -1){
      if(clientObj.First_Name){
        pdfFillObj[field.name] = clientObj.First_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*middle)(?=.*name)/) > -1){
      if(clientObj.Middle_Name){
        pdfFillObj[field.name] = clientObj.Middle_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*last)(?=.*name)/) > -1){
      if(clientObj.Last_Name){
        pdfFillObj[field.name] = clientObj.Last_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*city)(?=.*birth)/) > -1){
      if(clientObj.Birth_City){
        pdfFillObj[field.name] = clientObj.Birth_City
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*state)(?=.*birth)/) > -1){
      if(clientObj.Birth_State){
        pdfFillObj[field.name] = clientObj.Birth_State
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*state)(?=.*birth)/) > -1){
      if(clientObj.Birth_State){
        pdfFillObj[field.name] = clientObj.Birth_State
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*date)(?=.*time)/) > -1){
      if(clientObj.DOB){
        // console.log(clientObj.DOB, typeof clientObj.DOB)
        var clientDOB = new Date(getJsDateFromExcel(clientObj.DOB)).toISOString()
        // getJsDateFromExcel(clientObj.DOB)
        pdfFillObj[field.name] = clientDOB.slice(5, 7) + '/' + clientDOB.slice(8, 10) +  '/' + clientDOB.slice(0, 4) ;
      }
    }
    else if(clientObj.SSNDataQuality === 1 && field.name.toLowerCase().search(/(?=.*oldssnxxx\[0\])/) > -1){
        pdfFillObj[field.name] = clientObj.SSN.slice(0,3)
    }
    else if(clientObj.SSNDataQuality === 1 && field.name.toLowerCase().search(/(?=.*oldssnxx\[0\])/) > -1){
        pdfFillObj[field.name] = clientObj.SSN.slice(3,5);

    }
    else if(clientObj.SSNDataQuality === 1 && field.name.toLowerCase().search(/(?=.*oldssnxxxx\[0\])/) > -1){
      pdfFillObj[field.name] = clientObj.SSN.slice(5,9)

    }
    else if(clientObj.SSNDataQuality === 1 && field.name.toLowerCase().search(/(?=.*TextFieldName18\[0\])/) > -1){
      pdfFillObj[field.name] = 'RTZYPI'

    }
    else if(field.name.toLowerCase().search(/(?=.*gender\[0\])/) > -1){
      pdfFillObj[field.name] = true;
    }

    // console.log(pdfFillObj);



  })
  pdfFillForm.write('ss-5.pdf',
  pdfFillObj,
  {
    "save": "pdf"
  } )
  .then(function(result) {
    fs.writeFile("test123.pdf", result, function(err) {
      if(err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });
  }, function(err) {
      console.log(err);
  });
  data.forEach(field => {
    pdfFillObj[field] = "hello";
  })
  console.log(pdfFillObj);
})


// writing data


// console.log(data);
// data.forEach(field => {
//   console.log(field);
// })
