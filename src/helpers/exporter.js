import fs from 'fs';
import XLSX from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';
import { remote, app, shell } from 'electron'; // native electron module
var Excel = require('exceljs');
var exportToExcel= function(data,headers,width,nameSheet){
	var workbook = new Excel.Workbook();
	workbook.creator = "Sideka";
	workbook.created = new Date();
	var sheet = workbook.addWorksheet(nameSheet);
	var worksheet = workbook.getWorksheet(nameSheet);
	var dataHeader =[];
	var style={
		font : { name: 'Times New Roman', family: 4, size: 12, bold: true },		
		alignment: { vertical: "middle", horizontal: "center" }

	};

	if(nameSheet.toLowerCase() !="apbdes"){		
		for(var C = 0; C != headers.length; ++C) {
			var key = headers[C].replace(/ /g,"_").toLowerCase();
			dataHeader.push({
				header:headers[C],
				key:key,
				width:width[C],
				style:{border : {bottom: {style:"thin"}}}
			});
			
		}
		worksheet.columns=dataHeader;
	}else{
		for(var C = 0; C != headers.length; ++C) {
			var key = headers[C].replace(/ /g,"_").toLowerCase();
			if(C==0){
				for(var i=0; i!=4; i++)
					dataHeader.push({
						header:headers[C],
						key:key+[i],
						width:width[C],
						style:{border : {bottom: {style:"thin"}}}
					});
			}else{
				dataHeader.push({
					header:headers[C],
					key:key,
					width:width[C],
					style:{border : {bottom: {style:"thin"}}}
				})
			}
		}		
		worksheet.columns=dataHeader;
		worksheet.mergeCells("A1:D1");
	}
	
	worksheet.getRow(1).font = style.font;
	worksheet.getRow(1).alignment = style.alignment;

	//data
	for(var R = 0; R < data.length; ++R) {
		var data_row=[];
		for(var C = 0; C != data[R].length; ++C) {
			data_row[C] = data[R][C];
		}
		worksheet.addRow(data_row);
	}
	
	var fileName = remote.dialog.showSaveDialog({
		filters: [
			{name: 'Excell Workbook', extensions: ['xlsx']},
		]
	});

	if(fileName){
		workbook.xlsx.writeFile(fileName).then(
			function() {
				shell.openItem(fileName);
			},
			function(){
				remote.dialog.showErrorBox("Error", "File Masih Digunakan");
		});
	}
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
