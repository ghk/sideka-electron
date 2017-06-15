import { Siskeudes } from '../src/stores/siskeudes';

var fileNameSiskeudes = 'C:\\microvac\\DATABASE\\siskeudes\\pancakarsa1_DataAPBDES2016.mde'
var siskeudes = new Siskeudes(fileNameSiskeudes);
var results = []

/*
import { apbdesImporterConfig, Importer } from '../src/helpers/importer';
var xlsx = require('xlsx');
// External lib
var importer = new Importer(apbdesImporterConfig);
var fileName = "C:\\Users\\Egoz\\Desktop\\desa\\APBDES NAPAN\\LAMPIRAN APBDes  2016.xlsx";
importer.init(fileName)
importer.onStartRowChanged({target:{value: "8"}});
console.log(importer.getResults());
//console.log(importer.maps)

var row_to_array = function(sheet, rowNum){
   var row;
   var colNum;
   var range = xlsx.utils.decode_range(sheet['!ref']);
   row = [];
   for(colNum=range.s.c; colNum<=range.e.c; colNum++){
        var nextCell = sheet[
            xlsx.utils.encode_c
            ell({r: rowNum, c: colNum})
        ];
        if( typeof nextCell === 'undefined' ){
            row.push(void 0);
        } else row.push(nextCell.w);
   }
   return row;
};

var workbook = xlsx.readFile(fileName);
var sheetName = workbook.SheetNames[0];
var ws = workbook.Sheets[sheetName]; 
console.log(sheetName);
var arr = row_to_array(ws, 7);
console.log(arr);
*/