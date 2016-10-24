import fs from 'fs';
import XLSX from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';
import { remote, app, shell } from 'electron'; // native electron module

var FileSaver = require('file-saver');

var convert_array = function (data, headers, opts) {
	var ws = {};
	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
	//headers
	for(var R = 0; R < 1; ++R) {
		for(var C = 0; C != headers.length; ++C) {
			var cell = {v: headers[C] };
			if(cell.v == null) continue;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});
			cell.t = 's';
			ws[cell_ref] = cell;
		}
	}
	//data
	for(var R = 1; R != data.length; ++R) {
		for(var C = 0; C != data[R].length; ++C) {
			var cell = {v: data[R][C] };
			if(cell.v == null) continue;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});
			cell.t = 's';
			ws[cell_ref] = cell;
		}
	}

	/* TEST: proper range */
	ws['!ref'] = "A1:AW100000";;
	return ws;
}

var export_to_excell = function (ws,filename){
	var ws_name = filename;
	var wscols = [
		{wch:6},
		{wch:7},
		{wch:10},
		{wch:20}
	];

	/* dummy workbook constructor */
	function Workbook() {
		if(!(this instanceof Workbook)) return new Workbook();
		this.SheetNames = [];
		this.Sheets = {};
	}
	var wb = new Workbook();

	/* TEST: add worksheet to workbook */
	wb.SheetNames.push(ws_name);
	wb.Sheets[ws_name] = ws;

	/* TEST: column widths */
	ws['!cols'] = wscols;

	/* bookType can be 'xlsx' or 'xlsm' or 'xlsb' */
	var wopts = { bookType:'xlsx', bookSST:false, type:'binary' };

	var wbout = XLSX.write(wb,wopts);

	function s2ab(s) {
		var buf = new ArrayBuffer(s.length);
		var view = new Uint8Array(buf);
		for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
		return buf;
	}

	/* the saveAs call downloads a file on the local machine */
	FileSaver.saveAs(new Blob([s2ab(wbout)],{type:""}), ws_name+".xlsx");
}


export var exportPenduduk = function(data, filename)
{	
    var headers = schemas.getHeader(schemas.penduduk);    
	var ws = convert_array(data, headers);
	export_to_excell(ws,filename);	

};

export var exportKeluarga = function(data,filename)
{
	var headers = schemas.getHeader(schemas.keluarga);    
	var ws = convert_array(data, headers);
	export_to_excell(ws,filename);	
	
};
