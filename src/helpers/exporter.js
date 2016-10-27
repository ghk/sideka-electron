import fs from 'fs';
import XLSX from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';
import { remote, app, shell } from 'electron'; // native electron module
import Excel from 'exceljs';

var exportToExcel= function(data,headers,width,nameSheet){
	var workbook = new Excel.Workbook();
	workbook.creator = "Sideka";
	workbook.created = new Date();
	var sheet = workbook.addWorksheet(nameSheet);
	var worksheet = workbook.getWorksheet(nameSheet);
	var dataHeader =[];
	var style={
		font : { name: 'Times New Roman', family: 4, size: 12, bold: true },		
		alignment: { vertical: "middle", horizontal: "center" },
		border: {top: {style:'thin'},left: {style:'thin'},bottom: {style:'thin'},right: {style:'thin'}}

	};

	if(nameSheet.toLowerCase() !="apbdes"){		
		for(var C = 0; C != headers.length; ++C) {
			var row = 1;
			var cell =  generateColumn(row,C);
			if (!headers[C]) headers[C] = '';
			worksheet.getCell(cell).value = headers[C];	
			worksheet.getCell(cell).style = style;	
			worksheet.getColumn(C+1).width = width[C];				
		}
	}else{
		var col=1;
		for(var C = 0; C != headers.length; ++C) {
			var row = 1;
			if(C==0){
				for(var i=0;i<=3;i++){
					var cell =  generateColumn(row,i);
					if (!headers[C]) headers[C] = '';
					worksheet.getCell(cell).value = headers[C];	
					worksheet.getColumn(col).width = width[C];				
					worksheet.getCell(cell).style = style;					
					col++;
				}
			}else{
				var cell =  generateColumn(row,col-1);
				if (!headers[C]) headers[C] = '';
				worksheet.getCell(cell).value = headers[C];	
				worksheet.getColumn(col).width = width[C];				
				worksheet.getCell(cell).style = style;	
				col++;							
			}	
		}		
		worksheet.mergeCells("A1:D1");
	}
	

	//data
	for(var R = 0; R < data.length; ++R) {
		var data_row=[];
		for(var C = 0; C != data[R].length; ++C) {
			var row = R+2;
			var cell =  generateColumn(row,C)
			var getCell = String.fromCharCode(65+C);	

			if(nameSheet.toLowerCase() =="apbdes"){
				worksheet.getRow(1).height = 42;
				if(getCell=='F')
					worksheet.getCell(cell).numFmt  = '#,##0';				
				if(C<=4)
					worksheet.getCell(cell).alignment = style.alignment;
			}
			if (!data[R][C]) data[R][C] = '';			
			worksheet.getCell(cell).value = data[R][C];
			worksheet.getCell(cell).border = { 
				top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
			};
		}
	}
	
	var fileName = remote.dialog.showSaveDialog({
		filters: [
			{name: 'Excel Workbook', extensions: ['xlsx']},
		]
	});

	if(fileName){
		workbook.xlsx.writeFile(fileName).then(
			function() {
				shell.openItem(fileName);
			},
			function(e){
				var message = "File Masih Digunakan"
				if(e.code != "EBUSY")
					message = e.message;
					
				remote.dialog.showErrorBox("Error", message);
		});
	}
}

var generateColumn = function (Row, numberColumn){
	var indexOf =  function(i){
    return (i >= 26 ? indexOf((i / 26 >> 0) - 1) : '') +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26 >> 0];
	}
	return indexOf(numberColumn)+Row;
}

var convertWidth = function(width){
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push(width[i]/7);
	}
	return data;
}

var checkNum= function(n) { 
	return /^-?[\d.]+(?:e-?\d+)?$/.test(n) 
}

var parseAccountCode = function(data){
	var result=[];
	for(var i = 0; i != data.length;i++){
		var parse =[];
		for(var x = 0; x != data[i].length; x++){			
			if(x==0){									
				var accountCode=[];
				if(data[i][x]!= null) accountCode = data[i][0].split(".");				
				for(var j=0;j!=4;j++){
					var isNumber = checkNum(accountCode[j]);
					if(isNumber) parse.push(parseInt(accountCode[j]));
					else parse.push(null);
				}
			}else{
				var isNumber = checkNum(data[i][x]);
				if(isNumber) parse.push(parseInt(data[i][x]));
				else parse.push(data[i][x]);
			}
		}
		result.push(parse);
	}
	return result;	 
}

export var exportPenduduk = function(data, nameSheet)
{	
    var headers = schemas.getHeader(schemas.penduduk);   
	var width = convertWidth(schemas.getColWidths(schemas.penduduk));  
	exportToExcel(data,headers,width,nameSheet);
	
};

export var exportKeluarga = function(data,nameSheet)
{
	var headers = schemas.getHeader(schemas.keluarga);    
	var width = convertWidth(schemas.getColWidths(schemas.penduduk)); 
	exportToExcel(data,headers,width,nameSheet);	
	
};

export var exportApbdes = function(data, nameSheet)
{	
	var headers = schemas.getHeader(schemas.apbdes);
	var apbdes_data = parseAccountCode(data); 
	var width = [4,50,25,30];
	exportToExcel(apbdes_data,headers,width,nameSheet);	
};
