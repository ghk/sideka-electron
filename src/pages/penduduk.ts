import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import DiffTracker from "../helpers/diffTracker";
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';
import PendudukChart from "../helpers/pendudukChart";
import titleBar from '../helpers/titleBar';
import { Component, ApplicationRef } from "@angular/core";
import { remote, shell } from "electron";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Diff } from "../helpers/diffTracker";

const webdriver = require('selenium-webdriver');
const $ = require('jquery');
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
const expressions = require('angular-expressions');
const ImageModule = require('docxtemplater-image-module');
const base64 = require("uuid-base64");
const JSZip = require('jszip');

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id/app_Login/';
const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = { "penduduk": "penduduk", "logSurat": "penduduk", "mutasi": "penduduk" };

const COLUMNS = [
    schemas.penduduk.filter(e => e.field !== 'id').map(c => c.field),    
    ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"],
    ["nik","nama_penduduk","kompetensi","pendidikan","pekerjaan","pekerjaan_ped"]
];

require('./node_modules/bootstrap/dist/js/bootstrap.js');

enum Sheet { penduduk = 1, mutasi = 2, logSurat = 3, statistik = 4, keluarga = 5 };
enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent { 
    sheetComponent: SheetComponent;
    suratComponent: SuratComponent;
    prodeskelWebDriver: ProdeskelWebDriver;
    importer: any;
    activeSheet: Sheet;
    activeSidePage: string;
    savingMessage: string;
    afterSaveAction: string;
    isFileMenuShown: boolean;
    bundleData: any;
    bundleSchemas: any;
    currentDiff: Diff;
    selectedPenduduk: any;
    selectedMutasi: Mutasi;
    selectedDetail: any;
    selectedKeluarga: any;
    details: any[];
    keluargaCollection: any[];
    resultBefore: any[];
    syncData: any;

    constructor(private appRef: ApplicationRef){
        this.sheetComponent = new SheetComponent();
        this.suratComponent = new SuratComponent();
        this.activeSheet = Sheet.penduduk;
        this.activeSidePage = null;
        this.bundleData = {"penduduk": [], "mutasi": [], "logSurat": [] };
        this.bundleSchemas = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "logSurat": schemas.logSurat };
        this.selectedPenduduk = [];
        this.selectedDetail = [];
        this.selectedKeluarga = {"kk": null, "data": [] };
        this.details = [];
        this.keluargaCollection = [];
        this.resultBefore = [];
        this.syncData = { "penduduk": null, "action": null };
    }

    ngOnInit(): void {
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

        this.importer = new Importer(pendudukImporterConfig);
        this.sheetComponent.initializeSheets();
        this.getContent(this.activeSheet);
    }

    getContent(sheet): void {
        let me = this;
        let type = this.sheetComponent.getType(sheet);

        dataApi.getContent(type, null, this.bundleData, this.bundleSchemas, (result) => {
            if(!result)
                this.sheetComponent.data[type] = [];
            else
                this.sheetComponent.data[type] = result;
            
            this.sheetComponent.sheets[type].loadData(this.sheetComponent.data[type]);

            setTimeout(() => {
                me.sheetComponent.sheets[type].render();
                me.appRef.tick();
            }, 200);
        });
    }

    saveContent(sheet): void {
       $("#modal-save-diff").modal("hide");

       let type = this.sheetComponent.getType(sheet);
       let hotSheet = this.sheetComponent.sheets[type];
       let me = this;

       me.bundleData[type] = hotSheet.getSourceData();

       dataApi.saveContent(type, null, this.bundleData, this.bundleSchemas, (err, data) => {
            if(!err)
                me.savingMessage = 'Penyimpanan berhasil';
            else
                me.savingMessage = 'Penyimpanan gagal';
            
            me.sheetComponent.data[type] = data;
            hotSheet.loadData(me.sheetComponent.data[type]);

            me.afterSave();

            setTimeout(() => {
                me.savingMessage = null;
            }, 2000);
       });
    }

    setActiveSheet(sheet): boolean {
        this.activeSheet = sheet;
        this.selectedDetail = [];
        this.selectedKeluarga = {"kk": null, "data": [] };
        this.getContent(sheet);
        return false;
    }

    setStatistics(): boolean {
        this.activeSheet = Sheet.statistik;

        let chart = new PendudukChart();
        let sourceData = this.sheetComponent.getHotSheet(Sheet.penduduk).getSourceData();

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

        return false;
    }

    openSaveDialog(): void{
        let type = this.sheetComponent.getType(this.activeSheet);
        let data = this.sheetComponent.data[type];
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));
        
        this.updateData();
        this.currentDiff = this.sheetComponent.trackDiff(jsonData["data"][type], data);

        let me = this;
        
        if(this.currentDiff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");

            setTimeout(() => {
                me.sheetComponent.sheets[type].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else{
            this.savingMessage = 'Tidak ada data yang berubah';
            setTimeout(() => {
                me.savingMessage = null;
            }, 200)
        }
    }

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.pindahPergi);
        $('#mutasi-modal').modal('show');
    }

    changeMutasi(mutasi): void {
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);

        this.selectedMutasi = mutasi;
        this.selectedPenduduk = [];

        if(this.selectedMutasi === Mutasi.pindahPergi || this.selectedMutasi === Mutasi.kematian){
            if(!hot.getSelected())
                return;

            this.selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        }
    }

    updateData(): void {
        let type = this.sheetComponent.getType(this.activeSheet);
        let currentData: any[] = this.sheetComponent.data[type];
      
        for(let i=0; i<this.sheetComponent.data[type].length; i++){
            let data = currentData.filter(e => e[0] === this.sheetComponent.data[type][i][0])[0];
            
            if(!data)
              continue;
            
            this.sheetComponent.data[type][i] = data;
        }
    }

    insert(): void {
        this.sheetComponent.getHotSheet(Sheet.penduduk).alter('insert_row', 0);
    }

    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
      
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }

    showSuratMenu(): boolean {
        let pendudukHot = this.sheetComponent.getHotSheet(Sheet.penduduk);
        
        if(!pendudukHot.getSelected()){
            alert('Penduduk belum dipilih');
            return false;
        }

        this.selectedPenduduk = pendudukHot.getDataAtRow(pendudukHot.getSelected()[0]);

        if(!this.selectedPenduduk){
            alert('Penduduk tidak terdaftar');
            return false;
        }

        this.activeSidePage = 'surat';
        this.isFileMenuShown = true;
        this.suratComponent.isFormSuratShown = false;
        
        return false;  
    }

    afterSave(): void{
        if(this.afterSaveAction == "home")
            document.location.href="app.html";
        else if(this.afterSaveAction == "quit")
            APP.quit();
    } 

    mutasi(isMultiple: boolean): void {
        let hot = this.sheetComponent.sheets[this.sheetComponent.getType(Sheet.penduduk)];
        let data = this.sheetComponent.data[this.sheetComponent.getType(Sheet.mutasi)];

        switch(this.selectedMutasi){
            case Mutasi.pindahPergi:
                hot.alter('remove_row', hot.getSelected()[0]);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Pindah Pergi',
                this.selectedPenduduk.desa,
                new Date()]);
                break;
            case Mutasi.pindahDatang:
                hot.alter('insert_row', 0);
                hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Pindah Datang',
                this.selectedPenduduk.desa,
                new Date()]);
                break;
            case Mutasi.kematian:
                hot.alter('remove_row', hot.getSelected()[0]);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Kematian',
                '-',
                new Date()]);
                break;
            case Mutasi.kelahiran:
                hot.alter('insert_row', 0);
                hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                'Kelahiran',
                '-',
                new Date()]);
                break;
        }

        this.bundleData['penduduk'] = hot.getSourceData();
        this.bundleData['mutasi'] = data;
        
        dataApi.saveContent('penduduk', null, this.bundleData, this.bundleData, (err, data) => {});
        dataApi.saveContent('mutasi', null, this.bundleData, this.bundleSchemas, (err, data) => {
            if(!isMultiple)
                $('#mutasi-modal').modal('hide');
        });
    }

    addDetail(): void {
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);

        if(!hot.getSelected())
            return;
        
        let detail = hot.getDataAtRow(hot.getSelected()[0]);
        let existingDetail = this.details.filter(e => e[0] === detail[0])[0];

        if(!existingDetail)
            this.details.push(detail);
        
        this.selectedDetail = this.details[this.details.length - 1];
        this.activeSheet = null;
        this.selectedKeluarga = {"kk": null, "data": [] };
    }

    addKeluarga(): void {
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);

        if(!hot.getSelected())
            return;
        
        let penduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        let keluarga: any[] = hot.getSourceData().filter(e => e['22'] === penduduk.no_kk);

        if(keluarga.length > 0){
            this.keluargaCollection.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        } 
        this.selectedKeluarga = this.keluargaCollection[this.keluargaCollection.length - 1];
        this.sheetComponent.sheets[this.sheetComponent.getType(Sheet.keluarga)].loadData(this.selectedKeluarga.data);

        let me = this;

        setTimeout(() => {
            me.sheetComponent.sheets[me.sheetComponent.getType(Sheet.keluarga)].render();
            me.activeSheet = null;
            me.selectedDetail = [];
        }, 200);
    }

    removeDetail(detail): boolean {
        let index = this.details.indexOf(detail);

        if(index > -1)
            this.details.splice(index, 1);
        
        if(this.details.length === 0)
            this.setActiveSheet(Sheet.penduduk);
        else
            this.setDetail(this.details[this.details.length - 1]);

        return false;
    }

    removeKeluarga(keluarga): boolean{
        let index = this.keluargaCollection.indexOf(keluarga);

        if(index > -1)
            this.keluargaCollection.splice(index, 1);
        
        if(this.keluargaCollection.length === 0)
            this.setActiveSheet(Sheet.penduduk);
        else
            this.setKeluarga(keluarga);
        
        return false;
    }
    
    setDetail(detail): boolean {
        this.selectedDetail = detail;
        this.selectedKeluarga = {"kk": null, "data": [] };
        this.activeSheet = null;
        return false;
    }

    setKeluarga(kk): boolean{
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];
        
        if(!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.sheetComponent.sheets[this.sheetComponent.getType(Sheet.keluarga)].loadData(this.selectedKeluarga.data);
        
        let me = this;

        setTimeout(() => {
            me.sheetComponent.sheets[me.sheetComponent.getType(Sheet.keluarga)].render();
            me.activeSheet = null;
            me.selectedDetail = [];
        }, 200);

        return false;
    }

    filterContent(): void{
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);
        let plugin = hot.getPlugin('hiddenColumns');        
        let value = $('input[name=btn-filter]:checked').val();   
        let fields = schemas.penduduk.map(c => c.field);
        let result = this.sheetComponent.spliceArray(fields, COLUMNS[value]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
        
        hot.render();
        this.resultBefore = result;
    }

    initProdeskel(): void {
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);
        let selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        this.syncData.penduduk = selectedPenduduk;
        this.syncData.action = 'Tambah';
       
        this.prodeskelWebDriver = new ProdeskelWebDriver();
        this.prodeskelWebDriver.openSite();
        this.prodeskelWebDriver.login(settings.data['prodeskelRegCode'], settings.data['prodeskelPassword']);
        this.prodeskelWebDriver.openDDK();
        this.prodeskelWebDriver.switchToFrameDesa();
        this.prodeskelWebDriver.checkDataTable(this.syncData);
    }

    syncProdeskel(): void {
        $('#prodeskel-modal').modal('hide');
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);
        let dataSource = hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['22'] === this.syncData.penduduk.no_kk);
        let keluargaResult: any[] = [];

         for(let i=0; i<keluargaRaw.length; i++){
            var objRes = schemas.arrayToObj(keluargaRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            keluargaResult.push(objRes);
        }
        
        console.log(keluargaResult);

        this.prodeskelWebDriver.addNewKK(this.syncData.penduduk);
    }

    importExcel(): void {
        let files = remote.dialog.showOpenDialog(null);
        if(files && files.length){
            this.importer.init(files[0]);
            $("#modal-import-columns").modal("show");
        }
    }

    exportExcel(): void {
        let hot = this.sheetComponent.getHotSheet(Sheet.penduduk);        
        let data = hot.getData();
        exportPenduduk(data, "Data Penduduk");
    }
}

