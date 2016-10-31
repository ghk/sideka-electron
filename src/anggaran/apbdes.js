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
    
    document.getElementById('btn-undo').onclick = function(){ hot.undo(); }
    document.getElementById('btn-redo').onclick = function(){ hot.redo(); }
    
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
        exportApbdes(data, "Apbdes");
    }

    document.getElementById('btn-open').onclick = importExcel;
    document.getElementById('btn-export').onclick = exportExcel;

    var addAccount = function(){
        $("#modal-add").modal("show");
        setTimeout(function(){
            hot.unlisten();
            $("input[name='account_code']").focus();
        }, 500);
    }
    document.getElementById('btn-insert').onclick = addAccount;
    $('#modal-add').on('hidden.bs.modal', function () {
        hot.listen();
    })

    var isCodeLesserThan = function(code1, code2){
        if(!code2)
            return false;
        var splitted1 = code1.split(".").map(s => parseInt(s));
        var splitted2 = code2.split(".").map(s => parseInt(s));
        var min = Math.min(splitted1.length, splitted2.length);
        for(var i = 0; i < min; i++){
            if(splitted1[i] > splitted2[i]){ 
                return false;
            }
            if(splitted1[i] < splitted2[i]){ 
                return true;
            }
        }

        if(splitted1.length < splitted2.length) 
            return true;
            
        return false;
    };
    
    var addOneRow = function(){
        var data = $("#form-add").serializeArray().map(i => i.value);
        var sourceData = hot.getSourceData();
        var position = 0;
        for(;position < sourceData.length; position++){
            if(isCodeLesserThan(data[0], sourceData[position][0]))
                break;
        }
        hot.alter("insert_row", position);
        hot.populateFromArray(position, 0, [data], position, 3, null, 'overwrite');
        hot.selection.setRangeStart(new WalkontableCellCoords(position,0));
        hot.selection.setRangeEnd(new WalkontableCellCoords(position,3));
        $('#form-add')[0].reset();
    }
    $("#form-add").submit(function(){
        var code = $("input[name='account_code']").val();
        addOneRow();
        $("input[name='account_code']").focus().val(code).select();
        return false;
    });
    document.getElementById('btn-add').onclick = function(){
        addOneRow();
        $("#modal-add").modal("hide");
    };

    schemas.registerCulture(window);
    
    var file = path.join(app.getAppPath(), "apbdes-sample.xlsx");
    var objData = importApbdes(file);
    var data = objData.map(o => schemas.objToArray(o, schemas.apbdes));

    hot.loadData(data);
    setTimeout(function(){
        hot.render();
    },500);
    
});
