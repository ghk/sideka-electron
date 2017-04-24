const $ = require('jquery');
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
const expressions = require('angular-expressions');
const ImageModule = require('docxtemplater-image-module');
const base64 = require("uuid-base64");
const JSZip = require('jszip');

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';

import { Component, ApplicationRef } from "@angular/core";
import { remote, shell } from "electron";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';
import BasePage from "./basePage";
import PendudukChart from "../helpers/pendudukChart";
import titleBar from '../helpers/titleBar';

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
require('./node_modules/bootstrap/dist/js/bootstrap.js');

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
    tableSearcher: any;
    importer: any;
    loaded: boolean;
    savingMessage: string;
    isFileMenuShown = false;
    isPrintSuratShown: boolean = false;
    isFormSuratShown = false;
    limit: number;
    offset: number;
    page: number;
    selectedTab: string;
    selectedPenduduk: any;
    selectedSurat: any;
    letters: any;   
    filteredLetters: any;
    keywordSurat: string;

    constructor(private appRef: ApplicationRef){
        super('penduduk');
        this.page = 1;
        this.selectedTab = 'penduduk';
    }

    ngOnInit(): void {
        titleBar.blue("Data Penduduk - " +dataApi.getActiveAuth()['desa_name'])
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
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
            beforeRemoveRow: (row, amount) => {
               this.initialData.splice(row, 1);
            }
        });
        
        var spanSelected = $("#span-selected")[0];
        initializeTableSelected(hot, 1, spanSelected);
        
        var spanCount = $("#span-count")[0];
        initializeTableCount(hot, spanCount);

        window.addEventListener('resize', function(e){
            hot.render();
        });
        
        this.limit = settings.data.maxPaging;
        if(this.limit)
            this.offset = (this.page - 1) * this.limit;

        let inputSearch = document.getElementById("input-search");

        this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
        this.hot = window['hot'];
        this.importer = new Importer(pendudukImporterConfig);
       
        let keyup = (e) => {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            //ctrl+p
            if (e.ctrlKey && e.keyCode == 80){
                //this.printSurat = true;
                e.preventDefault();
                e.stopPropagation();
            }
        }

        document.addEventListener('keyup', keyup, false);

        this.getContent();
    }

    initSurat(): void{
        this.isPrintSuratShown = true;
        this.isFileMenuShown = true;
        this.isFormSuratShown = false;
        this.selectedPenduduk = this.hot.getDataAtRow(this.hot.getSelected()[0]);

        let dirs = fs.readdirSync('surat_templates');

        this.letters = [];

        dirs.forEach(dir => {
            let jsonFile = JSON.parse(jetpack.read('surat_templates/' + dir + '/' + dir + '.json'));
            this.letters.push(jsonFile);
        });

         this.selectedSurat = {
            "name": null,
            "thumbnail": null,
            "path": null,
            "code": null,
            "data": {}
        };

        this.filteredLetters = this.letters;
    }

    getContent(): void {
        let bundleSchemas = { "penduduk": schemas.penduduk, "surat": schemas.logSurat };
        let bundleData = { "penduduk": [], "surat": [] };
        let me = this;

        dataApi.getContent(this.type, null, bundleData, bundleSchemas, (result) => {
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

        //dataApi.saveContent("renstra", null, bundleData, bundleSchemas, (err, data) => {});
    }

    saveContent(): boolean {
        $("#modal-save-diff").modal("hide");
        this.savingMessage = "Menyimpan...";
        let timestamp = new Date().getTime();
        let content = this.initialData;
        let bundleSchemas = { "penduduk": schemas.penduduk, "surat": [] };
        let bundleData = { "penduduk": content, "surat": [] };
        let me = this;

        dataApi.saveContent("penduduk", null, bundleData, bundleSchemas, (err, data) => {
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
        this.isPrintSuratShown = false;
        this.isFormSuratShown = false;
        
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }
    
    selectTab(tab: string): boolean{
        this.selectedTab = tab;

        switch(this.selectedTab){
            case "penduduk":
                this.type = 'penduduk';
                this.getContent();
            case "statistic":
               this.type = 'penduduk';
               this.loadStatistics();
            break;
            case "logSurat":
               this.type = 'surat';
               this.getContent();
            break;
            default:
                console.log('Error');
        }

        return false;
    }

    selectSurat(surat: any): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;
        return false;
    }

    searchSurat(): void {
        if(!this.keywordSurat || this.keywordSurat === '')
            this.filteredLetters = this.letters;

        this.filteredLetters = this.letters.filter(e => e.title.indexOf(this.keywordSurat) > -1);
    }

    loadStatistics(): void {
        let chart = new PendudukChart();
        let sourceData = this.hot.getSourceData();

        let pekerjaanRaw = chart.transformRaw(sourceData, 'pekerjaan', 9);
        let pekerjaanData = chart.transformDataStacked(pekerjaanRaw, 'pekerjaan');
        let pekerjaanChart = chart.renderMultiBarHorizontalChart('pekerjaan', pekerjaanData);
        
        let pendidikanRaw = chart.transformRaw(sourceData, 'pendidikan', 6);
        let pendidikanData = chart.transformDataStacked(pendidikanRaw, 'pendidikan');
        let pendidikanChart = chart.renderMultiBarHorizontalChart('pendidikan', pendidikanData);

        let ageGroupRaw = chart.transformAgeGroup(sourceData);
        let ageGroupData = chart.transformDataPyramid(ageGroupRaw);
        let ageGroupChart = chart.renderMultiBarHorizontalChart('ageGroup', ageGroupData);

        let agamaRaw = chart.transformRaw(sourceData, 'agama', 7);
        let agamaData = chart.transformData(agamaRaw, 'agama');
        let agamaChart = chart.renderPieChart('agama', agamaData);

        let statusKawinRaw = chart.transformRaw(sourceData, 'statusKawin', 8);
        let statusKawinData = chart.transformData(statusKawinRaw, 'statusKawin');
        let statusKawinChart = chart.renderPieChart('statusKawin', statusKawinData);

        setTimeout(() => {
            pekerjaanChart.update();
            pendidikanChart.update();
            agamaChart.update();
            statusKawinChart.update();
            ageGroupChart.update();
        }, 3000);
    }

    print(): void {
        if(!this.selectedPenduduk)
            return;

        let penduduk = schemas.arrayToObj(this.selectedPenduduk, schemas.penduduk);
        let dataSettingsDir = path.join(app.getPath("userData"), "settings.json");

        if(!jetpack.exists(dataSettingsDir))
            return;
        
        let dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        let renderDocument = this.renderDocument;
        let dataSource = this.hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['22'] === this.selectedPenduduk.no_kk);
        let keluargaResult: any[] = [];
        
        let penduduksRaw: any[] = dataSource.filter(e => e['22'] === this.selectedPenduduk.no_kk);
        let penduduks: any[] = [];

        for(let i=0; i<keluargaRaw.length; i++){
            var objRes = schemas.arrayToObj(keluargaRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            keluargaResult.push(objRes);
        }

        for(let i=0; i<penduduksRaw.length; i++){
            var objRes = schemas.arrayToObj(penduduksRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            penduduks.push(objRes);
        }

        let formData = {};

        for(let i=0; i<this.selectedSurat.forms.length; i++)
            formData[this.selectedSurat.forms[i]["var"]] = this.selectedSurat.forms[i]["value"];
        
        let docxData = { "vars": null, 
                "penduduk": penduduk, 
                "form": formData,  
                "logo": this.convertDataURIToBinary(dataSettings.logo), 
                "keluarga": keluargaResult, 
                "penduduks": penduduks};    
        
        dataApi.getDesa(desas => {
            let auth = dataApi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = this.selectedSurat.data;
            docxData.vars = printvars;
            renderDocument(docxData, this.selectedSurat, this.copySurat, this.saveSurat);
        });
    }

    renderDocument(docxData: any, letter: any, copySurat: Function, saveSurat: Function): void{
        var fileName = remote.dialog.showSaveDialog({
            filters: [
                {name: 'Word document', extensions: ['docx']},
            ]
        });

        if(!fileName)
           return;
           
        if(!fileName.endsWith(".docx"))
            fileName = fileName+".docx";

        let angularParser= function(tag){
            var expr=expressions.compile(tag);
            return {get:expr};
        }

        let nullGetter = function(tag, props) {
            return "";
        };

         let opts = { 
            "centered": false, 
            "getImage": (tagValue) => {
                return tagValue;
            }, 
            "getSize": (image, tagValue, tagName) => {
                return [100, 100];
            } 
        };

        let content = fs.readFileSync('surat_templates/' + letter.code + '/' + letter.code + '.docx', "binary");
        let imageModule = new ImageModule(opts);   
        let zip = new JSZip(content);
       
        let doc = new Docxtemplater();
        doc.loadZip(zip);
        
        doc.setOptions({parser:angularParser, nullGetter: nullGetter});
        doc.attachModule(imageModule);
        doc.setData(docxData);
        doc.render();

        let buf = doc.getZip().generate({type:"nodebuffer"});
        fs.writeFileSync(fileName, buf);
        shell.openItem(fileName);

        console.log(fileName);

        let localPath = path.join(DATA_DIR, "surat_logs");

        if(!fs.existsSync(localPath))
            fs.mkdirSync(localPath);

        let localFilename = path.join(localPath, base64.encode(uuid.v4()));
        localFilename = path.join(localFilename, 'docx');
        
        copySurat(fileName, localFilename, (err) => {});
        
        app.relaunch();
    }

    copySurat(source, target, callback){
        let cbCalled = false;

        let done = (err) => {
             if (!cbCalled) {
                callback(err);
                cbCalled = true;
            }
        }

        let rd = fs.createReadStream(source);

        rd.on('error', (err) => {
            done(err);
        });

        let wr = fs.createWriteStream(target);

        wr.on('error', (err) => {
            done(err);
        });

        rd.pipe(wr);
    }

    convertDataURIToBinary(base64): any{
        if(!base64)
          return null;
          
        const string_base64 = base64.replace(/^data:image\/(png|jpg);base64,/, "");
        var binary_string = new Buffer(string_base64, 'base64').toString('binary');
        
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            var ascii = binary_string.charCodeAt(i);
            bytes[i] = ascii;
        }
        return bytes.buffer;
    }
}

export default PendudukComponent;
