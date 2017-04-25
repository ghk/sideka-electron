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

const $ = require('jquery');
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
const expressions = require('angular-expressions');
const ImageModule = require('docxtemplater-image-module');
const base64 = require("uuid-base64");
const JSZip = require('jszip');

let app = remote.app;
let hots = {};
let activeHot;
let resultBefore = [];
let showColumns = [      
    [],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
    ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"],
    ["nik","nama_penduduk","kompetensi","pendidikan","pekerjaan","pekerjaan_ped"]
];

const APP_DIR = jetpack.cwd(app.getAppPath());
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

window['jQuery'] = $;
window['app'] = app;
window['hots'] = {};

require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
class PendudukComponent extends BasePage{
    tableSearcher: any;
    importer: any;
    sheets: any[];
    activeSheet: string;
    loaded: boolean;
    savingMessage: string;
    isFileMenuShown: boolean = false;
    isPrintSuratShown: boolean = false;
    isFormSuratShown: boolean = false;
    suratCollection: any[];
    filteredSurat: any[];
    selectedSurat: any;
    selectedPenduduk: any;
    keywordSurat: string;

    constructor(private appRef: ApplicationRef){
        super('penduduk');
        this.sheets = ['penduduk', 'logSurat'];
        this.activeSheet = 'penduduk';
    }

    ngOnInit(): void {
        this.sheets.forEach(sheet => {
            let element = $('.sheet-' + sheet)[0];

            window['hots'][sheet] = hots[sheet] = new Handsontable(element, {
                data: [],
                topOverlay: 34,
                rowHeaders: true,
                colHeaders: schemas.getHeader(schemas[sheet]),
                columns: schemas.getColumns(schemas[sheet]),
                colWidths: schemas.getColWidths(schemas[sheet]),
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
        });

        activeHot = hots[this.activeSheet];

        var spanSelected = $("#span-selected")[0];
        initializeTableSelected(activeHot, 1, spanSelected);
            
        var spanCount = $("#span-count")[0];
        initializeTableCount(activeHot, spanCount);

        window.addEventListener('resize', function(e){
            activeHot.render();
        });
            
        this.limit = settings.data.maxPaging;

        if(this.limit)
            this.offset = (this.page - 1) * this.limit;

        let inputSearch = document.getElementById("input-search");

        this.tableSearcher = initializeTableSearch(activeHot, document, inputSearch, null);
        this.importer = new Importer(pendudukImporterConfig);

        this.getContent('penduduk');
    }

    loadSurat(): void {
        this.isPrintSuratShown = true;
        this.isFileMenuShown = true;
        this.isFormSuratShown = false;
        this.selectedPenduduk = activeHot.getDataAtRow(activeHot.getSelected()[0]);

        let dirs = fs.readdirSync('surat_templates');

        this.suratCollection = [];

        dirs.forEach(dir => {
            let jsonFile = JSON.parse(jetpack.read('surat_templates/' + dir + '/' + dir + '.json'));
            this.suratCollection.push(jsonFile);
        });

         this.selectedSurat = {
            "name": null,
            "thumbnail": null,
            "path": null,
            "code": null,
            "data": {}
        };

        this.filteredSurat = this.suratCollection;
    }

    searchSurat(): void {
        if(!this.keywordSurat || this.keywordSurat === '')
            this.filteredSurat = this.suratCollection;

        this.filteredSurat = this.suratCollection.filter(e => e.title.indexOf(this.keywordSurat) > -1);
    }

    selectSurat(surat: any): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;
        return false;
    }

    printSurat(): void{
        if(!this.selectedPenduduk)
            return;
        
        let penduduk = schemas.arrayToObj(this.selectedPenduduk, schemas.penduduk);
        let dataSettingsDir = path.join(app.getPath("userData"), "settings.json");

        if(!jetpack.exists(dataSettingsDir))
            return;

        let dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        let dataSource = activeHot.getSourceData();
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
                "logo": PendudukUtil.convertDataURIToBinary(dataSettings.logo), 
                "keluarga": keluargaResult, 
                "penduduks": penduduks};    
        
        dataApi.getDesa(desas => {
            let auth = dataApi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = this.selectedSurat.data;
            docxData.vars = printvars;
            let path = this.renderSurat(docxData, this.selectedSurat);

            let data = [[
                base64.encode(uuid.v4()),
                penduduk.nik,
                penduduk.name,
                this.selectedSurat.title,
                new Date(),
                path
            ]];

            this.saveLogSurat(data);
        });
    }

