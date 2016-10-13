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
    hot = new Handsontable(sheetContainer, {
        data: [],
        rowHeaders: true,
        topOverlay: 34,
        colWidths: schemas.getColWidths(schemas.penduduk),
        rowHeights: 23,
        height: 800,
        renderAllRows: false,
        columnSorting: true,
        sortIndicator: true,
        outsideClickDeselects: false,
        autoColumnSize: false,
        colHeaders: schemas.getHeader(schemas.penduduk),
        columns: schemas.penduduk,
        //fixedColumnsLeft: 2,
        search: true,
        filters: true,
        contextMenu: ['row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });
    
    var searchField = document.getElementById('search-field');
    var queryResult;
    var currentResult = 0;
    var lastQuery = null;
    var lastSelectedResult = null;

    Handsontable.Dom.addEvent(searchField, 'keyup', function(event) {
        if (event.keyCode === 27){
            searchField.blur();
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
    
    hot.unlisten();
    
    function doc_keyUp(e) {
        if (e.ctrlKey && e.keyCode == 70) {
            hot.unlisten();
            e.preventDefault();
            e.stopPropagation();
            searchField.select();
        }
    }
    document.addEventListener('keyup', doc_keyUp, false);

    var searchForm = document.getElementById('search-form');
    searchForm.onsubmit = function(){
        if(queryResult && queryResult.length){
            var firstResult = queryResult[currentResult];
            console.log(firstResult.row, firstResult.column, firstResult.row, firstResult.column, true);
            hot.selection.setRangeStart(new WalkontableCellCoords(firstResult.row,firstResult.col));
            hot.selection.setRangeEnd(new WalkontableCellCoords(firstResult.row,firstResult.col));
            lastSelectedResult = firstResult;
            searchField.focus();
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
            $(emptyContainer).addClass("hide");
            $(sheetContainer).removeClass("hide");
            setTimeout(function(){
                hot.render();
            },500);
        }
    }
    document.getElementById('open-btn').onclick = importExcel;
    document.getElementById('open-btn-empty').onclick = importExcel;

    document.getElementById('save-btn').onclick = function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getData()
        };
        dataapi.saveContent("penduduk", content);
    };

    document.getElementById('mail-btn').onclick = function(){
        var selected = hot.getSelected();
        if(!selected)
            return;
        var fileName = remote.dialog.showSaveDialog();
        if(fileName){
            var penduduk = schemas.arrayToObj(hot.getData()[selected[0]], schemas.penduduk);
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
    
    dataapi.getContent("penduduk", {data: []}, function(content){
        var initialData = content.data;
        hot.loadData(initialData);
        if(initialData.length == 0)
        {
            $(emptyContainer).removeClass("hide");
        }
        else 
        {
            $(sheetContainer).removeClass("hide");
        }
        setTimeout(function(){
            hot.render();
        },500);
    })
    
    var selectedName = $("#selected-name")[0];
    var penduduks = hot.getData();
    var lastPendudukName = null;
    Handsontable.hooks.add('afterSelection', function(r, c, r2, c2) {
        var name = penduduks[r][1];
        if(name == lastPendudukName)
            return;
        selectedName.innerHTML = lastPendudukName = name;
    });
    
});
