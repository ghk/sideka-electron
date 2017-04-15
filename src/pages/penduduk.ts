var $ = require('jquery');
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var base64 = require("uuid-base64");

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';

import { Component, ApplicationRef } from "@angular/core";
import { remote, shell } from "electron";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import v2Dataapi from "../stores/v2Dataapi";
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';
import BasePage from "./basePage";
import PendudukChart from "../helpers/pendudukChart";

require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;
var resultBefore=[];
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");

window['jQuery'] = $;
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

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
class PendudukComponent extends BasePage{
    appRef: any;
    tableSearcher: any;
    importer: any;
    loaded: boolean;
    savingMessage: string;
    printSurat: boolean = false;
    isFileMenuShown = false;
    limit: number;
    offset: number;
    page: number;
    selectedTab: string;

    constructor(appRef){
        super('penduduk');
        this.appRef = appRef;
        this.page = 1;
        this.selectedTab = 'penduduk';
    }

    init(): void {
        $(".titlebar").addClass("blue");
        sheetContainer = document.getElementById('sheet');
        emptyContainer = document.getElementById('empty');

        let me = this;

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
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
            beforeRemoveRow: function (row, amount) {
               me.initialData.splice(row, 1);
            }
        });
        
        var spanSelected = $("#span-selected")[0];
        initializeTableSelected(hot, 1, spanSelected);
        
        var spanCount = $("#span-count")[0];
        initializeTableCount(hot, spanCount);

        window.addEventListener('resize', function(e){
            hot.render();
        });
    }

    ngOnInit(): void {
        $("title").html("Data Penduduk - " +dataapi.getActiveAuth()['desa_name']);
        
        this.init();
        let setting = path.join(DATA_DIR, "setting.json");

        if(!jetpack.exists(setting)){
            this.limit = undefined;
            this.offset = undefined;
        }
        else{
            let settingData = JSON.parse(jetpack.read(setting));
            this.limit = settingData.maxPaging;
            this.offset = (this.page - 1) * this.limit;
        }

        let inputSearch = document.getElementById("input-search");

        this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
        this.hot = window['hot'];
        this.importer = new Importer(pendudukImporterConfig);
       
        let me = this;
        let keyup = (e) => {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                me.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            //ctrl+p
            if (e.ctrlKey && e.keyCode == 80){
                me.printSurat = true;
                e.preventDefault();
                e.stopPropagation();
            }
        }

        document.addEventListener('keyup', keyup, false);

        this.getContent();
    }

    getContent(): void {
        let bundleSchemas = { "penduduk": schemas.penduduk, "surat": [] };
        let bundleData = { "penduduk": [], "surat": [] };
        let me = this;

        v2Dataapi.getContent(this.type, null, bundleData, bundleSchemas, (result) => {
            me.initialData = result;
     
            if(me.initialData.length > me.limit)
                hot.loadData(me.pageData(me.initialData));
            else
                hot.loadData(me.initialData);

             $("#loader").addClass("hidden");
            
            setTimeout(function(){
                if(me.initialData.length == 0)
                    $(emptyContainer).removeClass("hidden");
                else 
                    $(sheetContainer).removeClass("hidden");
                    
                hot.render();
                me.loaded = true;
                me.appRef.tick();
            },500);
        });
    }

    saveSurat(): boolean{
        return false;

        //v2Dataapi.saveContent("renstra", null, bundleData, bundleSchemas, (err, data) => {});
    }

    saveContent(): boolean {
        $("#modal-save-diff").modal("hide");
        this.savingMessage = "Menyimpan...";
        let timestamp = new Date().getTime();
        let content = this.initialData;
        let bundleSchemas = { "penduduk": schemas.penduduk, "surat": [] };
        let bundleData = { "penduduk": content, "surat": [] };
        let me = this;

        v2Dataapi.saveContent("penduduk", null, bundleData, bundleSchemas, (err, data) => {
            me.savingMessage = "Penyimpanan berhasil";

            if(!err)
                me.initialData = data;
            
            if(data.length > me.limit)
              hot.loadData(me.pageData(data));
            else
              hot.loadData(data);

            me.afterSave();

            setTimeout(function(){
                me.savingMessage = null;
            }, 2000);
        });

        return false;
    }
    
    insertRow(): void {
        $(emptyContainer).addClass("hidden");
        $(sheetContainer).removeClass("hidden");
        hot.alter("insert_row", 0);
        hot.selectCell(0, 0, 0, 0, true);
        hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
        let row = (this.page - 1) * parseInt(this.limit.toString());
        this.initialData.splice(row, 0, hot.getDataAtRow(0));
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

    showFileMenu(isFileMenuShown){
        this.isFileMenuShown = isFileMenuShown;
        this.printSurat = false;
        if(isFileMenuShown)
            $(".titlebar").removeClass("blue");
        else
            $(".titlebar").addClass("blue");
    }
    
    selectTab(tab: string): boolean{
        this.selectedTab = tab;

        if(tab === 'statistic')
           this.loadStatistics();

        return false;
    }

    loadStatistics(): void {
        let chart = new PendudukChart();
        let pekerjaanRaw = chart.transformRaw(this.hot.getSourceData(), 'pekerjaan', 9);
        let pekerjaanData = chart.transformDataStacked(pekerjaanRaw, 'pekerjaan');
        let pekerjaanChart = chart.render('pekerjaan', 'multiBarHorizontalChart', pekerjaanData);

        let pendidikanRaw = chart.transformRaw(this.hot.getSourceData(), 'pendidikan', 6);
        let pendidikanData = chart.transformDataStacked(pendidikanRaw, 'pendidikan');
        let pendidikanChart = chart.render('pendidikan', 'multiBarHorizontalChart', pendidikanData);

    }
}

PendudukComponent['parameters'] = [ApplicationRef];
export default PendudukComponent;
