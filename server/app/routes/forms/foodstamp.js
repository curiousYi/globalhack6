var pdfFillForm = require('pdf-fill-form');
var fs = require('fs');
var pdfFillObj = {};
var clientObj = {}, incomeObj = {InformationDate: 0};
var xlsx = require('xlsx');
var disabilitiesArr = [];

// var db = require('./server/models/index').db;
// var Client = require('./server/models/index').Client;

var returnFoodStampsForm = function(First_Name, Last_Name, DOB){
  var workbook = xlsx.readFile(__dirname + '/govFormTemplates/sd.xlsx');
const allClientData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: true});
const allIncomeData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[7]], {raw: true});
const allDisabilities = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], {raw: true});

function getJsDateFromExcel(excelDate) {
  return new Date((excelDate - (25567 + 2)) * 86400 * 1000);
}

// console.log(allClientData);
// get Client UUID
// look up data via UUID
// hard code 90077 for now
allClientData.forEach(client => {
  if(client.UUID == 91501){
    clientObj = client;
  }
})
allIncomeData.forEach(item => {
  if(item.PersonalID == 91501){
    if(item.InformationDate > incomeObj.InformationDate){
      incomeObj = item;
    }
  }
})
allDisabilities.forEach(client => {
  if(client.PersonalID == 91501){
    disabilitiesArr.push(client);
  }
})

// reading data
return pdfFillForm.read(__dirname + '/govFormTemplates/foodstamp.pdf')
.then(res => {
  res.forEach(field => {
    console.log(field.name);

    // for each field in the pdf form, look in the database to see if there's relevant info
    if(field.name === 'FULL NAME'){
      if(clientObj.First_Name){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`;
      }
    }
    else if(field.name === 'CHK HOMELESS'){
      pdfFillObj[field.name] = true;
    }
    else if(field.name === 'HOME ADDRESS_1'){
      pdfFillObj[field.name] = "800 N Tucker Blvd";
    }
    else if(field.name === 'HOME ADDRESS_2'){
      if(clientObj.First_Name){
        pdfFillObj[field.name] = "St. Louis, MO 63101";
      }
    }
    else if(field.name === 'COUNTY_1'){
      pdfFillObj[field.name] = "St. Louis";
    }
    else if(field.name === 'PHONE_2'){
      pdfFillObj[field.name] = "(314) 802-0700";
    }
    else if(field.name === 'S3_FULL NAME.0'){
      pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`;
    }
    else if(field.name === 'S3_DOB.0'){
      if(clientObj.DOB !== 'NULL'){
        // console.log(clientObj.DOB, typeof clientObj.DOB)
        var clientDOB = new Date(getJsDateFromExcel(clientObj.DOB)).toISOString()
        // getJsDateFromExcel(clientObj.DOB)
        pdfFillObj[field.name] = clientDOB.slice(5, 7) + '/' + clientDOB.slice(8, 10) +  '/' + clientDOB.slice(0, 4) ;
      }
    }
    else if(field.name === 'S3_SSN.0'){
      if(clientObj.SSN !== 'NULL'){
        pdfFillObj[field.name] = clientObj.SSN;
      }
    }
    else if(field.name === 'S3_RACE.0'){
      var race = []
      if(clientObj.Asian === 1){
        race.push('Asian');
      }
      if(clientObj.Black === 1){
        race.push('Black');
      }
      if(clientObj.White === 1){
        race.push('White');
      }
      if(clientObj.AmIndAKNative === 1){
        race.push('Native American');
      }
      if(clientObj.NativeHIOtherPacific === 1){
        race.push('Native Hawaiian / Pacific Islander')
      }
      if(race.length > 0){
        pdfFillObj[field.name] = race.join(' ');
      }
      else{
        pdfFillObj[field.name] = 'unknown';
      }
    }
    else if(field.name === 'S5_2'){
      if(disabilitiesArr.length > 0){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME.0'){
      if(incomeObj.Earned === 1){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME_MONTHLY.0'){
      if(incomeObj.Earned === 1 && incomeObj.EarnedAmount){
        pdfFillObj[field.name] = incomeObj.EarnedAmount;
      }
    }
    else if(field.name === 'CHK_SSI'){
      if(incomeObj.SSDI === 1 || incomeObj.SocSecRetirement === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name === 'INCOME_WHO.0'){
      if(incomeObj.SSDI === 1 || incomeObj.SocSecRetirement === 1){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME_AMOUNT.0'){
      var total = 0;
      if(incomeObj.SSDI === 1){
        total += incomeObj.SSDIAmount;
      }
      if(incomeObj.SocSecRetirement === 1){
        total += incomeObj.SocSecRetirementAmount;
      }
      if(total > 0){
        pdfFillObj[field.name] = total;
      }
    }
    else if(field.name === 'CHK_SSI2'){
      if(incomeObj.SSI === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name === 'INCOME_WHO.1'){
      if(incomeObj.SSI === 1){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME_AMOUNT.1'){
      if(incomeObj.SSI === 1){
        pdfFillObj[field.name] = incomeObj.SSIAmount;
      }
    }
    else if(field.name === 'CHK_VA'){
      if(incomeObj.VADisabilityService === 1 || incomeObj.VADisabilityNonService === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name === 'INCOME_WHO.2'){
      if(incomeObj.VADisabilityService === 1 || incomeObj.VADisabilityNonService === 1){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME_AMOUNT.2'){
      var total = 0;
      if(incomeObj.VADisabilityService === 1){
        total += incomeObj.VADisabilityServiceAmount;
      }
      if(incomeObj.VADisabilityNonService === 1){
        total += incomeObj.VADisabilityNonServiceAmount;
      }
      if(total > 0){
        pdfFillObj[field.name] = total;
      }
    }
    else if(field.name === 'CHK_CS'){
      if(incomeObj.ChildSupport === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name === 'INCOME_WHO.3'){
      if(incomeObj.ChildSupport === 1){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME_AMOUNT.3'){
      pdfFillObj[field.name] = incomeObj.ChildSupportAmount;
    }
    else if(field.name === 'CHK_UB'){
      if(incomeObj.Unemployment === 1){
        pdfFillObj[field.name] = true;
      }
    }
    else if(field.name === 'INCOME_WHO.4'){
      if(incomeObj.Unemployment === 1){
        pdfFillObj[field.name] = `${clientObj.First_Name} ${clientObj.Middle_Name} ${clientObj.Last_Name}`
      }
    }
    else if(field.name === 'INCOME_AMOUNT.4'){
      pdfFillObj[field.name] = incomeObj.UnemploymentAmount;
    }


  })
  // write to form
  return pdfFillForm.write(__dirname + '/govFormTemplates/foodstamp.pdf',
  pdfFillObj,
  {
    "save": "pdf"
  } )

  })
}
module.exports = returnFoodStampsForm;


