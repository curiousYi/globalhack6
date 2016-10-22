var pdfFillForm = require('pdf-fill-form');
var fs = require('fs');
var data = [];

// reading data
pdfFillForm.read('ss-5.pdf')
.then(res => {
 // console.log(res);
 res.forEach(item => {
   data.push(item.name);
 })
 console.log(data);
})


// writing data
pdfFillForm.write('ss-5.pdf',
{
 "topmostSubform[0].Page5[0]?.firstname[0]": "myField fill value"
},
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
