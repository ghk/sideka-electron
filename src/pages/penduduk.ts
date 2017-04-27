import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import { Component, ApplicationRef } from "@angular/core";
import { remote, shell } from "electron";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Diff } from "../helpers/diffTracker";
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import DiffTracker from "../helpers/diffTracker";
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';
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
const DATA_TYPE_DIRS = {
    "penduduk": "penduduk",
    "logSurat": "penduduk",
    "mutasi": "penduduk"
};

window['jQuery'] = $;
window['app'] = app;
window['hots'] = {};

require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent extends DiffTracker {
    tableSearcher: any;
    importer: any;
    hots: any;
    activeHot: any;
    activeSheet: string;
    sheets: any[];
    limit: number;
    offset: number;
    page: number;
    data: any;
    loaded: boolean;
    isFileMenuShown: boolean;
    isPrintSuratShown: boolean;
    isFormSuratShown: boolean;
    isForceQuit: boolean;
    afterSaveAction: string;
    savingMessage: string;
    diff: Diff;
    suratCollection: any[];
    filteredSurat: any[];
    selectedSurat: any;
    selectedPenduduk: any;
    keywordSurat: string;

    constructor(private appRef: ApplicationRef){
        super();
        this.sheets = ['penduduk', 'logSurat'];
        this.hots = {};
        this.data = { "penduduk": [], "logSurat": [] };
        this.page = 1;
        this.activeSheet = 'penduduk';
        this.isFileMenuShown = false;
        this.isPrintSuratShown = false;
        this.isFormSuratShown = false;
    }

    ngOnInit(): void{
        this.limit = settings.data.maxPaging;

        if(this.limit)
            this.offset = (this.page - 1) * this.limit;

        this.sheets.forEach(sheet => {
            let element = $('.sheet-' + sheet)[0];
            this.hots[sheet] = this.createHot(element, sheet);
            window['hots'][sheet] = this.hots[sheet];
        });

        this.setActiveHot(this.activeSheet);

        let keyup = (e) => {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            //ctrl+p
            if (e.ctrlKey && e.keyCode == 80){
                e.preventDefault();
                e.stopPropagation();
            }
        }

        document.addEventListener('keyup', keyup, false);
        this.importer = new Importer(pendudukImporterConfig);
    }
    
    createHot(element, sheet): any{
        let schema = schemas[sheet];

        return new Handsontable(element, {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schema),
            columns: schemas.getColumns(schema),
            colWidths: schemas.getColWidths(schema),
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
                this.data[sheet].splice(row, 1);
            }
        });
    }

    setActiveHot(sheet): void{
        this.activeHot = this.hots[sheet];
        let me = this;
        
        let spanSelected = $("#span-selected")[0];
        initializeTableSelected(me.activeHot, 1, spanSelected);

        let spanCount = $("#span-count")[0];
        initializeTableCount(me.activeHot, spanCount);

        window.addEventListener('resize', function(e){
            me.activeHot.render();
        });
        
        let inputSearch = document.getElementById("input-search");
        this.tableSearcher = initializeTableSearch(me.activeHot, document, inputSearch, null);
       
        this.getContent(sheet);
    }

    selectTab(sheet: string): boolean {
        this.activeSheet = sheet;

        switch(this.activeSheet){
            case 'penduduk':
                this.setActiveHot(sheet);
                break;
            case 'statistic':
                this.loadStatistics();
                break;
            case 'mutasi':
                break;
            case 'logSurat':
                this.setActiveHot(sheet);
                break;
        }

        return false;
    }

    getContent(sheet): void {
        let bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat };
        let bundleData = { "penduduk": [], "logSurat": [] };
        let me = this;

        dataApi.getContent(sheet, null, bundleData, bundleSchemas, (result) => {
            this.data[sheet] = result;

            if(!result)
                this.activeHot.loadData([]);
            else if(result.length > this.limit)
                this.activeHot.loadData(this.pageData(this.data[sheet]));
            else
                this.activeHot.loadData(this.data[sheet]);
            
            $("#loader").addClass("hidden");

            setTimeout(() => {
                me.activeHot.render();
                me.loaded = true;
                me.appRef.tick();
            }, 500)
        });
    }

    saveContent(sheet): void {  
        $("#modal-save-diff").modal("hide");
        this.savingMessage = "Menyimpan...";
        let content = this.data[this.activeSheet];
        let bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat };
        let bundleData = { "penduduk": [], "logSurat": [] };
        let me = this;
        
        bundleData[this.activeSheet] = content;

        dataApi.saveContent(sheet, null, bundleData, bundleSchemas, (err, data) => {
            this.savingMessage = "Penyimpanan berhasil";
            if(err)
               return;

             this.data[this.activeSheet] = data;

            if(data.length > this.limit)
                 this.activeHot.loadData(this.pageData(data));
            else
                this.activeHot.loadData(data);

            this.afterSave();

            setTimeout(function(){
                me.savingMessage = null;
            }, 2000);
        });
    }

    saveLogSurat(): void {
        let bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat };
        let bundleData = { "penduduk": [], "logSurat": this.data['logSurat'] };
        let me = this;
        
        dataApi.saveContent('logSurat', null, bundleData, bundleSchemas, (err, data) => {
            alert('Cetak surat berhasil dicatat');
        });
    }

    insertRow(): void {
        this.activeHot.alter("insert_row", 0);
        this.activeHot.selectCell(0, 0, 0, 0, true);
        this.activeHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
        let row = (this.page - 1) * parseInt(this.limit.toString());
        this.data[this.activeSheet].splice(row, 0, this.activeHot.getDataAtRow(0));
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

    pageData(data: any[]): any[]{    
        let row  = (this.page - 1) * this.limit;
        let count = this.page * this.limit;
        let part  = [];
 
        for (;row < count;row++){
            if(!data[row])
                continue;

            part.push(data[row]);
        }

        return part;
    }

    filterContent(){ 
        var plugin = this.activeHot.getPlugin('hiddenColumns');        
        var value = $('input[name=btn-filter]:checked').val();   
        var fields = schemas.penduduk.map(c => c.field);
        var result = PendudukUtil.spliceArray(fields, showColumns[value]);

        plugin.showColumns(resultBefore);
        if(value==0)plugin.showColumns(result);
        else plugin.hideColumns(result);
        this.activeHot.render();
        resultBefore = result;
    }

    next(): boolean {
        this.page += 1;
        this.updateData();
        this.activeHot.loadData(this.pageData(this.data[this.activeSheet]));
        return false;
    }

    prev(): boolean {
        if(this.page == 1)
           return false;

        this.page -= 1;
        this.updateData();
        this.activeHot.loadData(this.pageData(this.data[this.activeSheet]));
        return false;
    }

    forceQuit(){
        this.isForceQuit = true;
        this.afterSave();
    }

    afterSave(){
        if(this.afterSaveAction == "home")
            document.location.href="app.html";
        else if(this.afterSaveAction == "quit")
            app.quit();
    } 

    openSaveDialog(): void {
        let data = this.data[this.activeSheet];
        let jsonFile = path.join(CONTENT_DIR, DATA_TYPE_DIRS[this.activeSheet]) + '.json';
        
        if(this.activeSheet)
            data = JSON.parse(jetpack.read(jsonFile))["data"][this.activeSheet];
        
        this.updateData();
        this.diff = this.trackDiff(data, this.data[this.activeSheet]);

        let me = this;

        if(this.diff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");
            setTimeout(() => {
                me.activeHot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
    }

    updateData(): void {
        let currentData: any[] = this.activeHot.getSourceData();
      
        for(let i=0; i<this.data[this.activeSheet].length; i++){
            let data = currentData.filter(e => e[0] === this.data[this.activeSheet][i][0])[0];
            
            if(!data)
              continue;
            
            this.data[this.activeSheet][i] = data;
        }
    }

    loadSurat(): void {
        this.isPrintSuratShown = true;
        this.isFileMenuShown = true;
        this.isFormSuratShown = false;
        this.selectedPenduduk = this.activeHot.getDataAtRow(this.activeHot.getSelected()[0]);

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
        let dataSource = this.activeHot.getSourceData();
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
            docxData.vars = printvars;
            
            let form = this.selectedSurat.data;
            let fileId = this.renderSurat(docxData, this.selectedSurat);
            this.data['logSurat'].push( [
                base64.encode(uuid.v4()),
                penduduk.nik,
                penduduk.nama_penduduk,
                this.selectedSurat.title,
                new Date(),
                fileId
            ]);
           
            this.saveLogSurat();
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
        
        let fileId = base64.encode(uuid.v4()) + '.docx';
        let localFilename = path.join(localPath, fileId);

        PendudukUtil.copySurat(fileName, localFilename, (err) => {});
        app.relaunch();

        return fileId;
    }

    loadStatistics(): void {
        let chart = new PendudukChart();
        let sourceData = this.hots['penduduk'].getSourceData();

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
