import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import { importPenduduk } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import dataapi from '../dataapi/dataapi';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { initializeOnlineStatusImg } from '../helpers/misc'; 
import expressions from 'angular-expressions';
import printvars from '../helpers/printvars';

var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("Data Penduduk - " +dataapi.getActiveAuth().desa_name);
    initializeOnlineStatusImg($(".navbar-brand img")[0]);

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    window.hot = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.penduduk),
        columns: schemas.penduduk,

        colWidths: schemas.getColWidths(schemas.penduduk),
        rowHeights: 23,
        
        columnSorting: true,
        sortIndicator: true,
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        filters: true,
        contextMenu: ['row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    });
    
    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot, document, formSearch, inputSearch);
    
    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot, spanCount);

    window.addEventListener('resize', function(e){
        hot.render();
    })
 
    var importExcel = function(){
        var files = remote.dialog.showOpenDialog();
        if(files && files.length){
            var objData = importPenduduk(files[0]);
            var data = objData.map(o => schemas.objToArray(o, schemas.penduduk));

            hot.loadData(data);
            $(emptyContainer).addClass("hidden");
            $(sheetContainer).removeClass("hidden");
            setTimeout(function(){
                hot.render();
            },500);
        }
    }

    var exportExcel = function(){        
        var data = hot.getSourceData();
        exportPenduduk(data, "Data Penduduk");
    }

    document.getElementById('btn-open').onclick = importExcel;
    document.getElementById('btn-open-empty').onclick = importExcel;
    document.getElementById('btn-export').onclick = exportExcel;
    var insertRow = function(){
        $(emptyContainer).addClass("hidden");
        $(sheetContainer).removeClass("hidden");
        hot.alter("insert_row", 0);
        hot.selectCell(0, 0, 0, 0, true);
    }
    document.getElementById('btn-insert').onclick = insertRow;
    document.getElementById('btn-insert-empty').onclick = insertRow;

    document.getElementById('btn-save').onclick = function(){
        $(".alert").removeClass("hidden").html("Menyimpan...");
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getSourceData()
        };
        
        dataapi.saveContent("penduduk", content, function(err, response, body){
            $(".alert").html("Penyimpanan "+ (err ? "gagal" : "berhasil"));
            setTimeout(function(){
                $(".alert").addClass("hidden");
            }, 2000);
        });
    };

    document.getElementById('btn-print').onclick = function(){
        var selected = hot.getSelected();
        if(!selected)
            return;
        var fileName = remote.dialog.showSaveDialog({
            filters: [
                {name: 'Word document', extensions: ['docx']},
            ]
        });
        if(fileName){
            if(!fileName.endsWith(".docx"))
                fileName = fileName+".docx";

            var angularParser= function(tag){
                var expr=expressions.compile(tag);
                return {get:expr};
            }
            var nullGetter = function(tag, props) {
                return "";
            };
            var penduduk = schemas.arrayToObj(hot.getDataAtRow(selected[0]), schemas.penduduk);
            var content = fs.readFileSync(path.join(app.getAppPath(), "templates","surat.docx"),"binary");
            var doc=new Docxtemplater(content);
            doc.setOptions({parser:angularParser, nullGetter: nullGetter});
            doc.setData({penduduk: penduduk, vars: printvars});
            doc.render();

            var buf = doc.getZip().generate({type:"nodebuffer"});
            fs.writeFileSync(fileName, buf);
            shell.openItem(fileName);
        }
    };
    
    dataapi.getContent("penduduk", {data: []}, function(content){
        
        var initialData = content.data;
        hot.loadData(initialData);
        //hot.loadData(initialData.concat(initialData).concat(initialData).concat(initialData));
        if(initialData.length == 0)
        {
            $(emptyContainer).removeClass("hidden");
        }
        else 
        {
            $(sheetContainer).removeClass("hidden");
        }
        setTimeout(function(){
            hot.render();
        },500);
    })
    
    
});
