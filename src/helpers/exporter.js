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
		font : { name: 'Times New Roman', family: 4, size: 11, bold: true },		
		alignment: { vertical: "middle", horizontal: "center" },
		border: {top: {style:'thin'},left: {style:'thin'},bottom: {style:'thin'},right: {style:'thin'}}

	};

	//headers
	for(var C = 0; C != headers.length; ++C) {
		dataHeader.push({
			header:headers[C],
			width:width[C]
		})
	}
	worksheet.columns=dataHeader;

	if(nameSheet !=="Apbdes"){
		//apply number format
		if(nameSheet==="Data Penduduk")
			var indexNik = headers.indexOf("Nik");
		else if(nameSheet === "Data Keluarga")
			var indexNik = headers.indexOf("NIK Kepala Keluarga");	
		var indexNoKK = headers.indexOf("No KK");

		worksheet.getColumn(++indexNik).numFmt = '@'; 
		worksheet.getColumn(++indexNoKK).numFmt = '@'; 
			
	}else{
		var indexAnggaran = headers.indexOf("Anggaran");
		worksheet.getColumn(++indexAnggaran).numFmt  = '#,##0';; 
	}
	//data
	for(var R = 0; R < data.length; ++R) {
		var data_row=[];
		for(var C = 0; C != data[R].length; ++C) {
			data_row[C] = data[R][C];
		}
		worksheet.addRow(data_row);
	}

	//apply style
	worksheet.getRow(1).font = style.font;
	worksheet.getRow(1).alignment = style.alignment;	

	
	
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

var convertWidth = function(width){
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push(width[i]/7);
	}
	return data;
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
	var width = convertWidth(schemas.getColWidths(schemas.apbdes)); 
	exportToExcel(data,headers,width,nameSheet);	
};
