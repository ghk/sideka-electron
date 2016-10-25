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

var apbdes_convert_array = function (data, opts) {
	var ws = {};
	var range = XLSX.utils.encode_cell({c:8,r:data.length});
		
	for(var R = 0; R < data.length; ++R) {
		for(var C = 0; C != data[R].length; ++C) {
			var cell = {v: data[R][C] };
			if(cell.v == null) continue;
			var Row = R; Row++;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:Row});
			
			if(typeof cell.v === 'number') cell.t = 'n';
			else if(typeof cell.v === 'boolean') cell.t = 'b';
			else if(cell.v instanceof Date) {
				cell.t = 'n'; cell.z = XLSX.SSF._table[14];
				cell.v = datenum(cell.v);
			}
			else cell.t = 's';

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
		 try{
			 fs.writeFileSync(fileName, buf);
			 shell.openItem(fileName); 
		 }
		 catch(err){
			 remote.dialog.showErrorBox("Error", "File Masih Digunakan");
		 }
		     
	}
}

var convert_width = function(width){
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push({"wch":width[i]/7});
	}
	return data;
}

var parse_account_code = function(data){
	var result=[];
		for(var i = 0; i != data.length;i++){
			var parse =[];
			for(var x = 0; x != data[i].length; x++){
				if(x==0){
					var account_code=[];
					if(data[i][x]!= null)
						account_code = data[i][0].split(".");
					
					for(var j=0;j<=3;j++){
						if(account_code[j]!= null)
							parse.push(parseInt(code[j]));
						else
							parse.push(null);
					}

				}
				else
					parse.push(data[i][x]);
			}
			result.push(parse);
		}
		return result;
}

export var exportPenduduk = function(data, filename)
{	
    var headers = schemas.getHeader(schemas.penduduk);   
	var width = convert_width(schemas.getColWidths(schemas.penduduk));  
	var ws = convert_array(data, headers);
	export_to_excel(ws,filename,width);	

};

export var exportKeluarga = function(data,filename)
{
	var headers = schemas.getHeader(schemas.keluarga);    
	var width = convert_width(schemas.getColWidths(schemas.penduduk));  
	var ws = convert_array(data, headers);
	export_to_excel(ws,filename,width);		
	
};

export var exportApbdes = function(data, filename)
{	
    var headers = schemas.getHeader(schemas.apbdes);
	var width = [
		{wch:3},{wch:3},{wch:3},{wch:3},{wch:50},{wch:25},{wch:30}
	]
	var ws = apbdes_convert_array(parser(data));
	export_to_excel(ws,filename,width);	
	
};
