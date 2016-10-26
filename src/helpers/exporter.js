import fs from 'fs';
import XLSX from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';
import { remote, app, shell } from 'electron'; // native electron module


var Excel = require('exceljs');

var export_to_excel= function(data,headers,width,name_sheet){
	var workbook = new Excel.Workbook();
	workbook.creator = "Sideka";
	workbook.created = new Date();
	var sheet = workbook.addWorksheet(name_sheet);
	var worksheet = workbook.getWorksheet(name_sheet);
	var data_header =[];

	if(name_sheet.toLowerCase() !="apbdes"){		
		for(var C = 0; C != headers.length; ++C) {
			var key = headers[C].replace(/ /g,"_").toLowerCase();
			data_header.push({
				header:headers[C],
				key:key,
				width:width[C]
			})
		}
		worksheet.columns=data_header;
	}else{
		for(var C = 0; C != headers.length; ++C) {
			var key = headers[C].replace(/ /g,"_").toLowerCase();
			if(C==0){
				for(var i=0; i!=4; i++)
					data_header.push({
						header:headers[C],
						key:key+[i],
						width:width[C]
					});
			}else{
				data_header.push({
					header:headers[C],
					key:key,
					width:width[C]
				})
			}
		}
		
		worksheet.columns=data_header;
		worksheet.mergeCells("A1:D1");
	}

	//data
	for(var R = 0; R < data.length; ++R) {
		var data_row=[];
		for(var C = 0; C != data[R].length; ++C) {
			data_row[C] = data[R][C];
		}
		worksheet.addRow(data_row);
	}

	worksheet.getRow(1).font = { name: 'Times New Roman', family: 4, size: 12, bold: true };
	worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
	worksheet.getRow(1).border = {bottom: {style:"thin"}};
	
	var fileName = remote.dialog.showSaveDialog({
		filters: [
			{name: 'Excell Workbook', extensions: ['xlsx']},
		]
	});

	workbook.xlsx.writeFile(fileName)
		.then(function() {
			 shell.openItem(fileName);
	});

}

var convert_width = function(width){
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push(width[i]/7);
	}
	return data;
}

var checkNum= function(n) { 
	return /^-?[\d.]+(?:e-?\d+)?$/.test(n) 
}

var parse_account_code = function(data){
	var result=[];
	for(var i = 0; i != data.length;i++){
		var parse =[];
		for(var x = 0; x != data[i].length; x++){			
			if(x==0){									
				var account_code=[];
				if(data[i][x]!= null) account_code = data[i][0].split(".");				
				for(var j=0;j!=4;j++){
					var isNumber = checkNum(account_code[j]);
					if(isNumber) parse.push(parseInt(account_code[j]));
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

export var exportPenduduk = function(data, name_sheet)
{	
    var headers = schemas.getHeader(schemas.penduduk);   
	var width = convert_width(schemas.getColWidths(schemas.penduduk));  
	export_to_excel(data,headers,width,name_sheet);
	
};

export var exportKeluarga = function(data,name_sheet)
{
	var headers = schemas.getHeader(schemas.keluarga);    
	var width = convert_width(schemas.getColWidths(schemas.penduduk)); 
	export_to_excel(data,headers,width,name_sheet);	
	
};

export var exportApbdes = function(data, name_sheet)
{	
	var headers = schemas.getHeader(schemas.apbdes);
	var apbdes_data = parse_account_code(data); 
	var width = [4,50,25,30];
	export_to_excel(apbdes_data,headers,width,name_sheet);	
};
