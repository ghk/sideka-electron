import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import { importApbdes } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../dataapi/dataapi';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { initializeOnlineStatusImg } from '../helpers/misc'; 

window.jQuery = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');


var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("APBDes - " +dataapi.getActiveAuth().desa_name);
    initializeOnlineStatusImg($(".navbar-brand img")[0]);

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
        
        //columnSorting: true,
        //sortIndicator: true,
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        //filters: true,
        contextMenu: ['row_above', 'remove_row'],
        //dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    });
    
    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot, document, formSearch, inputSearch);
    
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
    
    var exportExcel = function(){
        var data = objData.map(o => schemas.objToArray(o, schemas.apbdes));
        exportApbdes(data, "Data Apbdes");

    }

    document.getElementById('btn-open').onclick = importExcel;
    document.getElementById('btn-export').onclick = exportExcel;

    var addAccount = function(){
        $("#modal-add").modal("show");
    }
    document.getElementById('btn-insert').onclick = addAccount;

    

    schemas.registerCulture(window);
    
    var file = path.join(app.getAppPath(), "apbdes-sample.xlsx");
    var objData = importApbdes(file);
    var data = objData.map(o => schemas.objToArray(o, schemas.apbdes));

    hot.loadData(data);
    setTimeout(function(){
        hot.render();
    },500);
    
});
