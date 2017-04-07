var { Component, ApplicationRef } = require('@angular/core');
var path = require('path');
var fs = require('fs');
var $ = require('jquery');
var { remote, app, shell } = require('electron'); // native electron module
var jetpack = require('fs-jetpack'); // module loaded from npm
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var base64 = require("uuid-base64");
var uuid = require("uuid");
var d3 = require("d3");

import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import v2Dataapi from "../stores/v2Dataapi";
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';
import BasePage from "./basePage";

window['jQuery'] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;
var resultBefore=[];
var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");

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
    selected: 'penduduk',
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
        var n = 4, // The number of series.
        m = 58; // The number of values per series.

        var xz = d3.range(m),
            yz = d3.range(n).map(function() { return bumps(m); }),
            y01z = d3.stack().keys(d3.range(n))(d3.transpose(yz)),
            yMax = d3.max(yz, function(y) { return d3.max(y); }),
            y1Max = d3.max(y01z, function(y) { return d3.max(y, function(d) { return d[1]; }); });

        var svg = d3.select("svg"),
            margin = {top: 40, right: 10, bottom: 20, left: 10},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom,
            g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var x = d3.scaleBand()
            .domain(xz)
            .rangeRound([0, width])
            .padding(0.08);

        var y = d3.scaleLinear()
            .domain([0, y1Max])
            .range([height, 0]);

        var color = d3.scaleOrdinal()
            .domain(d3.range(n))
            .range(d3.schemeCategory20c);

        var series = g.selectAll(".series")
        .data(y01z)
        .enter().append("g")
            .attr("fill", function(d, i) { return color(i); });

        var rect = series.selectAll("rect")
        .data(function(d) { return d; })
        .enter().append("rect")
            .attr("x", function(d, i) { return x(i); })
            .attr("y", height)
            .attr("width", x.bandwidth())
            .attr("height", 0);

        rect.transition()
            .delay(function(d, i) { return i * 10; })
            .attr("y", function(d) { return y(d[1]); })
            .attr("height", function(d) { return y(d[0]) - y(d[1]); });

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x)
                .tickSize(0)
                .tickPadding(6));

        d3.selectAll("input")
            .on("change", changed);

        var timeout = d3.timeout(function() {
        d3.select("input[value=\"grouped\"]")
            .property("checked", true)
            .dispatch("change");
        }, 2000);

        function changed() {
        timeout.stop();
        if (this.value === "grouped") transitionGrouped();
        else transitionStacked();
        }

        function transitionGrouped() {
        y.domain([0, yMax]);

        rect.transition()
            .duration(500)
            .delay(function(d, i) { return i * 10; })
            .attr("x", function(d, i) { return x(i) + x.bandwidth() / n * this.parentNode.__data__.key; })
            .attr("width", x.bandwidth() / n)
            .transition()
            .attr("y", function(d) { return y(d[1] - d[0]); })
            .attr("height", function(d) { return y(0) - y(d[1] - d[0]); });
        }

        function transitionStacked() {
            y.domain([0, y1Max]);

            rect.transition()
                .duration(500)
                .delay(function(d, i) { return i * 10; })
                .attr("y", function(d) { return y(d[1]); })
                .attr("height", function(d) { return y(d[0]) - y(d[1]); })
                .transition()
                .attr("x", function(d, i) { return x(i); })
                .attr("width", x.bandwidth());
        }

        function bumps(m) {
            var values = [], i, j, w, x, y, z;

            // Initialize with uniform random values in [0.1, 0.2).
            for (i = 0; i < m; ++i) {
                values[i] = 0.1 + 0.1 * Math.random();
            }

            // Add five random bumps.
            for (j = 0; j < 5; ++j) {
                x = 1 / (0.1 + Math.random());
                y = 2 * Math.random() - 0.5;
                z = 10 / (0.1 + Math.random());
                for (i = 0; i < m; i++) {
                w = (i / m - y) * z;
                values[i] += x * Math.exp(-w * w);
                }
            }

            // Ensure all values are positive.
            for (i = 0; i < m; ++i) {
                values[i] = Math.max(0, values[i]);
            }

            return values;
        }
    }
}
/*
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
    maxPaging: number;
    pagingData: any[];
    completeData: any[];
    page: number;
    
    constructor(appRef) {
        super();
        this.appRef = appRef;
        this.printSurat = false;
        this.maxPaging = 0;
        this.page = 1;
    }

    ngOnInit(){
        $("title").html("Data Penduduk - " +dataapi.getActiveAuth()['desa_name']);

        init(); 
        
        let dataFile = path.join(DATA_DIR, "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        this.maxPaging = data.maxPaging ? data.maxPaging : 0;
        
        var inputSearch = document.getElementById("input-search");
        this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
        
        this.hot = window['hot'];
        this.importer = new Importer(pendudukImporterConfig);
        var ctrl = this;
    
        function keyup(e) {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                ctrl.openSaveDiffDialog("penduduk");
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

        let bundleSchemas = {
           "penduduk": schemas.penduduk,
           "surat": []
        };

        let bundleData = {
            "penduduk": [],
            "surat": []
        };

        let me = this;
        
        v2Dataapi.getContent("penduduk", null, bundleData, bundleSchemas, (content) => {  
            me.initialData = JSON.parse(JSON.stringify(content));        
            me.pagingData = content.length > me.maxPaging ? me.getData(me.initialData, me.page) : me.initialData;
            
            hot.loadData(me.pagingData);     

            $("#loader").addClass("hidden");
            
            setTimeout(function(){
                if(me.initialData.length == 0)
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

    getData(data, page): any[] {
        let limit = this.maxPaging;
        let row  = (page - 1) * limit;
        let count = page * limit;
        let part  = [];

        for (;row < count;row++){
            if(!data[row])
                continue;

            part.push(data[row]);
        }
        return part;
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
        
        let bundleSchemas = {
           "penduduk": schemas.penduduk,
           "surat": []
        };

        let bundleData = {
            "penduduk": content,
            "surat": []
        };

        let me = this;

        v2Dataapi.saveContent("penduduk", null, bundleData, bundleSchemas, (err, data) => {
            that.savingMessage = "Penyimpanan berhasil";

            if(!err)
                that.initialData = data;

            hot.loadData(data);
            that.afterSave();

            setTimeout(function(){
                that.savingMessage = null;
            }, 2000);
        });

        return false;
    }
    
    showFileMenu(isFileMenuShown){
        this.isFileMenuShown = isFileMenuShown;
        this.printSurat = false;
        if(isFileMenuShown)
            $(".titlebar").removeClass("blue");
        else
            $(".titlebar").addClass("blue");
    }

    next(): boolean {
        this.page += 1;
        this.pagingData = this.getData(this.initialData, this.page);
        hot.loadData(this.pagingData);
        return false;
    }

    prev(): boolean {
        if(this.page == 1)
           return false;

        this.page -= 1;
        this.pagingData = this.getData(this.initialData, this.page);
        hot.loadData(this.pagingData);
        return false;
    }
}*/

PendudukComponent['parameters'] = [ApplicationRef];
export default PendudukComponent;
