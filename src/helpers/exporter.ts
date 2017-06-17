/// <reference path="../../app/typings/index.d.ts" />

import * as fs from 'fs';
import schemas from '../schemas';
var { remote, app, shell } = require('electron'); 

const Excel = require('exceljs');

var exportToExcel = (data, headers, width, nameSheet, lengthApbdesCode) => {
    let workbook = new Excel.Workbook();
	workbook.creator = "Sideka";
	workbook.created = new Date();
	let sheet = workbook.addWorksheet(nameSheet);
	let worksheet = workbook.getWorksheet(nameSheet);
	let dataHeader = [];

    let style={
		font : { name: 'Times New Roman', family: 4, size: 11, bold: true },		
		alignment: { vertical: "middle", horizontal: "center" },
		border: {top: {style:'thin'},left: {style:'thin'},bottom: {style:'thin'},right: {style:'thin'}}
	};	

    if(nameSheet.toLowerCase() !=="apbdes"){
        for(let i = 0; i != headers.length; ++i) {
			dataHeader.push({
				header:headers[i],
				width:width[i]
			});
		}
    }
    else{
        for(let i = 0; i != headers.length; ++i) {
            if(i > 0){
                dataHeader.push({ header:headers[i], width:width[i]});
                continue;
            }
                
			for(let j = 0; j != lengthApbdesCode; j++)
                dataHeader.push({header:"Kode Rekening", width:4, style: {alignment: {horizontal: "center" }}});
		}
    }

    worksheet.columns=dataHeader;

    if(nameSheet.toLowerCase() !=="apbdes"){
		//apply number format
		if(nameSheet.toLowerCase()==="data penduduk")
			var indexNIK = headers.indexOf("NIK");

		else if(nameSheet.toLowerCase() === "data keluarga")
			var indexNIK = headers.indexOf("NIK Kepala Keluarga");

		var indexNoKK = headers.indexOf("No KK");
		worksheet.getColumn(++indexNIK).numFmt = '@'; 
		worksheet.getColumn(++indexNoKK).numFmt = '@'; 
		worksheet.views = [{state: 'frozen', ySplit: 1, activeCell: 'A1'}];
	}
    else{
        var indexAnggaran;
		var col = String.fromCharCode(64 + lengthApbdesCode);

		worksheet.mergeCells('A1:'+col+1);		
		dataHeader.some((elem, i) => {
			return elem.header === 'Anggaran' ? (indexAnggaran = i, true) : false;
		});
		worksheet.getColumn(++indexAnggaran).numFmt  = '_([$Rp-id-ID]* #,##0_);_([$Rp-id-ID]* (#,##0);_([$Rp-id-ID]* "-"_);_(@_)';
    }

    for(let i = 0; i < data.length; ++i) {
		var dataRow = [];

		for(let j = 0; j != data[i].length; ++j) 
			dataRow[j] = data[i][j];
		
		worksheet.addRow(dataRow);
	}

    worksheet.getRow(1).font = style.font;
	worksheet.getRow(1).alignment = style.alignment;	

    var fileName = remote.dialog.showSaveDialog({
		filters: [{name: 'Excel Workbook', extensions: ['xlsx']}]
	});

    if(fileName){
        workbook.xlsx.writeFile(fileName).then(s => {
            shell.openItem(fileName);
        }).then(e => {
            var message = "File Masih Digunakan";

            if(e.code != "EBUSY")
                message = e.message;	

            remote.dialog.showErrorBox("Error", message);
        });
	}
};

var convertWidth = (width) => {
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push(width[i]/7);
	}
	return data;
};

var splitAccountCode = (data, maxLengthCode) => {
	var result=[];

	for(var i = 0; i != data.length;i++){
		var resultSplit =[];
		for(var x = 0; x != data[i].length; x++){			
			if(x==0){									
				var accountCode=[];
				if(data[i][x]!= null) accountCode = data[i][0].split(".");				
				for(var j=0;j != maxLengthCode;j++){
					if(accountCode[j]) resultSplit.push(parseInt(accountCode[j]));
					else resultSplit.push(null);
				}
			}
            else
				resultSplit.push(data[i][x]);			
		}
		result.push(resultSplit);
	}
	return result;	 
}

var getMaxLengthCode = (accountCodes) => {
	accountCodes = accountCodes.filter(c=>c != null);
	var longest = accountCodes.sort((a, b) => { return b.length - a.length; })[0];
	var maxLengthCode = longest.split(".");
	return maxLengthCode.length;
}

export var exportPenduduk = (data, nameSheet) => {	
    var headers = schemas.getHeader(schemas.penduduk);   
	var width = convertWidth(schemas.getColWidths(schemas.penduduk));  
	exportToExcel(data, headers, width, nameSheet, null);
};

export var exportKeluarga = (data,nameSheet) => {
	var headers = schemas.getHeader(schemas.keluarga);    
	var width = convertWidth(schemas.getColWidths(schemas.penduduk)); 
	exportToExcel(data, headers, width, nameSheet, null);		
};

export var exportApbdes = (data, nameSheet) => {	
	var accountCodes = data.map(c => c[0]);
	var maxLengthCode = getMaxLengthCode(accountCodes);
	var result = splitAccountCode(data, maxLengthCode);	
	var headers = schemas.getHeader(schemas.apbdes);
	var width = convertWidth(schemas.getColWidths(schemas.apbdes)); 
	exportToExcel(result, headers, width, nameSheet, maxLengthCode);	
};
