import fs from 'fs';
import XLSX from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';
import { remote, app, shell } from 'electron'; // native electron module

var FileSaver = require('file-saver');

var convert_array = function (data, headers, opts) {
	var ws = {};
	var range = XLSX.utils.encode_cell({c:headers.length,r:data.length});
	//headers
	for(var C = 0; C != headers.length; ++C) {
		var cell = {v: headers[C] };
		if(cell.v == null) continue;
		var cell_ref = XLSX.utils.encode_cell({c:C,r:0});
		cell.t = 's';
		cell.r = 'b';
		ws[cell_ref] = cell;
	}

	//data
	for(var R = 0; R < data.length; ++R) {
		for(var C = 0; C != data[R].length; ++C) {
			var cell = {v: data[R][C] };
			if(cell.v == null) continue;
			var Row = R; Row++;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:Row});
			
			cell.t = 's';
			ws[cell_ref] = cell;
		}
	}

	
	ws['!ref'] = "A1:"+range;;
	return ws;
}

var export_to_excel = function (ws,name,width){

	/* dummy workbook constructor */
	function Workbook() {
		if(!(this instanceof Workbook)) return new Workbook();
		this.SheetNames = [];
		this.Sheets = {};
	}
	var wb = new Workbook();
	
	wb.SheetNames.push(name);
	wb.Sheets[name] = ws;

	/* TEST: column widths */
	ws['!cols'] = width;

	/* bookType can be 'xlsx' or 'xlsm' or 'xlsb' */
	var wopts = { bookType:'xlsx', bookSST:false, type:'binary' };

	var wbout = XLSX.write(wb,wopts);

	function s2ab(s) {
		var buf = new ArrayBuffer(s.length);
		var view = new Uint8Array(buf);
		for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
		return buf;
	}
	
	var fileName = remote.dialog.showSaveDialog({
		filters: [
			{name: 'Excell Workbook', extensions: ['xlsx']},
		]
	});

	if(fileName){
		if(!fileName.endsWith(".xlsx"))
			fileName = fileName+".xlsx";
		
		var buf = new Buffer(s2ab(wbout));
		fs.writeFileSync(fileName, buf);
		shell.openItem(fileName);      
	}
}

var convert_width = function(width){
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push({"wch":width[i]/7});
	}
	return data;
}

export var exportPenduduk = function(data, name)
{	
    var headers = schemas.getHeader(schemas.penduduk);   
	var width = convert_width(schemas.getColWidths(schemas.penduduk));  
	var ws = convert_array(data, headers);
	export_to_excel(ws,filename,width);	

};

export var exportKeluarga = function(data,name)
{
	var headers = schemas.getHeader(schemas.keluarga);    
	var width = convert_width(schemas.getColWidths(schemas.penduduk));  
	var ws = convert_array(data, headers);
	export_to_excel(ws,name,width);		
	
};

export var exportApbdes = function(data, filename)
{	
    var headers = schemas.getHeader(schemas.apbdes);   
	var width = convert_width(schemas.getColWidths(schemas.apbdes));  
	var ws = convert_array(data, headers);
	export_to_excel(ws,filename,width);	

};
