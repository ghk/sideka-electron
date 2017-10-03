import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { SppContentManager } from '../stores/siskeudesContentManager';
import { fromSiskeudes } from '../stores/siskeudesFieldTransformer';

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
import * as bootstrap from 'bootstrap';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';

var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
const POTONGAN_DESCS = [
    { code: '7.1.1.01.', desc: 'PPN', value:10 }, 
    { code: '7.1.1.02.', desc: 'PPh Pasal 21', value:1.5 }, 
    { code: '7.1.1.03.', desc: 'PPh Pasal 22', value:2 }, 
    { code: '7.1.1.04.', desc: 'PPh Pasal 23', value:5 }
]
const JENIS_SPP = { UM: 'Panjar', LS: 'Definitif', PBY: 'Pembiayaan' }

@Component({
    selector: 'spp',
    templateUrl: '../templates/spp.html',
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
    dataAddSpp: any[] = [];
    sourceDatas: any = {};
    model: any = {};
    sisaAnggaran: any;
    isEmptyPosting: boolean;
    postingSelected: any;
    sppSelected: any = {};
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
        this.sourceDatas = { "spp": [], "spp_bukti": [], "spp_rinci": [] };          
        this.pageSaver.bundleSchemas = { 
            "spp": schemas.spp,
            "spp_bukti": schemas.spp_bukti,
            "spp_rinci": schemas.spp_rinci
        };    
        
        document.addEventListener('keyup', this.keyupListener, false);
        let sheetContainer =  document.getElementById('sheet-spp');

        this.hots['spp'] = this.createSheet(sheetContainer, 'spp', null);
        this.activeHot = this.hots['spp'];
        
        let isValidDB = this.checkSiskeudesDB();
        if (!isValidDB)
            return;

        document.addEventListener('keyup', this.keyupListener, false);
        this.siskeudesService.getTaDesa(null).then(desas => {
            //untuk sementarta di transform disini 
            this.desa = desas.map(r => fromSiskeudes(r, "desa"))[0];

            this.siskeudesService.getPostingLog(this.desa.kode_desa).then(dataPosting =>{
                //untuk sementarta di transform disini
                let result = dataPosting.map(r => fromSiskeudes(r, "posting_log"));
                let currentPosting;
                this.isEmptyPosting = false;
                
                if(result.length === 0)
                    this.isEmptyPosting = true;
                else {
                    result.forEach(row => {
                        if (row.kode_posting == '3')
                            return;        
                        if (row.kode_posting == '1' && currentPosting !== '2') {
                            this.postingSelected = row;
                            currentPosting = '1';
                        }
                        else if (row.kode_posting == '2') {
                            this.postingSelected = row;
                            currentPosting = '2';
                        }
                    });
                }
                
                this.contentManager = new SppContentManager(this.siskeudesService, this.desa, this.dataReferences)
                this.contentManager.getContents().then(data => {    
                    this.sheets.forEach(sheet => {
                        if(sheet == 'spp')
                            this.hots['spp'].loadData(data['spp']);
                        this.initialDatasets[sheet] = data[sheet].map(c => c.slice()); 
                        this.sourceDatas[sheet] = data[sheet].map(c => c.slice());
                    })
                                        
                    this.progressMessage = 'Memuat data';                    
                    this.pageSaver.getContent(this.progressListener.bind(this), 
                        (err, notifications, isSyncDiffs, data) => {
                            this.dataApiService.writeFile(data, this.sharedService.getSPPFile(), null);
                    });

                    this.getReferences();
                    
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
                    me.dataAddSpp.forEach(content => {
                        sheetContainer = document.getElementById('sheet-' + content.id);
                        me.hots[content.id] = me.createSheet(sheetContainer, content.id, content.jenis);
                        me.hots[content.id].loadData(content.data);   
                        if(content.id == me.activeSheet)               
                            me.activeHot =    me.hots[content.id];   
                    }); 

                    me.hasPushed = false;
                    me.dataAddSpp = [];
                }
            }, 200);
        }
    }
    createSheet(sheetContainer, sheet, jenis): any {
        if(jenis == 'UM')
            sheet = 'spp_rinci';
        else if(sheet != 'spp' && jenis !== 'UM')
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
        let data = [];

        if (!selected) {
            this.toastr.warning('Tidak ada SPP yang dipilih');
            return;
        }

        let row = schemas.arrayToObj(hot.getDataAtRow(selected[0]), schemas.spp);
        let result = this.details.find(c => c.id == row.no);

        if(row.jenis == 'UM'){
            data = this.sourceDatas['spp_rinci'].filter(c => c[2] == row.no).map(c => c.slice());
            this.sourceDatas['spp_rinci'] = this.sourceDatas['spp_rinci'].filter(c => c[2] !== row.no).map(c => c.slice());
        }
        else {
            data = this.sourceDatas['spp_bukti'].filter(c => c[2] == row.no).map(c => c.slice());
            this.sourceDatas['spp_bukti'] = this.sourceDatas['spp_bukti'].filter(c => c[2] !== row.no).map(c => c.slice());
        }

        if(result){
            result.active = true;
            this.activeSheet = row.no; 
            this.activeHot = this.hots[row.no];
            this.dataAddSpp = [];
        }
        else {
            let content = {
                id: row.no,
                data: data,
                jenis: row.jenis
            }
            let detail = {
                id: row.no,
                active: true
            };

            this.details.push(detail);
            this.dataAddSpp.push(content);
            this.activeSheet = row.no;
            this.hasPushed = true;
        }
    }

    mergeSppDetail():any{
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
                let data = this.sourceDatas['spp_bukti'].filter(c => c[2] == obj.no);
                if(data){
                    temp = result.concat(data);
                    result = temp;    
                }
            }
        });

        return result;
    }
    
    openAddRowDialog(){
        $("#modal-add").modal("show");  

        if(this.activeSheet == 'spp')
            this.getMaxNumber('spp');
        this.getMaxNumber('spp_bukti');
    }

    getMaxNumber(sheet): void{
        let pad = (sheet == 'spp') ? '0000' : '00000';   
        let func = (sheet == 'spp') ? 'getMaxNoSPP' : 'getMaxNoBukti';
        let initial = (sheet == 'spp') ? 'SPP' : 'KWT';
        let def = (sheet == 'spp') ? '0001' : '00001';     
        let entityName = (sheet == 'spp') ? 'no_spp' : 'no_bukti';   
        
        this.siskeudesService[func](this.desa.kode_desa).then(data =>{
            if(!data[0].no){
                this.zone.run(()=>{
                    this.model[entityName] = `${def}/${initial}/${this.desa.kode_desa}/${this.desa.tahun}`;
                })
            }
            else {            
                let splitCode = data[0].no.split('/');
                let lastNumber = 0;
                let lastNumberFromDB = parseInt(splitCode[0]);                
                let lasNumberFromSheet = this.getLastNumFromSheet(sheet);

                lastNumber = (lastNumberFromDB < lasNumberFromSheet) ?  lasNumberFromSheet : lastNumberFromDB;
                
                let newNumber = (lastNumber+1).toString();
                let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
                this.zone.run(()=>{
                    this.model[entityName] = stringNum + '/' + splitCode.slice(1).join('/');
                })
                
            }
        });        
    }

    getLastNumFromSheet(sheet){
        let result = [0];
        let sourceData = [];
        if(this.activeSheet == 'spp'){
            if(sheet == 'spp')
                sourceData = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));            
            else {
                result.push(this.getLastNumFromAllSppBukti());
                sourceData = this.initialDatasets['spp_bukti'].map(c =>schemas.arrayToObj(c, schemas.spp_bukti));
            }
            
        }
        else 
             sourceData = this.hots[this.activeSheet].getSourceData().map(a => schemas.arrayToObj(a, schemas[sheet]));        
        
        sourceData.forEach(c => {
            let number = parseInt(c.no.split('/')[0]);
            result.push(number);
        })
        return Math.max.apply(null, result);
    }

    getLastNumFromAllSppBukti(){
        let result = [0];
        this.details.forEach(detail => {
            let numbers = [0]
            let source = this.hots[detail.id].getSourceData().map(c => schemas.arrayToObj(c,schemas.spp_bukti));
            source.forEach(c => {
                let number = parseInt(c.no.split('/')[0]);
                numbers.push(number);
            })
            numbers.push(Math.max.apply(null, numbers));
        });        
        return Math.max.apply(null, result);
    }

    async getReferences() { 
        var data = await this.siskeudesService.getAllKegiatan(this.desa.kode_desa);
        this.dataReferences['kegiatan'] = data;                  
    }

    async getSisaAnggaran(kodeKegiatan, tanggalSpp){
        let dateSpp;
        if(tanggalSpp)
            dateSpp = tanggalSpp;
        else 
            dateSpp = (this.model.tanggal) ? this.model.tanggal.toString() : null;
        
        if(!dateSpp || !kodeKegiatan)
            return;
        
            
        dateSpp = moment(dateSpp, "DD-MM-YYYY").format('DD-MMM-YY');            
        let data = await this.siskeudesService.getSisaAnggaran(this.desa.tahun, this.desa.kode_desa, kodeKegiatan, dateSpp, this.postingSelected.kode_posting);
        this.sisaAnggaran = data;
        console.log(data)
    }

    addRow(model): void {
        let position = 0;
        let dataSpp = {}, dataSppRinci = {}, dataSppBukti = {};
        let content = [];

        model = this.valueNormalizer(model);        
        if(this.activeSheet == 'spp'){
            let sourceData = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));
            let rincianSisa = this.sisaAnggaran.find(c => c.kode_rincian == model.kode_rincian && c.kode_kegiatan == model.kode_kegiatan)
            
            model.tanggal = model.tanggal.toString();
            Object.assign(dataSpp, model, this.desa);
            Object.assign(dataSppRinci, model, this.desa, rincianSisa);
            
            //spp
            dataSpp['no'] = model['no_spp'];
            dataSpp['jumlah'] = model['nilai'];
            dataSpp['potongan'] = 0;
            content = schemas.objToArray(dataSpp, schemas.spp);

            //sppRinci
            dataSppRinci['kode'] = model['kode_rincian'];
            dataSppRinci['id'] = model['no_spp'] + '_' + model['kode_rincian'];

            if(model.jenis !== 'UM'){
                Object.assign(dataSppBukti,this.desa, model,  rincianSisa);
                
                //spp bukti
                dataSppBukti['no'] = dataSppBukti['no_bukti'];
                dataSppBukti['tanggal']= dataSppBukti['tanggal_bukti'].toString();
            }

            this.sourceDatas['spp_rinci'].push(dataSppRinci);

            sourceData.forEach((row, i)=> {
                if(model.no_spp > row.no )
                    position = 1 + i;
            });

            let data = (model.jenis == 'UM') ? schemas.objToArray(dataSppRinci, schemas.spp_rinci) 
                    : schemas.objToArray(dataSppBukti, schemas.spp_bukti);

            this.details.push({
                id: model['no_spp'],
                active: false
            })
            this.dataAddSpp.push({
                id: model['no_spp'],
                data: [data],
                jenis: model.jenis
            });
            this.hasPushed = true;
        }
        else {

        }

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length - 1, null, 'overwrite');

        this.activeHot.selectCell(position, 0, position, 5, null, null);
        this.model = {};     
    }

    addOneRow(): void {
        $("#modal-add").modal("hide");
        this.addRow(this.model);
    }

    addOneRowAndAnother(): void {
    }
    
    
    categoryOnChange(value): void {
    }

    selectedOnChange(value): void {
        if(this.activeSheet == 'spp'){
            this.getSisaAnggaran(value, null);
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

    validateSisaAnggaran(): boolean {   
        let result = false;     
        let rincian = this.sisaAnggaran.find(c => c.Kd_Rincian == this.model.Kd_Rincian);
        let sisaAnggaran = (this.SPP.jenisSPP == 'UM') ? rincian.Sisa - this.model.Nilai : rincian.Sisa - this.model.Nilai_SPP_Bukti;

        if (sisaAnggaran < 0) {
            result = true;
        }
        
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

    valueNormalizer(data): any{
        Object.keys(data).forEach(key => {
            if(data[key] == ''|| data[key] === undefined){
                data[key] = null
            }
        })
        return data;
    }
}