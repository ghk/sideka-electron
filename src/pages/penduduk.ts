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

require('./node_modules/bootstrap/dist/js/bootstrap.js');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = {
    "penduduk": "penduduk",
    "logSurat": "penduduk",
    "mutasi": "penduduk"
};

const COLUMNS = [      
    [],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
    ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"],
    ["nik","nama_penduduk","kompetensi","pendidikan","pekerjaan","pekerjaan_ped"]
];

window['jQuery'] = $;
window['app'] = APP;
window['hots'] = {};

require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent extends DiffTracker{
    resultBefore: any[];
    tableSearcher: any;
    importer: any;
    hots: any;
    sheets: string[];
    activeHot: any;
    activeSheet: string;
    data: any;
    paging: any;
    bundleData: any;
    bundleSchemas: any;
    mutationType: any;
    selectedPenduduk: any;
    loaded: boolean;
    isFileMenuShown: boolean;
    isPrintSuratShown: boolean;
    isFormSuratShown: boolean;
    isForceQuit: boolean;
    savingMessage: string;
    afterSaveAction: string;
    suratCollection: any[];
    filteredSurat: any[];
    selectedSurat: any;
    keywordSurat: string;
    selectedMutation: any;
    currentDiff: Diff;

    constructor(private appRef: ApplicationRef){
        super();
        this.resultBefore = [];
        this.hots = { "penduduk": null, "logSurat": null, "mutasi": null };
        this.sheets = ['penduduk', 'logSurat', 'mutasi'];
        this.data = { "penduduk": [], "logSurat": [], "mutasi": [] };
        this.paging = { "limit": undefined, "page": 1, "offset": 0 };
        this.bundleData = { "penduduk": [], "logSurat": [], "mutasi": [] };
        this.bundleSchemas = { "penduduk": schemas.penduduk, "logSurat": schemas.logSurat, "mutasi": schemas.mutasi };
        this.mutationType = { "pindahDatang": 1, "kematian": 2, "kelahiran": 3 };
        this.selectedMutation = this.mutationType['pindahDatang'];
        this.selectedPenduduk = { "nik": null, "nama_penduduk": null };
        this.activeSheet = 'penduduk';
        this.importer = new Importer(pendudukImporterConfig);
    }

    ngOnInit(): void {
        if(settings.data.maxPaging){
            this.paging.limit = parseInt(settings.data.maxPaging);
            this.paging.offset = (this.paging.page - 1) * this.paging.limit;
        }
        
        this.sheets.forEach(sheet => {
            this.hots[sheet] = this.createHot(sheet);
            window['hots'][sheet] = this.hots[sheet];
        });

        document.addEventListener('keyup', (e) => {
            if(e.ctrlKey && e.keyCode === 83){
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            else if(e.ctrlKey && e.keyCode === 80){
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);

        this.setActiveSheet(this.activeSheet);
    }

    createHot(sheet): void {
        let element = $('.sheet-' + sheet)[0];
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

    setActiveSheet(sheet): boolean {
        this.activeSheet = sheet;
        let hot = this.hots[sheet];

        if(sheet === 'penduduk'){
            let spanSelected = $("#span-selected")[0];
            initializeTableSelected(hot, 1, spanSelected);

            let spanCount = $("#span-count")[0];
            initializeTableCount(hot, spanCount);

            let inputSearch = document.getElementById("input-search");
            this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
        }
        else if(sheet === 'statistic'){
            this.loadStatistics();
        }
        
        window.addEventListener('resize', (e) => {
            hot.render();
        })
        
        this.activeHot = hot;
        this.getContent(sheet);
        return false;
    }

    getContent(sheet): void {
        let me = this;

        dataApi.getContent(sheet, null, me.bundleData, me.bundleSchemas, (result) => {
            me.data[sheet] = result;

            if(!me.data[sheet])
                me.activeHot.loadData([]);
            else if(me.data[sheet].length > this.paging.limit)
                me.activeHot.loadData(this.pageData(me.data[sheet]));
            else
                me.activeHot.loadData(me.data[sheet]);

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
        this.bundleData[sheet] = this.hots[sheet].getSourceData();
        let me = this;
        
        dataApi.saveContent(sheet, null, me.bundleData, me.bundleSchemas, (err, data) => {
            me.savingMessage = "Penyimpanan berhasil";

            if(err)
               return;
            
            me.data[sheet] = data;

            if(data.length > me.paging.limit)
                me.activeHot.loadData(me.pageData(data));
            else
                me.activeHot.loadData(data);
            
            me.afterSave();

            setTimeout(() => {
                me.savingMessage = null;
            }, 2000);
        });
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

    loadSurat(): void {
        this.isPrintSuratShown = true;
        this.isFileMenuShown = true;
        this.isFormSuratShown = false;

        if(!this.activeHot)
            return;

        if(!this.activeHot.getSelected())
            return;

        this.selectedPenduduk = this.activeHot.getDataAtRow(this.activeHot.getSelected()[0]);

        if(!this.selectedPenduduk)
            return;
        
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

    selectSurat(surat): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;
        return false;
    }

    printSurat(): void {
        if(!this.selectedPenduduk)
            return;
        
        let penduduk = schemas.arrayToObj(this.selectedPenduduk, schemas.penduduk);
        let dataSettingsDir = path.join(APP.getPath("userData"), "settings.json");

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
                "logo": PendudukUtils.convertDataURIToBinary(dataSettings.logo), 
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
           
            this.bundleData['logSurat'] = this.data['logSurat'];

            dataApi.saveContent('logSurat', null, this.bundleData, this.bundleSchemas, (err, data) => {
                alert('Cetak surat berhasil dicatat');
            }); 
        });
    }

    renderSurat(data, surat): any {
        let fileName = remote.dialog.showSaveDialog({
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

        PendudukUtils.copySurat(fileName, localFilename, (err) => {});
        APP.relaunch();

        return fileId;
    }

    mutate(): void {
        switch(this.selectedMutation){
            case this.mutationType['pindahDatang']:
                this.hots['penduduk'].alter('insert_row', 0);
                this.activeHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                this.activeHot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                this.activeHot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                this.data['mutasi'].push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Pindah Datang',
                new Date()]);
            break;
            case this.mutationType['kematian']:
                this.hots['penduduk'].alter('remove_row', this.hots['penduduk'].getSelected()[0]);
                this.data['mutasi'].push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Kematian',
                new Date()]);
            break;
            case this.mutationType['kelahiran']:
                this.hots['penduduk'].alter('insert_row', 0);
                this.activeHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                this.activeHot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                this.activeHot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                this.data['mutasi'].push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Kelahiran',
                new Date()]);
            break;
        }

        dataApi.saveContent('penduduk', null, this.bundleData, this.bundleSchemas, (err, data) => {
            if(err)
                return;

            this.bundleData['mutasi'] = this.data['mutasi'];

            dataApi.saveContent('mutasi', null, this.bundleData, this.bundleSchemas, (err, data) => {
                if(err)
                    return;

                alert('Mutasi Berhasil');
                this.selectedPenduduk = null;
            }); 
        });
    }

    openMutationDialog(): void {
        if(!this.hots['penduduk'].getSelected())
            this.selectedPenduduk = [];
        else
            this.selectedPenduduk = this.hots['penduduk'].getDataAtRow(this.hots['penduduk'].getSelected()[0]);
        
        this.selectedPenduduk = schemas.arrayToObj(this.selectedPenduduk, schemas.penduduk);
        $('#mutation-modal').modal('show');
    }

    openSaveDialog(): void {
        let data = this.data[this.activeSheet];
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));

        this.updateData();
        this.currentDiff = this.trackDiff(jsonData["data"][this.activeSheet], data);

        let me = this;
        
        if(this.currentDiff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");

            setTimeout(() => {
                me.activeHot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
    }

    filterContent(): void{
        let plugin = this.activeHot.getPlugin('hiddenColumns');        
        let value = $('input[name=btn-filter]:checked').val();   
        let fields = schemas.penduduk.map(c => c.field);
        let result = PendudukUtils.spliceArray(fields, COLUMNS[value]);

        plugin.showColumns(this.resultBefore);

        if(value==0)
            plugin.showColumns(result);
        else 
            plugin.hideColumns(result);

        this.activeHot.render();
        this.resultBefore = result;
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

    pageData(data): any[] {
        let row  = (this.paging.page - 1) * this.paging.limit;
        let count = this.paging.page * this.paging.limit;
        let part  = [];
 
        for (;row < count;row++){
            if(!data[row])
                continue;

            part.push(data[row]);
        }

        return part;
    }

    forceQuit(): void{
        this.isForceQuit = true;
        this.afterSave();
    }

    afterSave(): void{
        if(this.afterSaveAction == "home")
            document.location.href="app.html";
        else if(this.afterSaveAction == "quit")
            APP.quit();
    } 

    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
        this.isPrintSuratShown = false;
        this.isFormSuratShown = false;
        
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }
}

class PendudukUtils{
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
