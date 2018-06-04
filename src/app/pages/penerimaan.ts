import { remote } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { PersistablePage } from '../pages/persistablePage';
import { PenerimaanContentManager } from '../stores/siskeudesContentManager';
import { ReplaySubject, Observable } from 'rxjs';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import PageSaver from '../helpers/pageSaver';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';

import schemas from '../schemas';
import TableHelper from '../helpers/table';
import titleBar from '../helpers/titleBar';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import { DiffTracker } from '../helpers/diffs';

var Docxtemplater = require('docxtemplater');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
var bootstrap = require('bootstrap');

@Component({
    selector: 'penerimaan',
    templateUrl: '../templates/penerimaan.html',
    styles: [`[hidden]:not([broken]) { display: none !important;}`]
})

export default class PenerimaanComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    type = "penerimaan";
    subType = null;

    bundleSchemas = schemas.penerimaanBundle;

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
    dataAddTbpRinci: any = {};
    sourceDataTbpRinci: any[] = [];

    contentSelection: any = {};
    dataReferences: SiskeudesReferenceHolder;
    desa: any = {};     
    stsRinciData: any; // sts data adalah data penyetoran

    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};

    progress: Progress;
    progressMessage: string;

    afterChangeHook: any;   
    afterRenderHook: any; 
    afterRemoveHook: any;
    contentManager: PenerimaanContentManager;
    pageSaver: PageSaver;
    hasPushed: boolean;
    modalSaveId;       
    activePageMenu: string;
    isRendering: boolean;
    tableHelpers: any = {}  
    afterAddRow: any = {};
    isDeposited: boolean;
    

    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
        public router: Router,
        private appRef: ApplicationRef,
        private zone: NgZone,
        public toastr: ToastsManager,
        private vcr: ViewContainerRef
    ) {
        super(dataApiService);
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        window.removeEventListener('beforeunload', this.pageSaver.beforeUnloadListener, false);
        for (let key in this.hots) {
            if (this.hots[key].afterChangeHook)    
                this.hots[key].removeHook('afterChange', this.afterChangeHook);
                
            if (this.hots[key].afterRenderHook)    
                this.hots[key].removeHook('afterRender', this.afterRenderHook);

            if (this.hots[key].afterRemoveHook)    
                this.hots[key].removeHook('afterRemoveRow', this.afterRemoveHook);

            this.hots[key].destroy();
            this.tableHelpers[key].removeListenerAndHooks();
        }

        let element = $('td > .action-view-detail');
        for(let i = 0; i < element.length; i ++){
            element[i].removeEventListener('click', this.openDetail, false);
        }
        
        titleBar.removeTitle();

        $("penerimaan > #flex-container").removeClass("slidein");
    }

    ngAfterViewChecked() {
        let me = this;
        if(this.hasPushed){
            setTimeout(() => {
                if(me.hasPushed){ 
                    let content = me.dataAddTbpRinci;
                    let sheetContainer = document.getElementById('sheet-' + content.id);
                    let inputSearch = document.getElementById("input-search-"+ me.convertSlash(content.id));

                    me.hots[content.id] = me.createSheet(sheetContainer, content.id);                                               
                    me.tableHelpers[content.id] = new TableHelper(me.hots[content.id]);
                    me.tableHelpers[content.id].initializeTableSearch(document, inputSearch, null);

                    me.hots[content.id].loadData(content.data);   
                    if(content.id == me.activeSheet)               
                        me.activeHot =    me.hots[content.id];  
                    me.setUnEditableRows(content.id);

                    me.hasPushed = false;
                    me.dataAddTbpRinci = {};
                }
            }, 200);
        }

        if(this.afterAddRow.active){
            setTimeout(function() {
                me.model['kode_bayar'] = me.afterAddRow.data.kode_bayar;
                me.getTbpNumber();                
                me.afterAddRow.active = false; 
            }, 100);
            
        }
    }

    ngOnInit(): void {
        titleBar.title("Data Penerimaan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        setTimeout(function(){
            $("penerimaan > #flex-container").addClass("slidein");
        }, 1000);

        let me = this;
        this.details = [];
        this.modalSaveId = 'modal-save-diff';
        this.activeSheet = 'tbp';
        this.sheets = [ 'tbp', 'tbp_rinci'];
        this.pageSaver.bundleData = { "tbp": [], "tbp_rinci": [] };        
        this.hasPushed = false;
        this.tableHelpers = { "tbp": {} }
        document.addEventListener('keyup', this.keyupListener, false); 
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);  

        let sheetContainer =  document.getElementById('sheet-tbp');
        let inputSearch = document.getElementById("input-search-tbp");
        
        window['hot'] = this.hots['tbp'] = this.createSheet(sheetContainer, 'tbp');
        this.activeHot = this.hots['tbp'];
        
        this.tableHelpers['tbp'] = new TableHelper(this.hots['tbp']);
        this.tableHelpers['tbp'].initializeTableSearch(document, inputSearch, null);
        
        this.siskeudesService.getTaDesa().then(desas => {
            this.desa =  desas[0];
            this.subType = this.desa.tahun;
            this.desa.status = null; //ganti status dengan null, karena pada table tbp ada status juga
            titleBar.title("Data Penerimaan "+this.desa.tahun+" - " + this.dataApiService.auth.desa_name);

            this.contentManager = new PenerimaanContentManager(this.siskeudesService, this.desa, this.dataReferences)
            this.contentManager.getContents().then(async data => {
                this.stsRinciData = await this.siskeudesService.getStsRinci();
                this.pageSaver.writeSiskeudesData(data);
                this.getAllReferences();
                this.sheets.forEach(sheet => {
                    if(sheet != 'tbp_rinci')
                        this.hots[sheet].loadData(data[sheet]);
                    this.initialDatasets[sheet] = data[sheet].map(c => c.slice());  
                    this.pageSaver.bundleData[sheet] = data[sheet].map(c => c.slice());                    
                });

                this.sourceDataTbpRinci = data['tbp_rinci'].map(c => c.slice());
                this.progressMessage = 'Memuat data';
                                                
                setTimeout(function() {
                    me.activeHot.render();
                    me.setUnEditableRows('tbp');
                }, 300);
            })
        })
    }

    progressListener(progress: Progress) {
        this.progress = progress;
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
        if(sheet == "tbp"){
            this.afterRenderHook = () => {
                me.addCellListener();
            }
            result.addHook('afterRender', this.afterRenderHook);
        }
        else {
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
                        
                        if(col == 9){
                            me.updateTotalTbp(null);
                        }
                    })
                }
            }
            result.addHook('afterChange', this.afterChangeHook);

            this.afterRemoveHook = () => {
                me.updateTotalTbp(null);
            }
            result.addHook('afterRemoveRow', this.afterRemoveHook);
        }
        return result;
    }

    selectTab(sheet): boolean {
        let me = this;
        let timeOut = setTimeout(function () {
            me.activeHot.render();
        }, 500);

        this.isDeposited = false;
        if(!sheet.startsWith('tbp')){
            let findDetail = this.details.find(c => c.id == sheet);
            let findSts = this.stsRinciData.find(c => c.no_tbp == sheet);

            if(!findDetail.active){
                clearTimeout(timeOut)
                return false;
            }
            
            this.isDeposited = (findSts) ? true : false;
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
            this.dataAddTbpRinci = {};
            this.setUnEditableRows(id);
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
            this.dataAddTbpRinci = content;
            this.activeSheet = id;
            this.hasPushed = true;
        }
    }

    saveContent(): void {
        $('#modal-save-diff').modal('hide');
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

            this.getAllReferences();
            this.sheets.forEach(sheet => {
                if(sheet != 'tbp_rinci')
                    this.hots[sheet].loadData(data[sheet]);
                this.initialDatasets[sheet] = data[sheet].map(c => c.slice());                    
            });

            this.sourceDataTbpRinci = data['tbp_rinci'].map(c => c.slice()); 

            this.pageSaver.writeSiskeudesData(data);
            await this.pageSaver.saveSiskeudesDataPromise(data);

            this.pageSaver.onAfterSave();
        });
    };

    mergeTbpRinciContent():any{
        let result = [];
        let temp = [];
        let sourceData = this.hots['tbp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp));

        sourceData.forEach(obj => {
            let temp = [];
            let hot = this.hots[obj.no];
            if(hot){
                let data = hot.getSourceData();
                temp = result.concat(data);
                result = temp;    
            }
            else {
                let data = this.sourceDataTbpRinci.filter(c => c[1] == obj.no);
                if(data){
                    temp = result.concat(data);
                    result = temp;    
                }
            }
        });

        return result;
    }

    addRow(data, callback) {
        let me = this;
        let position = 0;
        let sheet = (this.activeSheet == 'tbp') ? 'tbp' : 'tbp_rinci';
        let sourceData = this.activeHot.getSourceData().map(c => schemas.arrayToObj(c, schemas[sheet]));
        let model = Object.assign({}, data)

        if(this.isExist)
            return;

        if(this.activeSheet == 'tbp'){
            sourceData.forEach((row, i) => {
                if(model.no > row.no){
                    position = i + 1;
                }
            });
            model.tanggal = model.tanggal.toString();
            if(model.kode_bayar !== '2'){
                //menambahkan field yang kurang                
                model['jumlah'] = model.nilai;
                model['rekening_bank'] = '-';
                model['nama_bank'] = '-';
            }
            Object.assign(model, this.desa)

            //tambahkan detail / rincian tbp
            let text = $('#rincian > select :selected').text(); //karena id bisa sama, dan yang membedakan hanya sumberdana maka untuk sementara ambil sumberdana dari opt
            let arr = text.replace(/\s/g, '').split('|');
            let rincianTbp =  this.dataReferences['rincian_tbp'].find(c => c.kode_rekening == model.kode && arr[2] == c.sumber_dana);  
            let data = Object.assign({}, this.desa, rincianTbp, model);
            data['id'] = model.no +'_'+ model.kode + '_'+ data.sumber_dana;
            data['kode_kegiatan'] = (model.kode_bayar == '3') ? model.kode_kegiatan : this.desa.kode_desa + '00.00';     
            data['no_tbp'] = model.no;
            data['rincian_sumber_dana'] = data['kode_rekening'] + data['sumber_dana'];
            this.details.push({
                id: model['no'],
                active: false
            })
            this.dataAddTbpRinci = {
                id: model['no'],
                data: [schemas.objToArray(data, schemas.tbp_rinci)]
            };
            this.hasPushed = true;
        }
        else {
            this.updateTotalTbp(model.nilai);
            
            let temp = model.nilai;
            let text = $('#rincian > select :selected').text(); //karena id bisa sama, dan yang membedakan hanya sumberdana maka untuk sementara ambil sumberdana dari opt
            let arr = text.replace(/\s/g, '').split('|');
            let rincianTbp =  this.dataReferences['rincian_tbp'].find(c => c.kode_rekening == model.kode && arr[2] == c.sumber_dana);  
            Object.assign(model, this.desa, rincianTbp);
            model['nilai'] = temp;
            model['id'] = this.activeSheet +'_'+ model.kode +'_'+model['sumber_dana'];
            model['no_tbp'] = this.activeSheet;
            model['kode_kegiatan'] = (model.kode_bayar == '3') ? model.kode_kegiatan : this.desa.kode_desa + '00.00';
            model['rincian_sumber_dana'] = model['kode_rekening'] + model['sumber_dana'];

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
        me.addCellListener();
        callback(Object.assign({}, data));
    }

    addOneRow(): void {
        this.addRow(this.model, response => {
            $("#modal-add").modal("hide");
            $('#form-add')[0]['reset']();        
        });
        
    }

    addOneRowAndAnother(): void {
        let me = this;
        this.addRow(this.model, response => {
            $('#form-add')[0]['reset']();
            this.model = {};
            this.afterAddRow['active'] = true;
            this.afterAddRow['data'] = response;
        });
    }

    openAddRowDialog(): void {
        let id = (this.activeSheet == 'tbp') ? null : this.activeSheet;
        this.isExist= false;

        $("#modal-add").modal("show");

        if(id){
            let sourceData = this.hots['tbp'].getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp));
            let kodeBayar = sourceData.find(c => c.no == id).kode_bayar;

            this.isNonKasSwadaya = (kodeBayar == 3) ? true : false;
        }
        this.getTbpNumber();
        
        if(this.activeSheet == 'tbp')
            this.model.kode_bayar = '1'; 

        
    }

    getTbpNumber(): void {
        if (this.activeSheet !== 'tbp')
            return;

        this.siskeudesService.getMaxNoTBP(data => {
            let fixLastNum = 0;
            let lastNumFromSheet = this.getLastNumberFromSheet('TBP');
            let kodeDesa = this.desa.kode_desa.slice(0, -1);
            let pad = '0000';

            if (data.length !== 0 && data[0].No_Bukti) {
                let lastNumFromDB = data[0].No_Bukti.split('/')[0];
                fixLastNum = (parseInt(lastNumFromDB) < lastNumFromSheet) ? lastNumFromSheet : parseInt(lastNumFromDB);
            }

            let newDigits = (fixLastNum + 1).toString();
            let stringNum = pad.substring(0, pad.length - newDigits.length) + newDigits;
            let newNumber = stringNum + '/TBP/' + kodeDesa + '/' + this.desa.tahun;

            this.zone.run(() => {
                this.model.no = newNumber;
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
            if (c.no && c.no.split('/').length == 4 && c.no.search(type) != -1) {
                let splitCode = c.no.split('/');
                numbers.push(parseInt(splitCode[0]));
            }
        })

        maxNumbers.push(Math.max.apply(null, numbers))
        return Math.max.apply(null, maxNumbers);
    }

    async getAllReferences(): Promise<any> {
        var data = await this.siskeudesService.getRincianTBP(this.desa.tahun);
        this.dataReferences['rincian_tbp'] = data;

        data = await this.siskeudesService.getAllKegiatan();
        this.dataReferences['kegiatan'] = data;
    }


    getCurrentUnsavedData(): any {
        return {
            tbp: this.hots['tbp'].getSourceData(),
            tbp_rinci: this.mergeTbpRinciContent()
        }
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
        let findTbp = sourceData.find(o => o.no == this.activeSheet);
        findTbp.jumlah = totalAnggaran + nilai;

        this.hots['tbp'].loadData(sourceData.map(o => schemas.objToArray(o, schemas.tbp)));
    }

    setUnEditableRows(sheet){
        let me = this;
        let hot = this.hots[sheet];
        if(sheet == 'tbp'){
            hot.updateSettings({
                cells: (row, col, prop) => {
                    let cellProperties = {};
                    let code = hot.getDataAtCell(row, 0);
                    let findResult = me.stsRinciData.find(c => c.no_tbp == code);
                
                    if(findResult){
                        cellProperties['readOnly'] = 'true'
                    }
                    return cellProperties
                }
            });
        }
        else {
            let findResult = me.stsRinciData.find(c => c.no_tbp == sheet);            
            this.isDeposited = false;
            
            if(findResult){
                let newSetting = schemas.tbp_rinci.map(c => Object.assign({}, c));
                this.isDeposited = true;
                newSetting.map(c => c['readOnly'] = true);
                hot.updateSettings({
                    contextMenu: ['undo', 'redo'],
                    columns: newSetting
                });
            }
        }
    
    }
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

    validateIsExist(): void {
        if(this.activeSheet == 'tbp')
            return;
        
        let text = $('#rincian > select :selected').text();

        if(!text || text.split('|').length < 2)
            return;
        let arr = text.replace(/\s/g, '').split('|');
        let sourceData = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.tbp_rinci));
        for(let row of sourceData) {            
            if(row['kode'] == arr[0] && row['sumber_dana'] == arr[2]){
                this.isExist = true;
                break;
            }
            else   
                this.isExist = false;
        }    
    }

    convertSlash(value){
        value = value.replace('.','/');
        return value.split('/').join('-');
    }

    addCellListener(){
        let element = $('td > .action-view-detail');
        for(let i = 0; i < element.length; i ++){
            element[i].addEventListener('click', this.openDetail, false);
        }
    }

    openDetail = (e) =>{
        this.addDetails();
        e.preventDefault();
        e.stopPropagation();
    }

    async unEditableRow(){
        //jika sudah di setorkan maka data tidak bisa di edit
        let data = await this.siskeudesService.getSts();
        let sourceData = this.hots['tbp'].getSourceData(c => schemas.arrayToObj(c, schemas.tbp));

        sourceData.forEach(item => {
            let findResult = data.find(c => c.no == item.no);

            if(findResult){
                
            }
        });
        
    }
}
