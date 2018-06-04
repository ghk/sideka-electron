import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { PersistablePage } from '../pages/persistablePage';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { SppContentManager } from '../stores/siskeudesContentManager';
import { fromSiskeudes } from '../stores/siskeudesFieldTransformer';

import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
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
import { DiffTracker } from "../helpers/diffs";

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
    styles: [`[hidden]:not([broken]) { display: none !important;}`]
    
})

export default class SppComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    type = "spp";
    subType = null;
    bundleSchemas =  schemas.sppBundle;
    
    contentSelection: any = {};
    dataReferences: SiskeudesReferenceHolder;
    initialDataset: any;

    afterSaveAction: string;
    progress: Progress;
    progressMessage: string;
    desa: any;
    contentManager: SppContentManager;
    details: any[] = [];
    activeHot: any;
    activeSheet: string;
    sheets: any[] = [];
    hasPushed: boolean;
    hots: any ={};
    sourceDatas: any = {};
    initialDatasets: any = {};
    dataAddSpp: any[] = [];    
    model: any = {};
    sisaAnggaran: any;
    activeTypeSpp: string;
    
    postingSelected: any;
    sppSelected: any = {};
    afterChangeHook: any;
    afterRenderHook: any;
    afterRemoveRowHook: any;
    pageSaver: PageSaver;
    modalSaveId;

    isExist: boolean;
    isEmptySppBukti: boolean;
    isEmptyPosting: boolean;
    currentDataSpp: any = {};
    activePageMenu: string;
    tableHelpers: any = {};
    afterAddRow: any = {};
    pencairanData: any[] = [];
    isDisbursed: boolean
    
    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,   
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        public router: Router,
        private route: ActivatedRoute,
        public toastr: ToastsManager,
        private vcr: ViewContainerRef
    ) {
        super(dataApiService);
        this.toastr.setRootViewContainerRef(vcr);        
        this.pageSaver = new PageSaver(this);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnInit(): void {
        titleBar.title("Data SPP - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        setTimeout(function(){
            $("spp > #flex-container").addClass("slidein");
        }, 1000);

        let me = this;
        this.details = [];
        this.modalSaveId = 'modal-save-diff';
        this.activeSheet = 'spp';
        this.hasPushed = false;
        this.sheets = [ 'spp', 'spp_rinci', 'spp_bukti',];
        this.pageSaver.bundleData = { "spp": [], "spp_rinci": [], "spp_bukti": [] };
        this.sourceDatas = { "spp": [], "spp_rinci": [], "spp_bukti": [] };          
          
        document.addEventListener('keyup', this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);

        let sheetContainer =  document.getElementById('sheet-spp');
        let inputSearch = document.getElementById("input-search-spp");

        this.hots['spp'] = this.createSheet(sheetContainer, 'spp', null);
        this.activeHot = this.hots['spp'];

        this.tableHelpers['spp'] = new TableHelper(this.hots['spp']);
        this.tableHelpers['spp'].initializeTableSearch(document, inputSearch, null);
        
        let isValidDB = this.checkSiskeudesDB();
        if (!isValidDB)
            return;

        document.addEventListener('keyup', this.keyupListener, false);
        this.siskeudesService.getTaDesa().then(desas => {
            this.desa = desas[0];
            this.subType = this.desa.tahun;
            this.desa.status = null;
            titleBar.title("Data SPP "+this.subType+" - " + this.dataApiService.auth.desa_name);

            this.siskeudesService.getPostingLog().then(dataPosting =>{
                let result = dataPosting;
                
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
                this.contentManager.getContents().then(async data => {   
                    this.pageSaver.writeSiskeudesData(data);
                    

                    this.sheets.forEach(sheet => {
                        if(sheet == 'spp')
                            this.hots['spp'].loadData(data['spp']);
                        this.initialDatasets[sheet] = data[sheet].map(c => c.slice()); 
                        this.sourceDatas[sheet] = data[sheet].map(c => c.slice());
                        this.pageSaver.bundleData[sheet] = data[sheet].map(c => c.slice());  
                    })
                                        
                    this.progressMessage = 'Memuat data';                    
                    this.pageSaver.getContent(result => {});

                    this.pencairanData = await this.siskeudesService.getAllPencairanSpp();
                    this.getReferences();
                    
                    
                    setTimeout(function() {
                        me.activeHot.render();
                        me.setUnEditableRows('spp', null);
                    }, 500);
                })
            })
        })
    }

    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        window.removeEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);
        for (let key in this.hots) {
            if(this.hots[key].afterChangeHook)    
                this.hots[key].removeHook('afterChange', this.afterChangeHook);

            if(this.hots[key].afterRenderHook){
                this.hots[key].removeHook('afterChange', this.afterChangeHook);
                this.hots[key].removeHook('afterLoadData', this.afterChangeHook);
            }

            if(this.hots[key].afterRemoveRowHook){
                 this.hots[key].removeHook('afterRemoveRow', this.afterRemoveRowHook);
            }

            this.hots[key].destroy();
            this.tableHelpers[key].removeListenerAndHooks();
        }
        let element = $('.action-view-detail');
        for(let i = 0; i < element.length; i ++){
            element[i].removeEventListener('click', this.openDetail, false);
        }
        titleBar.removeTitle();
        $("spp > #flex-container").removeClass("slidein");
    }

    forceQuit(): void {
        $('#modal-save-diff')['modal']('hide');
        this.router.navigateByUrl('/');
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            this.router.navigateByUrl('/');
        else if (this.afterSaveAction == "quit")
            this.sharedService.getApp().quit();
    }
    
    ngAfterViewChecked() {        
        let me = this;
        if(this.hasPushed){
            let id = '';   

            setTimeout(function() {
                if(me.hasPushed){ 
                    me.dataAddSpp.forEach(content => {
                        let sheetContainer = document.getElementById('sheet-' + content.id);
                        let inputSearch = document.getElementById("input-search-"+ me.convertSlash(content.id));
                        
                        me.hots[content.id] = me.createSheet(sheetContainer, content.id, content.jenis);

                        me.tableHelpers[content.id] = new TableHelper(me.hots[content.id]);
                        me.tableHelpers[content.id].initializeTableSearch(document, inputSearch, null);

                        me.hots[content.id].loadData(content.data);   
                        if(content.id == me.activeSheet)               
                            me.activeHot =    me.hots[content.id];

                        me.setUnEditableRows(content.id, content.jenis);
                    }); 

                    me.hasPushed = false;
                    me.dataAddSpp = [];
                }
            }, 200);
        }
        if(this.afterAddRow.active){
            setTimeout(function() {
                if(me.activeSheet == 'spp')
                    me.getMaxNumber('spp');
                me.model.jenis = me.afterAddRow.data.jenis;
                me.getMaxNumber('spp_bukti');
                
                me.afterAddRow['active'] = false;                
            }, 100);
            
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
        this.afterChangeHook = (changes, source) => {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if(me.activeSheet == "spp")
                        return;
                    
                    if(me.currentDataSpp.jenis == 'UM'){
                        if(col == 7){
                            let dataSppRinci = schemas.arrayToObj(result.getDataAtRow(row), schemas.spp_rinci);
                            me.calculateTotal(dataSppRinci.no_spp, dataSppRinci.kode_rincian, 0, false);
                        }
                    }
                    else {
                        if(col == 8){
                            let dataSppBukti = schemas.arrayToObj(result.getDataAtRow(row), schemas.spp_bukti);
                            me.calculateTotal(dataSppBukti.no_spp, dataSppBukti.kode_rincian, 0, true);
                        }
                    }
                })
            }

        }
        result.addHook('afterChange', this.afterChangeHook);

        this.afterRemoveRowHook = (index, amount) => {
            let schemaType = me.activeTypeSpp == "UM" ? 'spp_rinci' : 'spp_bukti';
            let sourceData = me.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas[schemaType]));
            let total = sourceData.map(c => c.nilai).reduce((a,b)=> a+b,0);
            this.updateTotalSpp(this.activeSheet, total);            
        }
        
        if(sheet != "spp"){            
            result.addHook('afterRemoveRow', this.afterRemoveRowHook);
            return result;
        }


        this.afterRenderHook = () => {
            me.addCellListener();
        }        
        result.addHook('afterRender', this.afterRenderHook);
        result.addHook('afterLoadData', this.afterRenderHook);
        return result;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    getCurrentUnsavedData(): any {
        let sourceDatas = {
            spp: this.hots['spp'].getSourceData(),
        }
        Object.assign(sourceDatas, this.mergeSppDetail());

        return sourceDatas;   
    }
    
    checkSiskeudesDB() {
        let result = true;
        let fileName = this.settingsService.get('siskeudes.path');
        let kodeDesa = this.settingsService.get('siskeudes.desaCode');

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
         
        this.isExist = false;   
        this.isDisbursed = false;     
        if(!sheet.startsWith('spp')){
            let findResult = this.details.find(c => c.id == sheet);
            let findDisbursement = this.pencairanData.find(c => c.no_spp == sheet);

            if(!findResult.active){
                return false;
            }
            if(findDisbursement){
                this.isDisbursed = true;
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

        this.currentDataSpp = row;
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
            this.activeTypeSpp = row.jenis;
            this.activeHot = this.hots[row.no];
            this.dataAddSpp = [];
            this.setUnEditableRows(row.no, row.jenis);
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
            this.activeTypeSpp = row.jenis;
            this.hasPushed = true;
        }
    }

    mergeSppDetail():any{
        let result = { spp_bukti: [], spp_rinci:[] }
        let temp = [];
        let sourceData = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));
        window['source_spp_rinci'] = this.sourceDatas['spp_rinci'];
        window['init_spp_rinci'] = this.initialDatasets['spp_rinci'];
        
        sourceData.forEach(obj => {
            let temp = [];
            let hot = this.hots[obj.no];
            let entityName = (obj.jenis == 'UM') ? 'spp_rinci' : 'spp_bukti';
            let entityNames = ['spp_rinci', 'spp_bukti'];
            if(hot){
                let data = hot.getSourceData().map(c => c.slice());
                temp = result[entityName].concat(data);
                result[entityName] = temp; 
            }
            else {
                let data = this.sourceDatas[entityName].filter(c => c[2] == obj.no);
                if(data){
                    temp = result[entityName].concat(data);
                    result[entityName] = temp;    
                }
            }
            if(obj.jenis !== 'UM'){
                temp = result['spp_rinci'].concat(this.sourceDatas['spp_rinci'].filter(c => c[2] == obj.no));
                result['spp_rinci'] = temp; 
            }
        });
        window['results'] = this.initialDatasets['result'];

        return result;
    }

    saveContent(){
        $('#modal-save-diff')['modal']('hide');

        let me = this;
        let sourceDatas = this.getCurrentUnsavedData();
        let diffs = DiffTracker.trackDiffs(this.bundleSchemas, this.initialDatasets, sourceDatas);

        this.contentManager.saveDiffs(diffs, async (response) => {
            if(response instanceof Array === false) {
                this.toastr.error('Penyimpanan ke Database  Gagal!', '');
                return;
            }
            
            this.toastr.success('Penyimpanan Ke Database berhasil', '');
            let data = await this.contentManager.getContents();
            
            this.activeSheet = 'spp';
            this.activeHot = this.hots['spp'];
            
            this.sheets.forEach(sheet => {
                if(sheet == 'spp')
                    this.hots[sheet].loadData(data[sheet]);
                this.initialDatasets[sheet] = data[sheet].map(c => c.slice());   
                this.sourceDatas[sheet] = data[sheet].map(c => c.slice());               
            });

            this.details = [];
            this.pageSaver.writeSiskeudesData(data);
            this.pageSaver.saveSiskeudesDataPromise(data);

            this.pageSaver.onAfterSave();  
        })        
    }
   
    openAddRowDialog(){
        $("#modal-add")['modal']("show"); 
        this.isEmptySppBukti = false;
        this.isExist= false;

        if(this.activeSheet == 'spp'){
            this.model.jenis = 'UM';
            this.getMaxNumber('spp');
        }
        else {
            let sppSource = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));
            let dataSpp = sppSource.find(c => c.no == this.activeSheet);
            let sourceData = this.hots[this.activeSheet].getSourceData();
            let entityName = (dataSpp.jenis == 'UM') ? 'spp_rinci' : 'spp_bukti';
            
            this.currentDataSpp = dataSpp;
            this.model.tanggal = dataSpp.tanggal;
            this.model['jenis'] = dataSpp.jenis;            

            if(sourceData.length == 0){
                this.isEmptySppBukti = true;
            }
            else {
                let data = schemas.arrayToObj(sourceData[0], schemas[entityName]);
                this.model.kode_kegiatan = data.kode_kegiatan;
                this.getSisaAnggaran(data.kode_kegiatan, dataSpp.tanggal);
            }
        }
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
                });                
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
        var data = await this.siskeudesService.getAllKegiatan();
        this.dataReferences['kegiatan'] = data;                  
    }

    async getSisaAnggaran(kodeKegiatan, tanggalSpp): Promise<any>{
        let dateSpp;
        if(tanggalSpp)
            dateSpp = tanggalSpp;
        else 
            dateSpp = (this.model.tanggal) ? this.model.tanggal.toString() : null;
        
        if(!dateSpp || !kodeKegiatan)
            return;
        
            
        dateSpp = moment(dateSpp, "DD-MM-YYYY").format('DD-MMM-YY');            
        let data = await this.siskeudesService.getSisaAnggaran(this.desa.tahun, kodeKegiatan, dateSpp, this.postingSelected.kode_posting);
        this.sisaAnggaran = data;
        return data;
    }

    addRow(model, callback) {
        let position = 0;
        let dataSpp = {}, dataSppRinci = {}, dataSppBukti = {};
        let content = [];
        let isNotFound = false;

        if(this.isExist)
            return;

        model = this.valueNormalizer(model);        
        if(this.activeSheet == 'spp'){
            let text = $('#rincian > select :selected').text(); //karena id bisa sama, dan yang membedakan hanya sumberdana maka untuk sementara ambil sumberdana dari opt
            let arr = text.replace(/\s/g, '').split('|');

            let sourceData = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));
            let rincianSisa = this.sisaAnggaran.find(c => c.kode_rincian == model.kode_rincian && c.kode_kegiatan == model.kode_kegiatan && c.sumber_dana == arr[2]);
            
            model.tanggal = model.tanggal.toString();
            Object.assign(dataSpp, this.desa, model, {status: 1, potongan: 0});
            Object.assign(dataSppRinci, this.desa, model, rincianSisa);
            
            //spp
            dataSpp['no'] = model['no_spp'];
            dataSpp['jumlah'] = model['nilai'];
            dataSpp['potongan'] = 0;
            content = schemas.objToArray(dataSpp, schemas.spp);

            //sppRinci
            
            dataSppRinci['kode'] = model['kode_rincian'];
            dataSppRinci['id'] = model['no_spp'] + '_' + model['kode_rincian']+'_'+arr[2];
            

            if(model.jenis !== 'UM'){
                Object.assign(dataSppBukti, this.desa, model,  rincianSisa);
                
                //spp bukti
                dataSppBukti['no'] = dataSppBukti['no_bukti'];
                dataSppBukti['tanggal']= dataSppBukti['tanggal_bukti'].toString();
                dataSppBukti['keterangan'] = model['keterangan_bukti'];
            }

            this.sourceDatas['spp_rinci'].push(schemas.objToArray(dataSppRinci, schemas.spp_rinci));

            sourceData.forEach((row, i)=> {
                if(model.no_spp > row.no )
                    position = 1 + i;
            });

            let data = (model.jenis == 'UM') ? schemas.objToArray(dataSppRinci, schemas.spp_rinci) 
                    : schemas.objToArray(dataSppBukti, schemas.spp_bukti);

            this.details.push({
                id: model['no_spp'],
                active: false
            });

            this.dataAddSpp.push({
                id: model['no_spp'],
                data: [data],
                jenis: model.jenis
            });
            this.hasPushed = true;
        }
        else {
            let text = $('#rincian > select :selected').text(); //karena id bisa sama, dan yang membedakan hanya sumberdana maka untuk sementara ambil sumberdana dari opt
            let arr = text.replace(/\s/g, '').split('|');

            let sppSource = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));
            dataSpp = sppSource.find(c => c.no === this.activeSheet);
            let sourceData = this.hots[this.activeSheet].getSourceData();   
            let rincianSisa = this.sisaAnggaran.find(c => c.kode_rincian == model.kode_rincian && c.kode_kegiatan == model.kode_kegiatan && c.sumber_dana == arr[2]);
            
            if(dataSpp['jenis'] == 'UM'){
                model['no_spp'] = this.activeSheet;
                model['kode'] = model.kode_rincian;
                model['id'] = this.activeSheet + '_' + model.kode_rincian + '_'+ arr[2];

                let data = Object.assign({}, this.desa, rincianSisa, model);
                content = schemas.objToArray(data, schemas.spp_rinci);

                sourceData.forEach((content, i) => {
                    let row = schemas.arrayToObj(content, schemas.spp_rinci);

                    if(model.kode_rincian > row.kode)
                        position = i + 1;
                })
            }
            else {
                let sppRinciSource = this.sourceDatas['spp_rinci'].map(c => schemas.arrayToObj(c, schemas.spp_rinci));
                let findResult = sppRinciSource.find(c => c.kode_kegiatan == model.kode_kegiatan && c.kode == model.kode_rincian);
                
                //spp bukti
                model['no'] = model['no_bukti'];
                model['tanggal']= model['tanggal_bukti'].toString();  
                model['no_spp'] = this.activeSheet;
                model['keterangan'] = model['keterangan_bukti'];
                

                //jika belum ada spp rinci yang di tambahkan, tambahkan spp rinci
                if(!findResult){
                    isNotFound = true;
                    dataSppRinci = Object.assign({},this.desa, model);
                    dataSppRinci['id'] = this.activeSheet +'_'+model.kode_rincian;
                    dataSppRinci['kode'] = model['kode_rincian'];
                    dataSppRinci['sumber_dana'] = rincianSisa.sumber_dana;
                    this.sourceDatas['spp_rinci'].push(schemas.objToArray(dataSppRinci, schemas.spp_rinci))
                }

                let data = Object.assign({},this.desa, model,  rincianSisa);   
                content = schemas.objToArray(data, schemas.spp_bukti);
                
                sourceData.forEach((content, i) => {
                    let row = schemas.arrayToObj(content, schemas.spp_bukti);

                    if(model.no > row.no)
                        position = i + 1;
                })
            }
            
        }

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length - 1, null, 'overwrite');
        this.activeHot.selectCell(position, 0, position, 5, null, null);     
        this.addCellListener();  
        let response = Object.assign({},model)
        response['isNotFound'] = isNotFound;
        callback(response);
    }

    addOneRow(): void {
        $("#modal-add").modal("hide");
        let me = this;
        this.addRow(this.model, response => {
            let element = $('#form-add')[0];
            if(element)
                element['reset']();
            
            setTimeout(function() {
                if(me.activeSheet !== 'spp'){
                    me.calculateTotal(me.activeSheet, response.kode_rincian, response.nilai, false, response.isNotFound);
                }
            }, 200);
        });        
    }

    addOneRowAndAnother(): void {
        let me = this;
        this.addRow(this.model, response => {
            $('#form-add')[0]['reset']();
            this.afterAddRow['active'] = true;
            this.afterAddRow['data'] = response;

            setTimeout(function() {
                if(me.activeSheet !== 'spp'){
                    me.calculateTotal(me.activeSheet, response.kode_rincian, response.nilai, false, response.isNotFound);
                }
            }, 200);
        });
    }

    validateIsExist(): void {
        if(this.currentDataSpp.jenis !== 'UM')
            return;
        let text = $('#rincian > select :selected').text(); //karena id bisa sama, dan yang membedakan hanya sumberdana maka untuk sementara ambil sumberdana dari opt
        let arr = text.replace(/\s/g, '').split('|');
        let sourceData = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp_rinci));
        for(let row of sourceData) {            
            if(row['kode'] == arr[0] && row['sumber_dana'] == arr[2]){
                this.isExist = true;
                break;
            }
            else   
                this.isExist = false;
        }    
    }

    calculateTotal(no_spp, kode_rincian, value, isEdited, isNotFound=false){
        let sourceSpp = this.hots['spp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp));
        let dataSpp = sourceSpp.find(c => c.no == no_spp);
        let sumSppRinci = 0, sumSpp = 0;
        let sourceSppRinci, sourceSppBukti;

        if(dataSpp.jenis !== 'UM'){
            sourceSppRinci = this.sourceDatas['spp_rinci'].map(c => schemas.arrayToObj(c, schemas.spp_rinci));
            let dataSppRinci = sourceSppRinci.find(c => c.kode == kode_rincian && c.no_spp == no_spp);        
            let entityName = 'kode';

            if(isEdited){
                sourceSppBukti = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp_bukti));
                sourceSppBukti.forEach(row => {
                    if(row.kode_rincian == kode_rincian && row.no_spp == no_spp){
                        sumSppRinci += row.nilai;
                    }                
                })
                dataSppRinci.nilai = sumSppRinci + value;
            }
            else {
                sourceSppRinci.forEach(row => {
                    if(row.kode == kode_rincian && row.no_spp == no_spp){
                        sumSppRinci += row.nilai;
                    }                
                })
                if(isNotFound)
                    dataSppRinci.nilai = sumSppRinci;
                else 
                    dataSppRinci.nilai = sumSppRinci + value;
            }

            this.sourceDatas['spp_rinci'] = sourceSppRinci.map(o => schemas.objToArray(o, schemas.spp_rinci));
        }

        
        if(dataSpp.jenis == 'UM')
            sourceSppRinci = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.spp_rinci));
        else
            sourceSppRinci = this.sourceDatas['spp_rinci'].map(c => schemas.arrayToObj(c, schemas.spp_rinci));

        sourceSppRinci.forEach(row => {
            if(row.no_spp == no_spp){
                sumSpp += row.nilai;
            }                
        })       
        dataSpp.jumlah = sumSpp;
        this.hots['spp'].loadData(sourceSpp.map(o => schemas.objToArray(o, schemas.spp)));
    }   

    setUnEditableRows(sheet, type){
        let me = this;
        let hot = this.hots[sheet];
        if(sheet == 'spp'){
            hot.updateSettings({
                cells: (row, col, prop) => {
                    let cellProperties = {};
                    let code = hot.getDataAtCell(row, 0);
                    let findResult = me.pencairanData.find(c => c.no_spp == code);
                
                    if(findResult){
                        cellProperties['readOnly'] = 'true'
                    }
                    return cellProperties
                }
            });
        }
        else {            
            let findResult = me.pencairanData.find(c => c.no_spp == sheet);            
            this.isDisbursed = false;
            
            if(findResult){
                this.isDisbursed = true;
                let sheet = (type == 'UM') ?  'spp_rinci' : 'spp_bukti';
                let newSetting  = schemas[sheet].map(c => Object.assign({}, c));

                newSetting.map(c => c['readOnly'] = true);
                hot.updateSettings({
                    contextMenu: ['undo', 'redo'],
                    columns: newSetting
                });
            }
        }
    
    }

    updateTotalSpp(noSpp, total){
        let sourceData = this.hots['spp'].getSourceData();
        let rowIndex = sourceData.findIndex(r => r[0] == noSpp); // 0 adalah kolom no_spp

        if(rowIndex){
            this.hots['spp'].setDataAtCell(rowIndex, 5, total); // 5 adalah colom untuk jumlah
        }
    }
    

    
    /*

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

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
            this.hots[this.activeSheet].unlisten();
        } else {
            titleBar.blue();
            this.hots[this.activeSheet].listen();
        }
    }

    keyupListener = (e) => {
        // ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            if(this.dataApiService.auth.isAllowedToEdit("keuangan")){
                this.pageSaver.onBeforeSave();
                e.preventDefault();
                e.stopPropagation();
            }
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

    convertSlash(value){
        value = value.replace('.','/');
        return value.split('/').join('-');
    }

    addCellListener(){
        let element = $('.action-view-detail');
        for(let i = 0; i < element.length; i ++){
            element[i].addEventListener('click', this.openDetail, false);
        }
    }

    openDetail = (e) =>{
        this.addDetails();
        e.preventDefault();
        e.stopPropagation();
    }
}