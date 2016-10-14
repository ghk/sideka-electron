import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import { importPenduduk } from '../importer/penduduk';
import dataapi from '../dataapi/dataapi';
import schemas from '../schemas';


var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("Data Penduduk - " +dataapi.getActiveAuth().desa_name);

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

    var inputSearch = document.getElementById('input-search');
    var queryResult;
    var currentResult = 0;
    var lastQuery = null;
    var lastSelectedResult = null;

    Handsontable.Dom.addEvent(inputSearch, 'keyup', function(event) {
        if (event.keyCode === 27){
            inputSearch.blur();
            hot.listen();
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if(lastQuery == this.value)
            return;
            
        lastQuery = this.value;
        currentResult = 0;
        queryResult = hot.search.query(this.value);
        hot.render();
        lastSelectedResult = null;
    });
    
    function keyup(e) {
        //ctrl+f
        if (e.ctrlKey && e.keyCode == 70){
            e.preventDefault();
            e.stopPropagation();
            inputSearch.select();
            hot.unlisten();
        }
    }
    document.addEventListener('keyup', keyup, false);

    var formSearch = document.getElementById('form-search');
    formSearch.onsubmit = function(){
        if(queryResult && queryResult.length){
            var firstResult = queryResult[currentResult];
            hot.selection.setRangeStart(new WalkontableCellCoords(firstResult.row,firstResult.col));
            hot.selection.setRangeEnd(new WalkontableCellCoords(firstResult.row,firstResult.col));
            lastSelectedResult = firstResult;
            inputSearch.focus();
            currentResult += 1;
            if(currentResult == queryResult.length)
                currentResult = 0;
        }
        return false;
    };
    
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
    document.getElementById('btn-open').onclick = importExcel;
    document.getElementById('btn-open-empty').onclick = importExcel;

    document.getElementById('btn-save').onclick = function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getSourceData()
        };
        dataapi.saveContent("penduduk", content);
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
            var penduduk = schemas.arrayToObj(hot.getDataAtRow(selected[0]), schemas.penduduk);
            var content = fs.readFileSync(path.join(app.getAppPath(), "templates","surat.docx"),"binary");
            var doc=new Docxtemplater(content);
            doc.setData(penduduk);
            doc.render();

            var buf = doc.getZip().generate({type:"nodebuffer"});
            fs.writeFileSync(fileName, buf);
            shell.openItem(fileName);
        }
    };
    
    window.addEventListener('resize', function(e){
        hot.render();
    })
    
    var spanSelected = $("#span-selected")[0];
    var lastPendudukName = null;
    Handsontable.hooks.add('afterSelection', function(r, c, r2, c2) {
        var s = hot.getSelected();
        r = s[0];
        var data = hot.getDataAtRow(r);
        var name = "";
        if(data){
            name = data[1];
        }
        if(name == lastPendudukName)
            return;
        spanSelected.innerHTML = lastPendudukName = name;
    });
    
    var spanCount = $("#span-count")[0];
    var updatePendudukCount = function(){
            var all = hot.getSourceData().length;
            var filtered = hot.getData().length;
            var text = all;
            if(all != filtered){
                text = filtered + " dari " + all;
            }
            spanCount.innerHTML = text;
    }
    
    Handsontable.hooks.add('afterLoadData', function(changes, source) {
            updatePendudukCount();
    });
    Handsontable.hooks.add('afterFilter', function() {
            updatePendudukCount();
    });
    
    dataapi.getContent("penduduk", {data: []}, function(content){
        var initialData = content.data;
        hot.loadData(initialData);
        updatePendudukCount();
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