    renderSurat(data, surat): any{
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

        let content = fs.readFileSync('surat_templates/' + surat.code + '/' + surat.code + '.docx', "binary");
        let imageModule = new ImageModule(opts);   
        let zip = new JSZip(content);
       
        let doc = new Docxtemplater();
        doc.loadZip(zip);
        
        doc.setOptions({parser:angularParser, nullGetter: nullGetter});
        doc.attachModule(imageModule);
        doc.setData(data);
        doc.render();

        let buf = doc.getZip().generate({type:"nodebuffer"});
        fs.writeFileSync(fileName, buf);
        shell.openItem(fileName);
        let localPath = path.join(DATA_DIR, "surat_logs");

        if(!fs.existsSync(localPath))
            fs.mkdirSync(localPath);

        let localFilename = path.join(localPath, base64.encode(uuid.v4())) + '.docx';
        PendudukUtil.copySurat(fileName, localFilename, (err) => {});
        app.relaunch();

        return localPath;
    }

    selectTab(tab): boolean{
        this.activeSheet = tab;
        this.type = tab;

        switch(this.activeSheet){
            case 'penduduk':
                this.getContent('penduduk');
                activeHot = hots['penduduk'];
                break;
            case 'logSurat':
                this.getContent('logSurat');
                activeHot = hots['logSurat'];
                break;
            case 'statistic':
                this.loadStatistics();
                break;
        }

        return false;
    }

    insertRow(): void {
        activeHot.alter("insert_row", 0);
        activeHot.selectCell(0, 0, 0, 0, true);
        activeHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
        let row = (this.page - 1) * parseInt(this.limit.toString());
        this.initialData.splice(row, 0, activeHot.getDataAtRow(0));
    }

    getContent(type): void { 
        let bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat };
        let bundleData = { "penduduk": [], "logSurat": [] };
        let me = this;

        dataApi.getContent(type, null, bundleData, bundleSchemas, (result) => {
            me.initialData = result;

            if(!me.initialData)
                activeHot.loadData(bundleData[type]);
            else if(me.initialData.length > me.limit)
                activeHot.loadData(me.pageData(me.initialData));
            else
                activeHot.loadData(me.initialData);

             $("#loader").addClass("hidden");
            
            setTimeout(function(){
                activeHot.render();
                me.loaded = true;
                me.appRef.tick();
            },500);
        });
    }

    saveLogSurat(data): void {
        let bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat };
        let bundleData = { "penduduk": [], "logSurat": [] };
        
        bundleData['logSurat'] = data;

        let me = this;

        dataApi.saveContent('logSurat', null, bundleData, bundleSchemas, (err, data) => {
           
        });
    }

    saveContent(): boolean {
        $("#modal-save-diff").modal("hide");
        this.savingMessage = "Menyimpan...";
        let timestamp = new Date().getTime();
        let content = this.initialData;
        let bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat };
        let bundleData = { "penduduk": [], "logSurat": [] };

        bundleData[this.type] = content;

        let me = this;

        dataApi.saveContent('penduduk', null, bundleData, bundleSchemas, (err, data) => {
            me.savingMessage = "Penyimpanan berhasil";

            if(!err)
                me.initialData = data;
            
            if(data.length > me.limit)
              activeHot.loadData(me.pageData(data));
            else
              activeHot.loadData(data);

            me.afterSave();

            setTimeout(function(){
                me.savingMessage = null;
            }, 2000);
        });

        return false;
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

    filterContent(){ 
        var plugin = activeHot.getPlugin('hiddenColumns');        
        var value = $('input[name=btn-filter]:checked').val();   
        var fields = schemas.penduduk.map(c => c.field);
        var result = PendudukUtil.spliceArray(fields, showColumns[value]);

        plugin.showColumns(resultBefore);
        if(value==0)plugin.showColumns(result);
        else plugin.hideColumns(result);
        activeHot.render();
        resultBefore = result;
    }

    loadStatistics(): void {
        let chart = new PendudukChart();
        let sourceData = hots['penduduk'].getSourceData();

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
}

class PendudukUtil{
    static spliceArray(fields, showColumns): any{
        let result=[];
        for(let i=0;i!=fields.length;i++){
            let index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }

    static convertDataURIToBinary(base64): any{
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

    static copySurat(source, target, callback){
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
}


export default PendudukComponent;
