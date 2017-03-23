var { Component, ApplicationRef } = require('@angular/core');
var path = require('path');
var fs = require('fs');
var $ = require('jquery');
var { remote, app, shell } = require('electron'); // native electron module
var jetpack = require('fs-jetpack'); // module loaded from npm
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
var expressions = require('angular-expressions');

import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import dataapiV2 from "../stores/dataapiV2";
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';

window['jQuery'] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;
var resultBefore=[];
window['app'] = app;

var init = () => {    
    $(".titlebar").addClass("blue");
    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    window['hot'] = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.penduduk),
        columns: schemas.getColumns(schemas.penduduk),

        colWidths: schemas.getColWidths(schemas.penduduk),
        rowHeights: 23,
        
        columnSorting: true,
        sortIndicator: true,
        hiddenColumns: {indicators: true},
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        schemaFilters: true,
        contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });
    
    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot, spanCount);

    window.addEventListener('resize', function(e){
        hot.render();
    })
};
var showColumns = [      
        [],
        ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
        ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
        ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"],
        ["nik","nama_penduduk","kompetensi","pendidikan","pekerjaan","pekerjaan_ped"]
    ];

var spliceArray = function(fields, showColumns){
    var result=[];
    for(var i=0;i!=fields.length;i++){
        var index = showColumns.indexOf(fields[i]);
        if (index == -1) result.push(i);
    }
    return result;
}

var ImageModule = require('docxtemplater-image-module');

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
class PendudukComponent extends diffProps{
    appRef: any;
    tableSearcher: any;
    importer: any;
    loaded: boolean;
    savingMessage: string;
    printSurat: any;
    isFileMenuShown = false;

    constructor(appRef) {
        super();
        this.appRef = appRef;
        this.printSurat = false;
    }

    ngOnInit(){
        $("title").html("Data Penduduk - " +dataapi.getActiveAuth()['desa_name']);

        init(); 
        
        var inputSearch = document.getElementById("input-search");
        this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
        
        this.hot = window['hot'];
        this.importer = new Importer(pendudukImporterConfig);
        var ctrl = this;
    
        function keyup(e) {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                ctrl.openSaveDiffDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            //ctrl+p
            if (e.ctrlKey && e.keyCode == 80){
                ctrl.printSurat();
                e.preventDefault();
                e.stopPropagation();
            }
        }
        document.addEventListener('keyup', keyup, false);
        
        dataapiV2.getContent("penduduk", null, [], schemas.penduduk, (content) => {
              var initialData = content;
                ctrl.initialData = JSON.parse(JSON.stringify(initialData));
                $("#loader").addClass("hidden");
                hot.loadData(initialData);
                setTimeout(function(){
                    //hot.validateCells();
                    if(initialData.length == 0)
                        $(emptyContainer).removeClass("hidden");
                    else 
                        $(sheetContainer).removeClass("hidden");
                    hot.render();
                    ctrl.loaded = true;
                    ctrl.appRef.tick();
                },500);
        });

        this.initDiffComponent();
    }

    transformData(){
        var ctrl = this;
    
        dataapiV2.transformDataStructure('penduduk', null, [], schemas.penduduk, (content) => {
              var initialData = content;
                ctrl.initialData = JSON.parse(JSON.stringify(initialData));
                $("#loader").addClass("hidden");
                hot.loadData(initialData);
                setTimeout(function(){
                    //hot.validateCells();
                    if(initialData.length == 0)
                        $(emptyContainer).removeClass("hidden");
                    else 
                        $(sheetContainer).removeClass("hidden");
                    hot.render();
                    ctrl.loaded = true;
                    ctrl.appRef.tick();
                },500);
        })
    }

    importExcel(){
        var files = remote.dialog.showOpenDialog(null);
        if(files && files.length){
            this.importer.init(files[0]);
            $("#modal-import-columns").modal("show");
        }
    }

    doImport(overwrite){
        $("#modal-import-columns").modal("hide");
        var objData = this.importer.getResults();
        
        var existing = overwrite ? [] : hot.getSourceData();
        var imported = objData.map(o => schemas.objToArray(o, schemas.penduduk));
        var data = existing.concat(imported);
        console.log(existing.length, imported.length, data.length);

        hot.loadData(data);
        $(emptyContainer).addClass("hidden");
        $(sheetContainer).removeClass("hidden");
        setTimeout(function(){
            //hot.validateCells();
            hot.render();
        },500);
    }

    exportExcel(){        
        var data = hot.getData();
        exportPenduduk(data, "Data Penduduk");
    }

    filterContent(){ 
        var plugin = hot.getPlugin('hiddenColumns');        
        var value = $('input[name=btn-filter]:checked').val();   
        var fields = schemas.penduduk.map(c => c.field);
        var result = spliceArray(fields,showColumns[value]);

        plugin.showColumns(resultBefore);
        if(value==0)plugin.showColumns(result);
        else plugin.hideColumns(result);
        hot.render();
        resultBefore = result;
    }

    insertRow(){
        $(emptyContainer).addClass("hidden");
        $(sheetContainer).removeClass("hidden");
        hot.alter("insert_row", 0);
        hot.selectCell(0, 0, 0, 0, true);
    }
    
    saveContent(){
        $("#modal-save-diff").modal("hide");
        this.savingMessage = "Menyimpan...";
        var timestamp = new Date().getTime();
        var content = hot.getSourceData();
        var that = this;
  
        dataapiV2.saveContent("penduduk", null, content, schemas.penduduk, (err, response, body) => {
            that.savingMessage = "Penyimpanan "+ (err ? "gagal" : "berhasil");
            if(!err){
                that.initialData = JSON.parse(JSON.stringify(content));
                that.afterSave();
            }

             setTimeout(function(){
                that.savingMessage = null;
            }, 2000);
        });

        return false;
    }
    
    showFileMenu(isFileMenuShown){
        this.isFileMenuShown = isFileMenuShown;
        if(isFileMenuShown)
            $(".titlebar").removeClass("blue");
        else
            $(".titlebar").addClass("blue");
    }
}

PendudukComponent['parameters'] = [ApplicationRef];
export default PendudukComponent;
