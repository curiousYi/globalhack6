var pdfFillForm = require('pdf-fill-form');
var fs = require('fs');
var pdfFillObj = {};
var clientObj;
var xlsx = require('xlsx');

// var db = require('./server/models/index').db;
// var Client = require('./server/models/index').Client;

var returnFilledSSCForm = function(){

  var workbook = xlsx.readFile(__dirname + '/govFormTemplates/sd.xlsx');

var allClientData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: true});

function getJsDateFromExcel(excelDate) {
  return new Date((excelDate - (25567 + 2))*86400*1000);
}

// console.log(allClientData);
// get Client UUID
// look up data via UUID
// hard code 90077 for now
allClientData.forEach(client => {
  if(client.UUID == 90077){
    clientObj = client;
  }
})

// reading data
return pdfFillForm.read(__dirname + '/govFormTemplates/social-security.pdf')
.then(res => {
  res.forEach(field => {
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
    else if(field.name.toLowerCase().search(/(?=.*first)(?=.*name)(?=.*card)/) > -1){
      if(clientObj.First_Name_Card){
        pdfFillObj[field.name] = clientObj.First_Name_Card
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*middle)(?=.*name)(?=.*card)/) > -1){
      if(clientObj.Middle_Name_Card){
        pdfFillObj[field.name] = clientObj.Middle_Name_Card
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*last)(?=.*name)(?=.*card)/) > -1){
      if(clientObj.Last_Name_Card){
        pdfFillObj[field.name] = clientObj.Last_Name_Card
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*first)(?=.*diff)(?=.*name)/) > -1){
      if(clientObj.First_Diff_Name){
        pdfFillObj[field.name] = clientObj.First_Diff_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*middle)(?=.*diff)(?=.*name)/) > -1){
      if(clientObj.Middle_Diff_Name){
        pdfFillObj[field.name] = clientObj.Middle_Diff_Name
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*last)(?=.*diff)(?=.*name)/) > -1){
      if(clientObj.Last_Diff_Name){
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
    else if(field.name.toLowerCase().search(/(?=.*date)(?=.*timefield1)/) > -1){

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
    // else if(clientObj.SSNDataQuality === 1 && field.name.toLowerCase().search(/(?=.*TextFieldName18\[0\])/) > -1){
    //   pdfFillObj[field.name] = 'RTZYPI'
    // }
    else if(field.name.toLowerCase().search(/(?=.*gender\[0\])/) > -1){
      if(clientObj.Gender === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*gender\[1\])/) > -1){
      if(clientObj.Gender === 0){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*asian)/) > -1){
      if(clientObj.Asian === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*black)/) > -1){
      if(clientObj.Black === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*hawaiian)/) > -1){
      if(clientObj.NativeHIOtherPacific === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*pacific)/) > -1){
      if(clientObj.NativeHIOtherPacific === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*white)/) > -1){
      if(clientObj.White === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*state)(?=.*birth)/) > -1){
      if(clientObj.Birth_State){
        pdfFillObj[field.name] = clientObj.Birth_State
      }
    }
    else if(field.name.toLowerCase().search(/(?=.*areacode)/) > -1){
      pdfFillObj[field.name] = "314";
    }
    else if(field.name.toLowerCase().search(/(?=.*phonenumber)/) > -1){
      pdfFillObj[field.name] = "802-0700";
    }
    else if(field.name.toLowerCase().search(/(?=.*street)(?=.*address)/) > -1){
      pdfFillObj[field.name] = "800 N Tucker Blvd";
    }
    else if(field.name.toLowerCase().search(/(?=.*mail)(?=.*city)/) > -1){
      pdfFillObj[field.name] = "St. Louis";

    }
    else if(field.name.toLowerCase().search(/(?=.*state)/) > -1){
      pdfFillObj[field.name] = "MO";

    }
    else if(field.name.toLowerCase().search(/(?=.*zipcode)/) > -1){
      pdfFillObj[field.name] = "63101";

    }
    else if(field.name.toLowerCase().search(/(?=.*datetimefield2\[1\])/) > -1){
      var currentDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

      pdfFillObj[field.name] = currentDate.getMonth() + 1 + '/' + currentDate.getDate() + '/' + currentDate.getFullYear();
    }

  })
  // write to form
  return pdfFillForm.write(__dirname + '/govFormTemplates/social-security.pdf',
  pdfFillObj,
  {
    "save": "pdf"
  } )
  // .then(function(result) {
  //   fs.writeFile(__dirname + "test123.pdf", result, function(err) {
  //     if(err) {
  //       return console.log(err);
  //     }
  //     console.log("The file was saved!");
  //   });
  // }, function(err) {
  //     console.log(err);
  // });

})
//the first .then ends




}

module.exports = returnFilledSSCForm;
