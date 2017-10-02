import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { SppContentManager } from '../stores/siskeudesContentManager';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

import schemas from '../schemas';
import TableHelper from '../helpers/table';
import SumCounterSPP from "../helpers/sumCounterSPP";
import titleBar from '../helpers/titleBar';
import PageSaver from '../helpers/pageSaver';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';

var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

const FIELDS = [{
    category: 'rincian',
    lengthCode: 1,
    fieldName: ['Kd_Rincian', 'Nama_Obyek', '', 'Sumberdana', 'Nilai'],
    currents: { fieldName: 'Kd_Rincian', value: '', code: '' }
}, {
    category: 'pengeluaran',
    lengthCode: 2,
    fieldName: ['No_Bukti', 'Keterangan_Bukti', 'Tgl_Bukti', '', 'Nilai_SPP_Bukti', 'Nm_Penerima', 'Alamat', 'Nm_Bank', 'Rek_Bank', 'NPWP'],
    currents: { fieldName: 'No_Bukti', value: '', code: '' }
}, {
    category: 'potongan',
    lengthCode: 3,
    fieldName: ['Kd_Potongan', 'Nama_Obyek', '', '', 'Nilai_SPPPot'],
    currents: { fieldName: 'Kd_Potongan', value: '', code: '' }
}];

const FIELD_WHERE = {
    Ta_SPPRinci: ['Kd_Desa', 'No_SPP', 'Kd_Keg', 'Kd_Rincian'],
    Ta_SPPBukti: ['Kd_Desa','Kd_Rincian', 'No_Bukti'],
    Ta_SPPPot: ['Kd_Desa', 'No_SPP', 'No_Bukti', 'Kd_Rincian']
}

const POTONGAN_DESCS = [
    { code: '7.1.1.01.', desc: 'PPN', value:10 }, 
    { code: '7.1.1.02.', desc: 'PPh Pasal 21', value:1.5 }, 
    { code: '7.1.1.03.', desc: 'PPh Pasal 22', value:2 }, 
    { code: '7.1.1.04.', desc: 'PPh Pasal 23', value:5 }
]
const JENIS_SPP = { UM: 'Panjar', LS: 'Definitif', PBY: 'Pembiayaan' }

var hot;

