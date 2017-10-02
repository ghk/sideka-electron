import { remote } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { PersistablePage } from '../pages/persistablePage';
import { PenerimaanContentManager } from '../stores/siskeudesContentManager';
import { ReplaySubject, Observable } from 'rxjs';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import PageSaver from '../helpers/pageSaver';
import ContentMerger from '../helpers/contentMerger';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';

import schemas from '../schemas';
import TableHelper from '../helpers/table';
import titleBar from '../helpers/titleBar';

import * as $ from 'jquery';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
window['jQuery'] = $;

var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var bootstrap = require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'penerimaan',
    templateUrl: 'templates/penerimaan.html',
    styles: [`[hidden]:not([broken]) { display: none !important;}`]
})

export default class PenerimaanComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    type = "penerimaan";
    subType = null;

    hots: any = {};
    initialDatasets: any = {};
    activeSheet: string;
    activeHot: any;
    sheets: any;
    details: any[];
    selectedDetail: any;
    doubleClickEvent: any;
    isExist: boolean;
    isNonKasSwadaya: boolean;    
    dataAddTbpRinci: any[] = [];
    sourceDataTbpRinci: any[] = [];

    contentSelection: any = {};
    dataReferences: SiskeudesReferenceHolder;
    diffTracker: DiffTracker;
    desa: any = {};        

    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};

    progress: Progress;
    progressMessage: string;

    afterChangeHook: any;    
    contentManager: PenerimaanContentManager;
    pageSaver: PageSaver;
    hasPushed: boolean;
    modalSaveId;       

    constructor(
        public dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private sharedService: SharedService,
        private settingsService: SettingsService,
        private router: Router,
        private appRef: ApplicationRef,
        private zone: NgZone,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef
    ) {
        super(dataApiService);
        this.diffTracker = new DiffTracker();
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this, sharedService, null, router, toastr);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        for (let key in this.hots) {
            if (this.afterChangeHook)    
                this.hots[key].removeHook('afterChange', this.afterChangeHook);

            this.hots[key].destroy();
        }
        titleBar.removeTitle();
    }

    checkSiskeudesDB() {
        let result = true;
        let fileName = this.settingsService.get('siskeudes.path');
        let kodeDesa = this.settingsService.get('kodeDesa');

        if (!jetpack.exists(fileName)) {
            this.toastr.error(`Database Tidak Ditemukan di lokasi: ${fileName}`, '')
            result = false;
        }
        else {
            if (!kodeDesa || kodeDesa == 'null' || kodeDesa == "") {
                this.toastr.error("Harap Pilih Desa Pada menu Konfigurasi", "");
                result = false;
            }
        }

        return result;
    }

    onResize(event): void {
        let that = this;
        this.activeHot = this.hots[this.activeSheet];
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }
    
    ngAfterViewChecked() {
        if(this.hasPushed){
            let me = this;
            let id = '', sheetContainer;   

            setTimeout(function() {
                if(me.hasPushed){ 
                    me.dataAddTbpRinci.forEach(content => {
                        sheetContainer = document.getElementById('sheet-' + content.id);
                        me.hots[content.id] = me.createSheet(sheetContainer, content.id)
                        me.hots[content.id].loadData(content.data);   
                        if(content.id == me.activeSheet)               
                            me.activeHot =    me.hots[content.id];   
                    }); 

                    me.hasPushed = false;
                    me.dataAddTbpRinci = [];
                }
            }, 200);
        }
    }

    ngOnInit(): void {
        titleBar.title("Data Keuangan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        let me = this;
        this.details = [];
        this.modalSaveId = 'modal-save-diff';
        this.activeSheet = 'tbp';
        this.sheets = [ 'tbp', 'tbp_rinci'];
        this.pageSaver.bundleData = { "tbp": [], "tbp_rinci": [] };        
        this.pageSaver.bundleSchemas = { 
            "tbp": schemas.tbp,
            "tbp_rinci": schemas.tbp_rinci 
        };        
        this.hasPushed = false

        document.addEventListener('keyup', this.keyupListener, false);
        let sheetContainer =  document.getElementById('sheet-tbp')
        this.hots['tbp'] = this.createSheet(sheetContainer, 'tbp')
        this.activeHot = this.hots['tbp'];
        
        let isValidDB = this.checkSiskeudesDB();
        if (!isValidDB)
            return;
        
        this.siskeudesService.getTaDesa(null).then(desas => {
            this.desa = desas[0];
            this.subType = this.desa.tahun;

            this.contentManager = new PenerimaanContentManager(this.siskeudesService, this.desa, this.dataReferences)
            this.contentManager.getContents().then(data => {

                this.getAllReferences();
                this.sheets.forEach(sheet => {
                    if(sheet != 'tbp_rinci')
                        this.hots[sheet].loadData(data[sheet]);
                    this.initialDatasets[sheet] = data[sheet].map(c => c.slice());                    
                });

                this.sourceDataTbpRinci = data['tbp_rinci'].map(c => c.slice());
                this.progressMessage = 'Memuat data';
                
                this.pageSaver.getContent(this.progressListener.bind(this), 
                    (err, notifications, isSyncDiffs, data) => {
                        this.dataApiService.writeFile(data, this.sharedService.getPenerimaanFile(), null);
                });
                
                setTimeout(function() {
                    me.activeHot.render();
                }, 500);
            });
        })
    }

    forceQuit(): void {
        $('#modal-save-diff')['modal']('hide');
        this.router.navigateByUrl('/');
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            this.router.navigateByUrl('/');
        else if (this.afterSaveAction == "quit")
            remote.app.quit();
    }
    
    progressListener(progress: Progress) {
        this.progress = progress;
    }

    saveContentToServer() {
        this.sheets.forEach(sheet => {
            let sourceData = (sheet == 'tbp_rinci') ? this.mergeTbpRinciContent() : this.hots[sheet].getSourceData();
            this.pageSaver.bundleData[sheet] = sourceData;
        });

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(false, this.progressListener.bind(this), 
        (err, data) => {
            if(err)
                this.toastr.error(err);
            else
                this.toastr.success('Data berhasil disimpan ke server');

            this.dataApiService.writeFile(data, this.sharedService.getPenerimaanFile(), null);
        });
    }

    mergeContent(newBundle, oldBundle): any {
        let contentMerger = new ContentMerger(this.dataApiService);
        return contentMerger.mergeSiskeudesContent(newBundle, oldBundle, Object.keys(this.pageSaver.bundleSchemas));
    }    

    createSheet(sheetContainer, sheet): any {
        if(!sheet.startsWith('tbp'))
            sheet = 'tbp_rinci';
        let me = this;
        let result = new Handsontable(sheetContainer, {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas[sheet]),
            columns: schemas[sheet],

            colWidths: schemas.getColWidths(schemas[sheet]),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {
                columns: schemas[sheet].map((c, i) => { return (c.hiddenColumn == true) ? i : '' }).filter(c => c !== ''),
                indicators: true
            },

            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],

        });   
        this.afterChangeHook = (changes, source) => {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;

                if (me.stopLooping) {
                    me.stopLooping = false;
                    changes = [];
                }

                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if(me.activeSheet == "tbp")
                        return;
                    
                    if(col == 8){
                        me.updateTotalTbp(null);
                    }
                })
            }

        }
        result.addHook('afterChange', this.afterChangeHook);  

        return result;
    }

    selectTab(sheet): boolean {
        let me = this;
        let timeOut = setTimeout(function () {
            me.activeHot.render();
        }, 500);
        
        if(!sheet.startsWith('tbp')){
            let findResult = this.details.find(c => c.id == sheet)
            if(!findResult.active){
                clearTimeout(timeOut)
                return false;
            }
        }
            
        this.isExist = false;
        this.activeSheet = sheet;
        this.activeHot = this.hots[sheet]; 
        return false;       
    }

    removeDetail(id){
        let me = this;
        let detail = this.details.find( c => c.id == id);
        detail.active = false;
        this.selectTab('tbp');
    }

    addDetails(){
        let hot = this.hots['tbp'];
        let selected = hot.getSelected();
        let me = this;

        if (!selected) {
            this.toastr.warning('Tidak ada TBP yang dipilih');
            return;
        }

        let id = hot.getDataAtRow(selected[0])[0]; 
        let result = this.details.find(c => c.id == id);
        let data = this.sourceDataTbpRinci.filter(c => c[1] == id).map(c => c.slice());

        this.sourceDataTbpRinci = this.sourceDataTbpRinci.filter(c => c[1] !== id).map(c => c.slice());

        if(result){
            result.active = true;
            this.activeSheet = id; 
            this.activeHot = this.hots[id];
            this.dataAddTbpRinci = [];
        }
        else {
            let content = {
                id: id,
                data: data
            }
            let detail = {
                id: id,
                active: true
            };

            this.details.push(detail);
            this.dataAddTbpRinci.push(content);
            this.activeSheet = id;
            this.hasPushed = true;
        }
    }

    saveContent(): void {
        let me = this;
        let diffs = {};
        let sourceDatas = {
            tbp: this.hots['tbp'].getSourceData(),
            tbp_rinci: this.mergeTbpRinciContent()
        }

        this.sheets.forEach(sheet => {      
            let initialData = this.initialDatasets[sheet]     ;
            let sourceData = sourceDatas[sheet] 
            this.pageSaver.bundleData[sheet] = sourceData;

            diffs[sheet] = this.trackDiffs(initialData, sourceData);      
        });
        
        this.contentManager.saveDiffs(diffs, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Ke Database berhasil', '');
                this.saveContentToServer();
                
            }
            else
                this.toastr.warning('Penyimapanan Ke Database gagal', '');
        })
    };

    mergeTbpRinciContent():any{
        let result = [];
        let temp = [];
        let sourceData = this.hots['tbp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp));

        sourceData.forEach(obj => {
            let temp = [];
            let hot = this.hots[obj.no_tbp];
            if(hot){
                let data = hot.getSourceData().map(c => c.slice());
                temp = result.concat(data);
                result = temp;    
            }
            else {
                let data = this.sourceDataTbpRinci.filter(c => c[1] == obj.no_tbp);
                if(data){
                    temp = result.concat(data);
                    result = temp;    
                }
            }
        });

        return result;
    }

    addRow(model): void {
        let me = this;
        let position = 0;
        let sheet = (this.activeSheet == 'tbp') ? 'tbp' : 'tbp_rinci';
        let sourceData = this.activeHot.getSourceData().map(c => schemas.arrayToObj(c, schemas[sheet]));
        let desa = {kode_desa: this.desa.Kd_Desa, tahun: this.desa.Tahun}

        if(this.activeSheet == 'tbp'){
            sourceData.forEach((row, i) => {
                if(model.no_tbp > row.no_tbp){
                    position = i + 1;
                }
            });
            
            if(model.kode_bayar !== '2'){
                //menambahkan field yang kurang
                model.tanggal = model.tanggal.toString();
                model['jumlah'] = model.nilai;
                model['rekening_bank'] = '-';
                model['nama_bank'] = '-';
            }
            Object.assign(model, desa)

            //tambahkan detail / rincian tbp
            let rincianTbp =  this.dataReferences['rincian_tbp'].find(c => c.kode_rekening == model.kode);
            let data = Object.assign({}, rincianTbp, model);
            data['kode_desa'] = this.desa.Kd_Desa;
            data['tahun'] = this.desa.Tahun;
            data['id'] = model.no_tbp + model.kode;
            data['kode_kegiatan'] = (model.kode_bayar == '3') ? model.kode_kegiatan : this.desa.Kd_Desa + '00.00';     
            
            this.details.push({
                id: model['no_tbp'],
                active: false
            })
            this.dataAddTbpRinci.push({
                id: model['no_tbp'],
                data: [schemas.objToArray(data, schemas.tbp_rinci)]
            });
            this.hasPushed = true;
        }
        else {
            this.updateTotalTbp(model.nilai);

            let temp = model.nilai;
            let rincianTbp =  this.dataReferences['rincian_tbp'].find(c => c.kode_rekening == model.kode);  
            Object.assign(model, rincianTbp, desa);
            model['nilai'] = temp;
            model['id'] = this.activeSheet + model.kode;
            model['no_tbp'] = this.activeSheet;
            model['kode_kegiatan'] = (model.kode_bayar == '3') ? model.kode_kegiatan : this.desa.Kd_Desa + '00.00';

            sourceData.forEach((row, i) => {
                if(model.kode > row.kode){
                    position = i + 1;
                }
            });          
        }
                
        let content = schemas.objToArray(model, schemas[sheet]);

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length - 1, null, 'overwrite');

        this.activeHot.selectCell(position, 0, position, 5, null, null);
        this.model = {};        
    }

    addOneRow(): void {
        let isValidForm = this.validateForm();

        if (!isValidForm)
            return;

        this.addRow(this.model);
        $("#modal-add").modal("hide");
    }

    addOneRowAndAnother(): void {
        let isValidForm = this.validateForm();
        let me = this;

        if (!isValidForm)
            return;

        this.addRow(this.model);

        setTimeout(function() {
            me.activeHot.render()
            me.getTbpNumber();
        }, 200);
    }

    openAddRowDialog(): void {
        let id = (this.activeSheet == 'tbp') ? null : this.activeSheet;
        if(id){
            let sourceData = this.hots['tbp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp));
            let kodeBayar = sourceData.find(c => c.no_tbp == id).kode_bayar;

            this.isNonKasSwadaya = (kodeBayar == 3) ? true : false;
        }
        this.getTbpNumber();

        $("#modal-add").modal("show");
    }

    getTbpNumber(): void {
        if (this.activeSheet !== 'tbp')
            return;

        this.siskeudesService.getMaxNoTBP(data => {
            let fixLastNum = 0;
            let lastNumFromSheet = this.getLastNumberFromSheet('TBP');
            let kodeDesa = this.desa.Kd_Desa.slice(0, -1);
            let pad = '0000';

            if (data.length !== 0 && data[0].No_Bukti) {
                let lastNumFromDB = data[0].No_Bukti.split('/')[0];
                fixLastNum = (parseInt(lastNumFromDB) < lastNumFromSheet) ? lastNumFromSheet : parseInt(lastNumFromDB);
            }

            let newDigits = (fixLastNum + 1).toString();
            let stringNum = pad.substring(0, pad.length - newDigits.length) + newDigits;
            let newNumber = stringNum + '/TBP/' + kodeDesa + '/' + this.desa.Tahun;

            this.zone.run(() => {
                this.model.no_tbp = newNumber;
            })
        })
    }

    getLastNumberFromSheet(type) {
        let maxNumbers = [0];
        let numbers = [0];
        let sourceData = this.hots['tbp'].getSourceData().map(a => schemas.arrayToObj(a, schemas.tbp));
        
        if (sourceData.length == 0)
            return;

        sourceData.forEach(c => {
            if (c.no_tbp && c.no_tbp.split('/').length == 4 && c.no_tbp.search(type) != -1) {
                let splitCode = c.no_tbp.split('/');
                numbers.push(parseInt(splitCode[0]));
            }
        })

        maxNumbers.push(Math.max.apply(null, numbers))
        return Math.max.apply(null, maxNumbers);
    }

    categoryOnChange(value): void {
        let model = this.model;
        if(this.activeSheet == 'tbp'){
            if(model.kode_bayar == '1'){

            }
        }
    }

    selectedOnChange(selector): void {
    }

    async getAllReferences(): Promise<any> {
        var data = await this.siskeudesService.getRincianTBP(this.desa.Tahun, this.desa.Kd_Desa);
        this.dataReferences['rincian_tbp'] = data;

        data = await this.siskeudesService.getAllKegiatan(this.desa.Kd_Desa);
        this.dataReferences['kegiatan'] = data;
    }


    getCurrentDiffs(): any {
        let res = {};
        let keys = Object.keys(this.initialDatasets);
        let sourceDatas = {
            tbp: this.hots['tbp'].getSourceData(),
            tbp_rinci: this.mergeTbpRinciContent()
        }

        this.sheets.forEach(sheet => {
            let initialData = this.initialDatasets[sheet];
            let sourceData = sourceDatas[sheet];
            let diffs = this.diffTracker.trackDiff(initialData, sourceData);
            res[sheet] = diffs;
        });
        return res;   
    }

    

    trackDiffs(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    validateForm(): boolean {
        return true;
    }

    updateTotalTbp(nilai){
        if(!nilai)
            nilai = 0;
        let currentSourceData = this.activeHot.getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp_rinci));
        let totalAnggaran = 0;
        currentSourceData.forEach(obj => {
            totalAnggaran += parseInt(obj.nilai)
        });

        let sourceData = this.hots['tbp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp));
        let findTbp = sourceData.find(o => o.no_tbp == this.activeSheet);
        findTbp.jumlah = totalAnggaran + nilai;

        this.hots['tbp'].loadData(sourceData.map(o => schemas.objToArray(o, schemas.tbp)));
    }

    keyupListener = (e) => {
        // ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            this.pageSaver.onBeforeSave();
            e.preventDefault();
            e.stopPropagation();
        }
        // ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}