class SuratComponent{
    suratCollection: any[];
    filteredSurat: any[];
    selectedSurat: any;
    keywordSurat: string;
    isFormSuratShown: boolean;

    constructor(){
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

    printSurat(selectedPenduduk, hot, data, bundleData, bundleSchemas): void {
        if(!selectedPenduduk)
            return;
        
       let penduduk = schemas.arrayToObj(selectedPenduduk, schemas.penduduk);
       let dataSettingsDir = path.join(APP.getPath("userData"), "settings.json");

       if(!jetpack.exists(dataSettingsDir))
            return;
        
        let dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        let dataSource = hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['22'] === penduduk.no_kk);
        let keluargaResult: any[] = [];

        let penduduksRaw: any[] = dataSource.filter(e => e['22'] === penduduk.no_kk);
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
            docxData.vars = printvars;
            
            let form = this.selectedSurat.data;
            let fileId = this.renderSurat(docxData, this.selectedSurat);
           
            data.push([
                base64.encode(uuid.v4()),
                penduduk.nik,
                penduduk.nama_penduduk,
                this.selectedSurat.title,
                new Date(),
                fileId
            ]);

            bundleData['logSurat'] = data;
            dataApi.saveContent('logSurat', null, bundleData, bundleSchemas, (err, data) => {
                console.log(err);
            }); 
        });
    }

    renderSurat(data, surat): any {
        let fileName = remote.dialog.showSaveDialog({
            filters: [ {name: 'Word document', extensions: ['docx']}]
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

        this.copySurat(fileName, localFilename, (err) => {});
        APP.relaunch();

        return fileId;
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
}

class SheetComponent{
    data: any = {};
    sheets: any = {};
    tableSearcher: any;
    diffTracker: DiffTracker;

    constructor(){
        this.diffTracker = new DiffTracker();
    }

    initializeSheets(): void {
        let pendudukSheet: string = this.getType(Sheet.penduduk);
        let mutasiSheet: string = this.getType(Sheet.mutasi);
        let logSuratSheet: string = this.getType(Sheet.logSurat);
        let keluargaSheet: string = this.getType(Sheet.keluarga);

        this.sheets[pendudukSheet] = this.createSheet(pendudukSheet);
        this.sheets[mutasiSheet] = this.createSheet(mutasiSheet);
        this.sheets[logSuratSheet] = this.createSheet(logSuratSheet);
        this.sheets[keluargaSheet] = this.createSheet(keluargaSheet);

        let spanSelected = $("#span-selected")[0];
        initializeTableSelected(this.sheets[pendudukSheet], 1, spanSelected);

        let spanCount = $("#span-count")[0];
        initializeTableCount(this.sheets[pendudukSheet], spanCount);

        let inputSearch = document.getElementById("input-search");
        this.tableSearcher = initializeTableSearch(this.sheets[pendudukSheet], document, inputSearch, null);
    }
    
    createSheet(sheet): any {
        let element = $('.sheet-' + sheet)[0];

        if(!element)
            return;
        
        let schema = schemas[sheet];

        if(!this.data[sheet])
            this.data[sheet] = [];

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
            hiddenColumns: {columns: [0], indicators: true}, 
            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
            beforeRemoveRow: (row, amount) => {
                this.data[sheet].splice(row, amount);
            }
        });
    }

    getHotSheet(sheet): any{
        return this.sheets[this.getType(sheet)];
    }

    getType(sheetKey): string{
        return Sheet[sheetKey];
    }

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    spliceArray(fields, showColumns): any{
        let result=[];

        for(let i=0;i!=fields.length;i++){
            let index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }
}

class ProdeskelDriver{

}

class ProdeskelWebDriver{
    browser: any;

    constructor(){
        this.browser = new webdriver.Builder().forBrowser('firefox').build();
    }

    openSite(): void{
        this.browser.get(PRODESKEL_URL);
    }
    
    login(reqNo, password): void {
        this.browser.findElement(webdriver.By.name('login')).sendKeys(reqNo);
        this.browser.findElement(webdriver.By.name('pswd')).sendKeys(password);
        this.browser.findElement(webdriver.By.id('sub_form_b')).click();
    }

    openDDK(): void {
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('btn_1')), 5 * 1000).then(el => {
            el.click();
        });
    }

    switchToFrameDesa(): void {
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('iframe_mdesa')), 5 * 1000).then(el => {
            this.browser.switchTo().frame(el);
        });
    }

    checkDataTable(syncData): void {
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('quant_linhas_f0_bot')), 5 * 1000).then(el => {
            el.sendKeys('all');

            let formProcess = this.browser.findElement(webdriver.By.id('id_div_process_block'));

             this.browser.wait(webdriver.until.elementIsNotVisible(formProcess), 10 * 1000).then(() => {
           
                this.browser.findElement(webdriver.By.id('apl_grid_ddk01#?#1')).then(res => {
                    res.findElements(webdriver.By.tagName('tr')).then(rows => {
                         let exists: boolean = false;

                        rows.forEach(row => {
                            row.getText().then(val => {
                               let values = val.split(' ');

                               if(syncData.penduduk.nik === val)
                                 exists = true;  
                            });
                        });

                        if(exists)
                            syncData.action = 'Edit';

                         $('#prodeskel-modal').modal('show');
                    });    
                });
            });
        });
    }

    addNewKK(penduduk): void {
        this.browser.findElement(webdriver.By.id('sc_SC_btn_0_top')).click();
    }
}