@Component({
    selector: 'spp',
    templateUrl: 'templates/spp.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

export default class SppComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    type = "spp";
    subType = null;

    contentSelection: any = {};
    message: string;
    dataReferences: any = {};
    initialDataset: any;
    diffTracker: DiffTracker;
    afterSaveAction: string;
    progress: Progress;
    progressMessage: string;
    desa: any;
    contentManager: SppContentManager;
    details: any[] = [];
    activeSheet: string;
    sheets: any[] = [];
    hasPushed: boolean;
    hots: any ={};
    activeHot: any;
    initialDatasets: any = {};
    sourceDataSppBukti: any[] =[];
    dataAddSppBukti: any[] = [];
    model: any = {};
    sisaAnggaran: any;
    isPostingAvailable: boolean;
    postingSelected: any;

    afterRemoveRowHook: any;
    beforeRemoveRowHook: any;
    afterChangeHook: any;
    perencanaanSubscription: Subscription;
    pageSaver: PageSaver;
    modalSaveId;
    
    constructor(
        public dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private sharedService: SharedService,
        private settingsService: SettingsService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        private router: Router,
        private route: ActivatedRoute,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef
    ) {
        super(dataApiService);
        this.diffTracker = new DiffTracker();
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this, sharedService, null, router, toastr);
    }

    ngOnInit(): void {
        titleBar.title("Data Keuangan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        let me = this;
        this.details = [];
        this.modalSaveId = 'modal-save-diff';
        this.activeSheet = 'spp';
        this.hasPushed = false;
        this.sheets = [ 'spp', 'spp_bukti', 'spp_rinci'];
        this.pageSaver.bundleData = { "spp": [], "spp_bukti": [], "spp_rinci": [] };        
        this.pageSaver.bundleSchemas = { 
            "spp": schemas.spp,
            "spp_bukti": schemas.spp_bukti,
            "spp_rinci": schemas.spp_rinci
        };                

        document.addEventListener('keyup', this.keyupListener, false);
        let sheetContainer =  document.getElementById('sheet-spp');

        this.hots['spp'] = this.createSheet(sheetContainer, 'spp');
        this.activeHot = this.hots['spp'];
        
        let isValidDB = this.checkSiskeudesDB();
        if (!isValidDB)
            return;

        document.addEventListener('keyup', this.keyupListener, false);
        this.siskeudesService.getTaDesa(null).then(desas => {
            this.desa = desas[0];
            
            this.siskeudesService.getPostingLog(this.desa.Tahun).then(dataPosting =>{
                if(dataPosting.length === 0)
                    this.isPostingAvailable = false;

                this.dataReferences['posting_log'] = dataPosting;
                this.contentManager = new SppContentManager(this.siskeudesService, this.desa, this.dataReferences)
                this.contentManager.getContents().then(data => {
    
                    this.sheets.forEach(sheet => {
                        if(sheet == 'spp')
                            this.hots['spp'].loadData(data['spp']);
                        this.initialDatasets[sheet] = data[sheet].map(c => c.slice()); 
                    })
    
                    this.sourceDataSppBukti = data['spp_bukti'].map(c => c.slice());                
                    this.progressMessage = 'Memuat data';
                    
                    this.pageSaver.getContent(this.progressListener.bind(this), 
                        (err, notifications, isSyncDiffs, data) => {
                            this.dataApiService.writeFile(data, this.sharedService.getSPPFile(), null);
                    });
                    
                    setTimeout(function() {
                        me.activeHot.render();
                    }, 500);
                })

            })
        })
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

    forceQuit(): void {
        $('#modal-save-diff').modal('hide');
        this.router.navigateByUrl('/');
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            this.router.navigateByUrl('/');
        else if (this.afterSaveAction == "quit")
            this.sharedService.getApp().quit();
    }
    
    onResize(event) {
        let me = this;
        setTimeout(function () {
            me.activeHot.render();
        }, 200);
    }

    ngAfterViewChecked() {
        if(this.hasPushed){
            let me = this;
            let id = '', sheetContainer;   

            setTimeout(function() {
                if(me.hasPushed){ 
                    me.dataAddSppBukti.forEach(content => {
                        sheetContainer = document.getElementById('sheet-' + content.id);
                        me.hots[content.id] = me.createSheet(sheetContainer, content.id)
                        me.hots[content.id].loadData(content.data);   
                        if(content.id == me.activeSheet)               
                            me.activeHot =    me.hots[content.id];   
                    }); 

                    me.hasPushed = false;
                    me.dataAddSppBukti = [];
                }
            }, 200);
        }
    }
    createSheet(sheetContainer, sheet): any {
        if(sheet != 'spp')
            sheet = 'spp_bukti';
        let me = this;
        let config = {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas[sheet]),
            columns: schemas[sheet],
            hiddenColumns: {
                columns: schemas[sheet].map((c, i) => { return (c['hiddenColumn'] == true) ? i : '' }).filter(c => c !== ''),
                indicators: true
            },

            colWidths: schemas.getColWidths(schemas[sheet]),
            rowHeights: 23,
            columnSorting: true,
            sortIndicator: true,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        }
        let result = new Handsontable(sheetContainer, config);
        this.afterChangeHook = () => {

        }
        result.addHook('afterChange', this.afterChangeHook);
        return result;
    }

    mergeContent(newBundle, oldBundle): any {
        let condition = newBundle['diffs'] ? 'has_diffs' : 'new_setup';
        let keys = Object.keys(this.pageSaver.bundleData);

        switch(condition){
            case 'has_diffs':
                keys.forEach(key => {
                    let newDiffs = newBundle['diffs'][key] ? newBundle['diffs'][key] : [];
                    oldBundle['data'][key] = this.dataApiService.mergeDiffs(newDiffs, oldBundle['data'][key]);
                });
                break;
            case 'new_setup':
                keys.forEach(key => {
                    oldBundle['data'][key] = newBundle['data'][key] ? newBundle['data'][key] : [];
                });
                break;
        }
        
        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    getCurrentDiffs(): any {
        let res = { spp: {} };
        return res;   
    }
    trackDiffs(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
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

    selectTab(sheet): boolean {
        let me = this;
        let timeOut = setTimeout(function () {
            me.activeHot.render();
        }, 500);
        
        if(!sheet.startsWith('spp')){
            let findResult = this.details.find(c => c.id == sheet)
            if(!findResult.active){
                clearTimeout(timeOut)
                return false;
            }
        }
            
        this.activeSheet = sheet;
        this.activeHot = this.hots[sheet]; 
        return false;       
    }

    removeDetail(id){
        let me = this;
        let detail = this.details.find( c => c.id == id);
        detail.active = false;
        this.selectTab('spp');
    }

    addDetails(){
        let hot = this.hots['spp'];
        let selected = hot.getSelected();
        let me = this;

        if (!selected) {
            this.toastr.warning('Tidak ada SPP yang dipilih');
            return;
        }

        let id = hot.getDataAtRow(selected[0])[0]; 
        let result = this.details.find(c => c.id == id);
        let data = this.sourceDataSppBukti.filter(c => c[2] == id).map(c => c.slice());

        this.sourceDataSppBukti = this.sourceDataSppBukti.filter(c => c[2] !== id).map(c => c.slice());

        if(result){
            result.active = true;
            this.activeSheet = id; 
            this.activeHot = this.hots[id];
            this.dataAddSppBukti = [];
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
            this.dataAddSppBukti.push(content);
            this.activeSheet = id;
            this.hasPushed = true;
        }
    }

    mergeSppBuktiContent():any{
        let result = [];
        let temp = [];
        let sourceData = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));

        sourceData.forEach(obj => {
            let temp = [];
            let hot = this.hots[obj.no];
            if(hot){
                let data = hot.getSourceData().map(c => c.slice());
                temp = result.concat(data);
                result = temp;    
            }
            else {
                let data = this.sourceDataSppBukti.filter(c => c[2] == obj.no);
                if(data){
                    temp = result.concat(data);
                    result = temp;    
                }
            }
        });

        return result;
    }

    async getReferences() {
        var data = await this.siskeudesService.getPostingLog(this.desa.Tahun);
        this.dataReferences['posting_log'] = data;        
    }

    async getSisaAnggaran(kode_kegiatan){
        let data = this.initialDatasets['spp'].map(c => schemas.arrayToObj(c, schemas.spp));
        let sppData = data.find(c => c.no == this.activeSheet);

        if(sppData){
            sppData.tanggal = moment(sppData.tanggal, "DD-MM-YYYY").format('DD-MMM-YY');
            let data = await this.siskeudesService.getSisaAnggaran(sppData.tahun, sppData.kode_desa, kode_kegiatan, sppData.tanggal, this.dataReferences['posting_log'].kode_posting);

            this.sisaAnggaran = data;
        }
    }


    /*

    getSisaAnggaran(kdKeg, callback) {
        let newDate = moment(this.SPP.tanggalSPP, "DD-MM-YYYY").format('DD-MMM-YY');

        if(kdKeg)
            this.kdKegiatan = kdKeg;

        this.siskeudesService.getSisaAnggaranRAB(this.SPP.tahun,this.SPP.kdDesa, this.kdKegiatan, newDate, this.SPP.kdPosting, data => {
            this.sisaAnggaran = data;
            callback(data);
        });
    }

    transformData(data): any[] {
        let results = [];
        FIELDS.map(c => {c.currents.value = ''; c.currents.code = '';})
        data.forEach(content => {
            FIELDS.forEach((item, idx) => {
                let res = [];
                let current = item.currents;

                if (content[current.fieldName] || content[current.fieldName] !== null) {
                    let id = this.getNewId(item.category, content);
                    res.push(id)

                    for (let i = 0; i < item.fieldName.length; i++) {
                        let contentPush = (item.fieldName[i] == '') ? '' : content[item.fieldName[i]];

                        if (item.fieldName[i] == 'Nilai') {
                            if (item.category == 'rincian' && this.SPP.jenisSPP !== 'UM')
                                continue;
                        }

                        res.push(contentPush);
                    }

                    if (current.value != content[current.fieldName]) {
                        if (FIELDS[idx + 1])
                            FIELDS[idx + 1].currents.code = '';

                        results.push(res);
                    };
                    current.value = content[current.fieldName];
                }
            });
        });

        return results;
    }

    saveContent() {
        let me = this;
        $('#modal-save-diff').modal('hide');
      
        let sourceData = this.getSourceDataWithSums();
        this.pageSaver.bundleData['spp'] = sourceData;
        let diff = this.trackDiffs(this.initialDataset, sourceData);

        if (diff.total < 1) return;

        this.sum = this.getSumAnggaran()
        let bundle = this.bundle(diff);

        this.siskeudesService.saveToSiskeudesDB(bundle, null, response => {
            if(response.length == 0){
                this.toastr.success('Penyimpanan berhasil', '');
                this.saveContentToServer();
                
                this.siskeudesService.updateSPPRinci(this.SPP.noSPP, this.kdKegiatan, response =>{
                    if(response.length == 0)
                        this.getContent();
                })
            }
            else
                this.toastr.warning('penyimpanan gagal', '')
        });
    };

    saveContentToServer() {
        this.pageSaver.bundleData['spp'] = this.hot.getSourceData();

        this.progressMessage = 'Menyimpan Data';

        let subtype = this.SPP.noSPP.split('/').join('_');
        this.pageSaver.saveContent('spp', subtype, false, this.progressListener.bind(this), 
        (err, data) => {
            if(err)
                this.toastr.error(err);
            else
                this.toastr.success('Data berhasil disimpan ke server');

            this.dataApiService.writeFile(data, this.sharedService.getSPPFile(), null);
        });
    }

    bundle(bundleDiff): any {        
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        bundleDiff.added.forEach(content => {
            let contentObj = schemas.arrayToObj(content, schemas.oldSpp);
            let result = this.bundleArrToObj(contentObj);  
                                 
            bundle.insert.push({[result.table]: result.data})
        });

        bundleDiff.modified.forEach(content => {
            let contentObj = schemas.arrayToObj(content, schemas.oldSpp);
            let result = this.bundleArrToObj(contentObj);
            let whereClause = {};

            FIELD_WHERE[result.table].forEach(c => {
                whereClause[c] = result.data[c];
            });

            result.data = KeuanganUtils.sliceObject(result.data, FIELD_WHERE[result.table])
            bundle.update.push({ [result.table]: { whereClause: whereClause, data: result.data  } })  
        });

        bundleDiff.deleted.forEach(content => {
            let contentObj = schemas.arrayToObj(content, schemas.oldSpp);
            let result = this.bundleArrToObj(contentObj);
            let whereClause = {};

            FIELD_WHERE[result.table].forEach(c => {
                whereClause[c] = result.data[c];
            });

            result.data = KeuanganUtils.sliceObject(result.data, FIELD_WHERE[result.table])
            bundle.delete.push({ [result.table]: { whereClause: whereClause, data: result.data  } })  
        });

        return bundle;
    }

    bundleArrToObj(content): any {        
        let results = {};   
        let table = '';     
        let aliasFields = { };
        let extendCol = { Tahun: this.SPP.tahun, Kd_Desa: this.SPP.kdDesa, No_SPP: this.SPP.noSPP };

        content = this.normalize(content)
        let id = this.parseId(content.id)
        
        Object.assign(content, extendCol);

        if (content.id.split('_').length == 1){
            table = 'Ta_SPPRinci';

            content['Nilai'] = (this.SPP.jenisSPP == 'UM') ? content.anggaran : this.sum[content.code];
            content['Kd_Keg'] = this.kdKegiatan;            
            aliasFields = { code: 'Kd_Rincian', sumberdana: 'Sumberdana'}
        }
        else if (content.id.split('_').length == 3){
            table = 'Ta_SPPPot';       

            let kode_desa = this.SPP.kdDesa.substring(-1);
            let noBukti = content.id.split('_')[1]
            content['No_Bukti'] = noBukti;
            content['Kd_Keg'] = this.kdKegiatan;
            
            aliasFields = { code: 'Kd_Rincian', anggaran: 'Nilai'}
        }
        else { 
            let rincian  = this.sisaAnggaran.find(c => c.Kd_Rincian == id.Kd_Rincian);
            
            if(rincian)
                content['Sumberdana'] = rincian.SumberDana;

            table = 'Ta_SPPBukti';
            content['Kd_Keg'] = this.kdKegiatan;
            content['Kd_Rincian'] = id.Kd_Rincian;

            aliasFields = { code: 'No_Bukti', date: 'Tgl_Bukti', uraian: 'Keterangan', anggaran: 'Nilai'}            
        }

        Object.keys(content).forEach(c => {
            if(aliasFields[c])
                content[aliasFields[c]] = content[c];
        })
 
        return {table: table, data: content}
    }

    getSourceDataWithSums(): any[] {
        let data = this.hot.sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas.oldSpp));
        return data
    }

    
    
    openSaveDialog() {
        let that = this;
        this.hot.sumCounter.calculateAll();

        let sourceData = this.getSourceDataWithSums();    
        this.diffContents = this.trackDiffs(this.initialDataset, sourceData)

        if (this.diffContents.total > 0) {
            $("#modal-save-diff").modal("show");
            this.afterSaveAction = null;
            setTimeout(() => {
                that.hot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
        else {
            this.toastr.warning('Tidak ada data yang berubah', 'Warning!');
        }
    }

    openAddRowDialog(): void {
        this.model = {};
        this.contentSelection = {};      
        this.isExist = false  

        let selected = this.hot.getSelected();
        let category = 'rincian';
        let sourceData = this.hot.getSourceData();

        if (selected && this.SPP.jenisSPP !== 'UM') {
            let data = this.hot.getDataAtRow(selected[0]);
            let dotCount = data[0].split('.').length;
            let code = data[0];

            if (code.startsWith('5.') && dotCount == 4)
                category = 'pengeluaran';
            else
                category = 'potongan';
        }
        this.model.category = category;
        this.setDefaultValue();       

        $("#modal-add").modal("show");

        if(sourceData.length != 0 )    
            this.categoryOnChange(category); 
        else {
            this.isSPPDetailEmpty = true;
            this.contentSelection['allKegiatan'] = this.dataReferences['allKegiatan'];
        }
    }

    addRow(): void {
        let me = this;
        let position = 0;
        let results = [];
        let data = this.model;
        let currentCode, lastCode;
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let currentField = FIELDS.filter(c => c.category == this.model.category).map(c => c.fieldName)[0];
        
        switch (this.model.category) {
            case 'rincian': 
                for(let i = 0; i < sourceData.length; i++){
                    let row = sourceData[i];
                    if(data.Kd_Rincian > row.id)
                        position = i+1;
                }
                let detailRincian = this.sisaAnggaran.find(c => c.Kd_Rincian == this.model.Kd_Rincian);
                
                Object.assign(data, {Nama_Obyek: detailRincian.Nama_Rincian, Sumberdana: detailRincian.SumberDana});
                
                break;
            case 'pengeluaran':
                let kdRincian = "";
                sourceData.forEach((c, i) => {
                    if(c.id.startsWith(data.Kd_Rincian)){
                        position = i + 1;
                    }
                });

                data['KdRinci'] = data.Kd_Rincian;
                break;
            case 'potongan':
                let buktiPengeluaran = '';
                let id = data.Kd_Rincian +'_'+ this.model.No_Bukti;
                sourceData.forEach((c, i) => {
                    if (c.id.startsWith(id))
                        position = i + 1;
                });
                let potongan = this.dataReferences.potongan.find(c => c.Kd_Potongan == data.Kd_Potongan);
                data['Nama_Obyek'] = potongan.Nama_Obyek
                break;
        }

        let id = this.getNewId(data.category, data);
        results.push(id)
        currentField.forEach(f => {
            results.push(data[f])
        });

        if (data.category == 'pengeluaran') {
            let rincian = this.sisaAnggaran.find(c => c.Kd_Rincian == data.Kd_Rincian);
            rincian.Sisa = rincian.Sisa - data.Nilai_SPP_Bukti;
        }

        if(data.category == 'rincian' && this.SPP.jenisSPP == "UM"){
            let rincian = this.sisaAnggaran.find(c => c.Kd_Rincian == data.Kd_Rincian);
            rincian.Sisa = rincian.Sisa - data.Nilai_SPP_Bukti;
        }        

        this.isSPPDetailEmpty = false;
        this.hot.alter("insert_row", position);
        this.hot.populateFromArray(position, 0, [results], position, results.length - 1, null, 'overwrite');
        this.hot.sumCounter.calculateAll();
        setTimeout(function () {
            me.hot.render();
        }, 300);
    }

    addOneRow(): void { 
        let isValid = this.validate();

        if (isValid) {
            this.addRow();
            $("#modal-add").modal("hide");
        }
    }

    addOneRowAndAnother(): void {
        let isValid = this.validate();

        if (isValid) {
            this.addRow();
        }
    }

    categoryOnChange(value): void {
        this.isExist = false;
        this.model = {}
        this.model.category = value;
        this.setDefaultValue();       

        if (value == 'rincian') {
            let sourceData = this.hot.getSourceData();

            if (sourceData.length == 0) {
                 this.kdKegiatan = null;
                 this.isSPPDetailEmpty = true;
                 this.contentSelection['allKegiatan'] = this.dataReferences["allKegiatan"];
            }         
            else
                this.selectedOnChange(this.kdKegiatan);
        }
        else {
            let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
            let rincian = sourceData.filter(c => c.code.startsWith('5.') && c.code.split('.').length == 5);
                        
            if(value == 'pengeluaran')
                this.model.No_Bukti = '00000/KWT/' + this.SPP.kdDesa +'/'+ this.SPP.tahun;        
            this.contentSelection['availableRincian'] = rincian;       
        }
    }

    selectedOnChange(value): void {
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        switch (this.model.category) {
            case 'rincian':
                let rincianAdded = [];

                this.contentSelection["rincianRAB"] = []; 
                this.model.Kd_Rincian = null;

                if (sourceData.length == 0){
                    this.getSisaAnggaran(value, data =>{
                        this.sisaAnggaran = data;
                        this.zone.run(() => {
                            this.contentSelection["rincianRAB"] = data;
                        })                        
                    })
                }
                else {
                    let rincianAdded = sourceData.filter(c => c.code.split('.').length == 5 && c.code.startsWith('5.'));

                    this.sisaAnggaran.forEach(rinci => {
                        if (!rincianAdded.find(c => c.code == rinci.Kd_Rincian))
                            this.contentSelection["rincianRAB"].push(rinci)
                    });
                }
                break;

            case 'potongan':
                let data = sourceData.filter(c => c.id.startsWith(value) && c.id.split('_').length == 2);
                this.contentSelection['availablePengeluaran'] = data;
                break;
        }
    }

    validate(): boolean {
        let isValidForm = this.validateForm();
        let isExist = this.validateIsExist();

        if (isExist && this.model.category !== 'rincian') {
            let messageFor = (this.model.category == 'pengeluaran') ? 'No Bukti Pengeluaran' : 'No Potongan';

            this.toastr.error(`${messageFor} Ini sudah ditambahkan`)
            return false;
        }

        if (this.isExist)
            return false;

        if (isValidForm) {
            let isNotEnoughAnggaran = false;

            if (this.model.category == 'pengeluaran') 
                isNotEnoughAnggaran = this.validateSisaAnggaran();

            if (this.model.category == 'rincian' && this.SPP.jenisSPP == 'UM')
                isNotEnoughAnggaran = this.validateSisaAnggaran();
            
            if (isNotEnoughAnggaran) {
                this.toastr.error('Sisa Anggaran Tidak mencukupi', '')
                return false;
            }            
            return true;
        } 
        return false;
    }

    validateIsExist(): boolean {
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let isExist = false;

        if (this.model.category == 'pengeluaran') {
            let kdRincian = '';
            let code = this.model.No_Bukti;
            for (let i = 0; i < sourceData.length; i++) {
                let row = sourceData[i];

                if (row.code.split('.').length == 5 && row.code.startsWith('5.'))
                    kdRincian = row.code;

                if (kdRincian == this.model.Kd_Rincian) {
                    if (code == row.code) {
                        isExist = true;
                        break;
                    }
                }
            }
        }
        return isExist;
    }

    validateForm(): boolean {
        let fields = [];
        let result = true;

        switch (this.model.category) {
            case 'rincian': 
                fields.push({ name: 'Rincian', field: 'Kd_Rincian' });

                if (this.kdKegiatan == "")
                    this.toastr.error('Kegiatan Tidak Boleh Kosong!', '');
                if (this.SPP.jenisSPP == 'UM')
                    fields.push({ name: 'Nilai', field: 'Nilai' });

                break;
            case 'pengeluaran':
                fields.push(
                    { name: 'Rincian', field: 'Kd_Rincian' }, 
                    { name: 'Tanggal', field: 'Tgl_Bukti' },
                    { name: 'Nomor Bukti', field: 'No_Bukti' },
                    { name: 'Nm Penerima', field: 'Nm_Penerima' },
                    { name: 'Uraian', field: 'Keterangan_Bukti' }  
                ); 
                let year = moment(this.model.Tgl_Bukti, "DD/MM/YYYY").year().toString();
                
                if (this.SPP.tahun !== year) {
                    this.toastr.error('Tahun kwitansi Tidak Boleh Melebihi tahun SPP', '');
                    result = false;
                }
                break;
            case 'potongan':
                fields.push(
                    { name: 'Rincian', field: 'Kd_Rincian' }, 
                    { name: 'Nomor Bukti', field: 'No_Bukti' },
                    { name: 'Potongan', field: 'Kd_Potongan' },
                ); 
                let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
                let pengeluaran = sourceData.find(c => c.code == this.model.No_Bukti)
                if(pengeluaran){
                    if(this.model.Nilai_SPPPot > pengeluaran.anggaran){
                        this.toastr.error('Jumlah Nilai tidak boleh melebihi nilai pengeluaran', '');
                        result = false;
                    }
                }
                break;
        }
        
        fields.forEach(c => {
            if (this.model[c.field] == null || this.model[c.field] == "" || this.model[c.field] == 'null') {
                this.toastr.error(`${c.name} Tidak boleh Kosong`, ``);
                result = false;
            }
        })

        return result;
    }

    validateSisaAnggaran(): boolean {   
        let result = false;     
        let rincian = this.sisaAnggaran.find(c => c.Kd_Rincian == this.model.Kd_Rincian);
        let sisaAnggaran = (this.SPP.jenisSPP == 'UM') ? rincian.Sisa - this.model.Nilai : rincian.Sisa - this.model.Nilai_SPP_Bukti;

        if (sisaAnggaran < 0) {
            result = true;
        }
        
        return result;
    }

    getReferences(): void {
        this.siskeudesService.getRefPotongan(potongan => {
            this.dataReferences["potongan"] = potongan;

            this.siskeudesService.getAllKegiatan(this.SPP.kdDesa, data => {
                let isUsulanApbdesOnly = true;
                let results = [];
    
                if (this.posting['KdPosting'])
    
                if (isUsulanApbdesOnly) {
                    results = data.filter(c => {
                        let endCode = c.Kd_Keg.slice(-3);
                        let filters = ['01.', '02.', '03.'];
    
                        if (filters.indexOf(endCode) !== -1)
                            return c
                    })
                }
                else 
                    results = data;
    
                this.dataReferences["allKegiatan"] = results;
            })
        })

        
    }

    setDefaultValue(): void {
        let fields = [];
        switch (this.model.category) {
            case 'rincian':
                fields = ['Kegiatan', 'Kd_Rincian'];
                break;
            case 'pengeluaran':
                this.model.Nilai_SPP_Bukti = 0;
                fields = ['Kd_Rincian'];
                break;
            case 'potongan':
                this.model.Nilai_SPPPot = 0;
                fields = ['Kd_Rincian', 'No_Bukti', 'Kd_Potongan'];
                break
        }

        fields.forEach(c => {
            this.model[c] = null;
        })
    }

    getNewCode(kdRincian): void{
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let currentKdRincian = '';
        let pad = '00000';
        let result;

        if(kdRincian == 'null' || !kdRincian)
            return;

        this.siskeudesService.getMaxNoBukti(this.SPP.kdDesa, data =>{
            if(!data[0].No_Bukti){
                this.zone.run(()=>{
                    this.model.No_Bukti = `00001/KWT/${this.SPP.kdDesa}/${this.SPP.tahun}`;
                })
            }
            else {
            
                let splitCode = data[0].No_Bukti.split('/');
                let lastNumber = 0;
                let lastNumberFromDB = parseInt(splitCode[0]);                
                let lasNumberFromSheet = this.getMaxCodeFromSheet();

                if(lastNumberFromDB < lasNumberFromSheet)
                    lastNumber = lasNumberFromSheet;
                else
                    lastNumber = lastNumberFromDB;
                
                let newNumber = (lastNumber+1).toString();
                let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
                this.zone.run(()=>{
                    this.model.No_Bukti = stringNum + '/' + splitCode.slice(1).join('/');
                })
                
            }
        });        
    }

    getMaxCodeFromSheet(){
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let result = [0];
        sourceData.forEach(c => {
            if(c.code.search('KWT') !== -1){
                let number = parseInt(c.code.split('/')[0]);
                result.push(number);
            }
        })
        return Math.max.apply(null, result)
    }

    getNewId(category, content): string {
        let id = '';
        switch(category){
            case 'rincian':
                id = content.Kd_Rincian;
                break;
            case 'pengeluaran':
                id = `${content.Kd_Rincian}_${content.No_Bukti}`;
                break;
            case 'potongan':
                id = `${content.Kd_Rincian}_${content.No_Bukti}_${content.Kd_Potongan}`
                break;                
        }

        return id;        
    }

    parseId(id): any {
        let result = {Kd_Rincian:'', No_Bukti:'', Kd_Potongan:''}
        let splitId = id.split('_');
        
        Object.keys(result).forEach((c, i) => {
            if(splitId[i])
                result[c] = splitId[i];    
        })
        
        return result;
    }

    getSumAnggaran(): any {
        let sum = {};
        let tempSumPotongan = {};        
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let currentBukti = {} ;

        sourceData.forEach(c => {
            if (c.code.split('.').length == 5 && c.code.startsWith('5.')){
                sum[c.code] = 0;
            }

            if(Object.keys(sum).indexOf(c.flag) !== -1){
                sum[c.flag] += c.anggaran;             
            }  
        });       

        return sum;                
    }    

    normalize(content){
        Object.keys(content).forEach(c => {
            if(!content[c]){
                if(isFinite(content[c]) && content[c] !== null)
                    return;
                content[c] = ""
            }
        })
        return content;
    }

    potonganOnChange(){
        this.potongan = POTONGAN_DESCS.find(c => c.code == this.model.Kd_Potongan);
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        if(this.potongan)
            this.model.PersentasePajak = this.potongan.value; 
        else
            this.model.dppPajak =  0;    
        this.getPajakValue();       
    }

    getPajakValue(){
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let pengeluaran = sourceData.find(c => c.code == this.model.No_Bukti)

        if(pengeluaran && this.potongan){
            if(this.potongan.code != '7.1.1.04.')
                this.model.nilaiPajak = ((this.model.PersentasePajak / (100+this.model.PersentasePajak) * pengeluaran.anggaran));
            else {
                let ppn = 10 / (100 + 10) * pengeluaran.anggaran;
                this.model.nilaiPajak = ((pengeluaran.anggaran-this.model.PersentasePajak)*(this.model.PersentasePajak/100)); 
            }
            this.model.dppPajak = (pengeluaran.anggaran - this.model.nilaiPajak).toFixed(2);  
            this.model.nilaiPajak = this.model.nilaiPajak.toFixed(2)

        }
    }

    setPajakOnClick(){
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        let pengeluaran = sourceData.find(c => c.code == this.model.No_Bukti)

        if(pengeluaran && this.potongan){
            if(this.potongan.code != '7.1.1.04.')
                this.model.Nilai_SPPPot = ((this.model.PersentasePajak / (100+this.model.PersentasePajak) * pengeluaran.anggaran));
            else {
                let ppn = 10 / (100 + 10) * pengeluaran.anggaran;
                this.model.Nilai_SPPPot = ((pengeluaran.anggaran-this.model.PersentasePajak)*(this.model.PersentasePajak/100)); 
            }
            this.model.dppPajak =  (pengeluaran.anggaran - this.model.Nilai_SPPPot).toFixed(2); 
            this.model.Nilai_SPPPot = this.model.Nilai_SPPPot.toFixed(2) 
        }
    }*/

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