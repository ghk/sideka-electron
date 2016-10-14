import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import { importApbdes } from '../helpers/importer';
import dataapi from '../dataapi/dataapi';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';

var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("APBDes - " +dataapi.getActiveAuth().desa_name);

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    window.hot = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.apbdes),
        columns: schemas.apbdes,

        colWidths: schemas.getColWidths(schemas.apbdes),
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
            var objData = importApbdes(files[0]);
            var data = objData.map(o => schemas.objToArray(o, schemas.apbdes));

            hot.loadData(data);
            setTimeout(function(){
                hot.render();
            },500);
        }
    }
    document.getElementById('btn-open').onclick = importExcel;
    schemas.registerCulture(window);

    
});
