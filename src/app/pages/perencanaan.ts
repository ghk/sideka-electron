import { remote } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy, Directive, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, FormsModule, NgForm } from '@angular/forms';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { Importer } from '../helpers/importer';
import { PersistablePage } from '../pages/persistablePage';
import { RENSTRA_FIELDS, PerencanaanContentManager } from '../stores/siskeudesContentManager';

import SiskeudesPrintComponent from '../components/siskeudesPrint';
import DataApiService from '../stores/dataApiService';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';
import schemas from '../schemas';
import TableHelper from '../helpers/table';
import titleBar from '../helpers/titleBar';
import PageSaver from '../helpers/pageSaver';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';
import { DiffTracker } from '../helpers/diffs';

var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
var pdf = require('html-pdf');
var dot = require('dot');

@Component({
    selector: 'perencanaan',
    templateUrl: '../templates/perencanaan.html',
    styles: [`[hidden]:not([broken]) { display: none !important;}`]
})

export default class PerencanaanComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    type = "perencanaan";
    subType = null;
    bundleSchemas = schemas.perencanaanBundle;   
    
    dataReferences: SiskeudesReferenceHolder;
    contentManager: PerencanaanContentManager;
    perencanaanSubscription: Subscription;
    routeSubscription: Subscription;
    pageSaver: PageSaver;
    progress: Progress;

    messageIsExist: string;
    isExist: boolean;
    activePageMenu: string;
    afterSaveAction: string;
    stopLooping: boolean;
    activeSheet: string;
    progressMessage: string;
    isRkpEdited: boolean;
    isValidDate: boolean;
    afterChangeHook: any;
    printParameters: any;
    activeHot: any; 
    sheets: any;      

    initialDatasets: any = {};
    diffContents: any = {};
    tableHelpers:any = {};
    model: any = {};
    hots: any = {};
    contentSelection: any = {};
    desa: any = {};
    reports: any = {};
    parameters: any[] = [];
    
    
      
    modalSaveId;

    @ViewChild(SiskeudesPrintComponent)
    private siskeudesPrint: SiskeudesPrintComponent;

    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        private siskeudesService: SiskeudesService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        public router: Router,
        private route: ActivatedRoute,
        public toastr: ToastsManager,
        private vcr: ViewContainerRef,
    ) {
        super(dataApiService);
        this.toastr.setRootViewContainerRef(vcr);        
        this.pageSaver = new PageSaver(this);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnInit() {
        titleBar.title("Data Perencanaan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        let me = this;      
        this.activeSheet = 'renstra';
        this.modalSaveId = 'modal-save-diff';
        this.sheets = ['renstra', 'rpjm', 'rkp1', 'rkp2', 'rkp3', 'rkp4', 'rkp5', 'rkp6'];
        this.pageSaver.bundleData = { "renstra": [], "rpjm": [], "rkp1": [], "rkp2": [], "rkp3": [], "rkp4": [], "rkp5": [], "rkp6": [] };
        this.tableHelpers =  { "renstra": {}, "rpjm": {}, "rkp1": {}, "rkp2": {}, "rkp3": {}, "rkp4": {}, "rkp5": {}, "rkp6": {} };

        let references = ['refBidang', 'refKegiatan', 'refSumberDana', 'sasaran', 'rpjmBidang', 'rpjmKegiatan'];
        references.forEach(item => {
            this.dataReferences[item] = [];
        });
        
        document.addEventListener('keyup', this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);

        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-' + sheet);
            let inputSearch = document.getElementById("input-search-"+sheet);
            
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
            if(sheet == 'renstra')
                this.activeHot = this.hots['renstra'];
            
            this.tableHelpers[sheet] = new TableHelper(this.hots[sheet], inputSearch);
            this.tableHelpers[sheet].initializeTableSearch(document, null);
        });        

        this.routeSubscription = this.route.queryParams.subscribe(async (params) => {
            this.desa['id_visi'] = params['id_visi'];
            this.desa['visi_first_year'] = params['first_year'];
            this.desa['visi_last_year'] = params['last_year'];                        

            let desa = await this.siskeudesService.getTaDesa();
            Object.assign(this.desa, desa[0]);
            this.subType = this.desa['tahun'];

            titleBar.title('Data Perencanaan '+ this.subType+' - ' + this.dataApiService.auth.desa_name);

            this.contentManager = new PerencanaanContentManager(this.siskeudesService, this.desa, this.dataReferences)
            let data = await this.contentManager.getContents();

            this.pageSaver.writeSiskeudesData(data);
            this.sheets.forEach(sheet => {
                this.hots[sheet].loadData(data[sheet]);
                this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
                this.pageSaver.bundleData[sheet] = data[sheet].map(c => c.slice());  
            });

            let sumberDana = await this.dataReferences.get('refSumberDana');
            let sumberdanaContent = sumberDana.map(c => c.Kode);

            //tambahkan source dropdown pada kolom sumberdana di semua sheet rkp
            this.sheets.forEach(sheet => {
                if (!sheet.startsWith('rkp'))
                    return;

                let newSetting = schemas.rkp;
                let hot = this.hots[sheet];
                let sumberdanaColumn = newSetting.find(c => c.field == 'sumber_dana');

                sumberdanaColumn['source'] = sumberdanaContent;
                hot.updateSettings({ columns: newSetting });
            });

            await this.dataReferences.get('pemda');
            Object.assign(this.desa, data[0]);

            setTimeout(function () {
                me.activeHot.render();
            }, 300);

        });
    }

    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        window.removeEventListener('beforeunload', this.pageSaver.beforeUnloadListener, false);
        
        for (let key in this.hots) {
            if (this.afterChangeHook)
                this.hots[key].removeHook('afterChange', this.afterChangeHook);

            this.hots[key].destroy();
            this.tableHelpers[key].removeListenerAndHooks();
        }
        
        titleBar.removeTitle();
    }
   
    progressListener(progress: Progress) {
        this.progress = progress;
    }

    createSheet(sheetContainer, sheet): any {
        let me = this;
        //menghilangkan nomor pada sheet rkp => rkp1 -> rkp
        sheet = sheet.match(/[a-z]+/g)[0];

        let config = {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas[sheet]),
            columns: schemas[sheet],
            hiddenColumns: {
                columns: schemas[sheet].map((c, i) => {
                     return (c['hiddenColumn'] == true) ? i : '' 
                }).filter(c => c !== ''),
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
                let renderer = false;
                let checkBox = [10, 11, 12, 13, 14, 15, 16, 17, 18];

                if (me.stopLooping) {
                    me.stopLooping = false;
                    changes = [];
                    return;
                }

                changes.forEach(item => {
                    let row = item[0];
                    let col = item[1];
                    let prevValue = item[2];
                    let value = item[3];
                    
                    if (col == 13 && me.activeSheet.startsWith('rkp') || col == 14 && me.activeSheet.startsWith('rkp')) {
                        let dataRow = result.getDataAtRow(row);
                        let mulai = moment(dataRow[13], "DD-MM-YYYY").format()
                        let selesai = moment(dataRow[14], "DD-MM-YYYY").format()

                        if (mulai > selesai) {
                            me.toastr.error('Tanggal Mulai Tidak Boleh Melebihi Tanggal Selesai!', '');
                            me.stopLooping = true;
                            result.setDataAtCell(row, col, prevValue);
                        }
                        else
                            me.stopLooping = false;
                    }

                    if(col == 11 && me.activeSheet.startsWith('rkp'))
                        me.isRkpEdited = true;
                });
            }
        }
        result.addHook("afterChange", this.afterChangeHook);
        return result;
    }    

    saveContent(): void {
        $('#modal-save-diff').modal('hide');
        
        let me = this;
        let diffs = DiffTracker.trackDiffs(this.bundleSchemas, this.initialDatasets, this.getCurrentUnsavedData());        

        this.contentManager.saveDiffs(diffs, async response => {
            if(response instanceof Array === false) {
                this.toastr.error('Penyimpanan ke Database  Gagal!', '');
                return;
            }
            this.toastr.success('Penyimpanan ke Database Berhasil!', '');
            let currentData = await this.contentManager.getContents();

            this.sheets.forEach(sheet => {
                this.hots[sheet].loadData(currentData[sheet]);
                this.initialDatasets[sheet] = currentData[sheet].map(c => c.slice());                
            });

            this.pageSaver.writeSiskeudesData(currentData);
            this.progressMessage = 'Menyimpan Data';

            await this.pageSaver.saveSiskeudesDataPromise(currentData);

            if(this.isRkpEdited)
                await this.updateSumberDana();            
            else
                this.pageSaver.onAfterSave();  
        });
    }

    async updateSumberDana(): Promise<any>{
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };
        let results = [];
        let data = await this.siskeudesService.getSumberDanaPaguTahunan(this.desa.kode_desa);  

        data.forEach(row => {
            let content = results.find(c => c.Kd_Keg == row.Kd_Keg);

            if (content) {
                let sumberdana = content.Sumberdana;
                sumberdana = sumberdana.replace(/\s/g, '');
                let splitSumberdana = sumberdana.split(',');

                if (splitSumberdana.indexOf(row.Sumberdana) == -1) {
                    let newSumberDana = splitSumberdana.join(', ') + (', ') + row.Kd_Sumber;
                    let bundleUpdate = bundleData.update.find(c => c.Ta_RPJM_Kegiatan.whereClause.Kd_Keg == row.Kd_Keg)

                    content.Sumberdana = newSumberDana;
                    bundleUpdate.Ta_RPJM_Kegiatan.data.Sumberdana = newSumberDana;
                }
            }
            else {
                let whereClause = { whereClause: { Kd_Keg: row.Kd_Keg }, data: { Sumberdana: row.Kd_Sumber } }
                bundleData.update.push({ ['Ta_RPJM_Kegiatan']: whereClause });
                results.push({ Kd_Keg: row.Kd_Keg, Sumberdana: row.Kd_Sumber })
            }
        });

        this.siskeudesService.saveToSiskeudesDB(bundleData, null, async response => {
            this.pageSaver.onAfterSave(); 
        });
    }

    addRow(model, callback) {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let lastRow;
        let me = this;
        let position = 0;
        let data = this.valueNormalizer(model);
        let content = [];
        let sourceData = this.activeHot.getSourceData();

        if (this.isExist)
            return;

        if(sheet == 'renstra'){
            let lastCode;
            if (data['category'] == 'misi') {
                let sourDataFiltered = sourceData.filter(c => {
                    if (c[0].replace(this.desa.id_visi, '').length == 2) return c;
                });
                if (sourDataFiltered.length !== 0)
                    lastCode = sourDataFiltered[sourDataFiltered.length - 1][0];
                else
                    lastCode = this.desa.id_visi + '00';
                position = sourceData.length;
            }

            if (data['category'] != 'misi') {
                let code = ((data['category'] == 'tujuan') ? data['misi'] : data['tujuan']).replace(this.desa.id_visi, '');

                sourceData.forEach((content, i) => {
                    let value = content[0].replace(this.desa.id_visi, '');

                    if (value.length == code.length + 2 && value.startsWith(code))
                        lastCode = content[0];

                    if (value.startsWith(code))
                        position = i + 1;
                });

                if (!lastCode) {
                    lastCode = (data['category'] == 'tujuan') ? data['misi'] + '00'
                        : (data['category'] == 'misi') ? '00'
                            : data['tujuan'] + '00';
                }
            }

            let newDigits = ("0" + (parseInt(lastCode.slice(-2)) + 1)).slice(-2);
            let newCode = lastCode.slice(0, -2) + newDigits;
            
            //change to uppercase at first text
            let text = data.category;
            text = text.charAt(0).toUpperCase() + text.slice(1);

            content = [newCode, text, data['uraian']];
        }
        else {        
            let sourceObj = sourceData.map(a => schemas.arrayToObj(a, schemas[sheet]));

            if (sheet == 'rpjm'){
                data.kode_kegiatan = this.desa.kode_desa + data.kode_kegiatan;         
                data.kode_bidang = this.desa.kode_desa + data.kode_bidang;          
            } 
            if (sheet == 'rkp'){
                data.tanggal_mulai = data.tanggal_mulai.toString();
                data.tanggal_selesai = data.tanggal_selesai.toString();
            }
            sourceObj.forEach((content, i) => {
                if (data['kode_kegiatan'] > content.kode_kegiatan)
                    position = position + 1;
            });

            let res = this.completedRow(data, sheet);           
            content = schemas.objToArray(res, schemas[sheet]);                
        }
    
        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length, null, 'overwrite');

        let endColumn = (this.activeSheet == 'renstra') ? 2 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, null, null);

        let results = Object.assign({}, model);

        if(me.activeSheet.startsWith('rkp'))
            this.isRkpEdited = true;

        callback(results);
    }

    completedRow(data, type): any {
        let checkBox = ['tahun_1', 'tahun_2', 'tahun_3', 'tahun_4', 'tahun_5', 'tahun_6', 'swakelola', 'kerjasama', 'pihak_ketiga'];

        if (type == 'rpjm') {
            //menambahkan property yang false
            checkBox.forEach(c => {
                if (data[c])
                    return;
                data[c] = false;
            });

            if (data.kode_sasaran)
                data['uraian_sasaran'] = this.dataReferences.sasaran.find(c => c.kode_sasaran == data.kode_sasaran).Uraian_Sasaran;
            data['nama_kegiatan'] = this.dataReferences.refKegiatan.find(c => c.id_kegiatan == data.kode_kegiatan.substring(this.desa.kode_desa.length)).nama_kegiatan;
            data['nama_bidang'] = this.dataReferences.refBidang.find(c => c.kode_bidang == data.kode_bidang.substring(this.desa.kode_desa.length)).nama_bidang;
        }
        else {
            data['nama_kegiatan'] = this.dataReferences.rpjmKegiatan.find(c => c.kode_kegiatan == data.kode_kegiatan).nama_kegiatan;
            data['nama_bidang'] = this.dataReferences.rpjmBidang.find(c => c.kode_bidang == data.kode_bidang).nama_bidang;
        }

        data['id'] = `${data.kode_bidang}_${data.kode_kegiatan}`;
        return data
    }

    openAddRowDialog(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let me = this;
        let selected = this.activeHot.getSelected(); 
        
        this.isExist = false;
        this.isValidDate = false;
        this.model = {};
        this.setDefaultvalue();

        $("#modal-add-" + sheet)['modal']("show");
        if (sheet !== 'renstra'){
            return;
        }
        this.model.category = 'misi'
        if (selected) {
            let data = this.activeHot.getDataAtRow(selected[0]);
            let code = data[0].substring(this.desa.id_visi.length);   
            let misi = null, tujuan = null;         

            if(code.length == 6){
                tujuan = this.desa.id_visi + code.slice(0,-2);
                misi = this.desa.id_visi + code.slice(0,-4);
                this.categoryOnChange('sasaran');
                this.selectedOnChange('misi',misi);
            }
            else if(code.length == 4){
                misi = this.desa.id_visi + code.slice(0,-2);
                this.categoryOnChange('tujuan');
            }     

            setTimeout(function() {
                me.model.misi = misi;
                me.model.tujuan = tujuan;
            }, 100);                
        }
    }

    getCurrentUnsavedData(): any {
        let res = {};
        let keys = Object.keys(this.initialDatasets);
        keys.forEach(key => {
            res[key] = this.hots[key].getSourceData();
        });
        return res;   
    }

    addOneRow(model): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        
        this.addRow(model, result => {
            $('#form-add-'+sheet)[0]['reset']();
            $("#modal-add-" + sheet)['modal']("hide");
        });
    }

    addOneRowAndAnother(model): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let me = this;
            
        this.addRow(model, result => {
            if(sheet == 'renstra'){
                result.uraian = null;
                this.categoryOnChange(result.category);

                if(result.category == 'sasaran')
                    this.selectedOnChange('misi',result.misi);
                me.model = result;
            }
            else{
                $('#form-add-'+sheet)[0]['reset']();
                setTimeout(function() {
                    me.model.kode_bidang = result.kode_bidang; 
                }, 200);                
            }
        });
    }

    categoryOnChange(value): void {
        this.model = {};
        this.setDefaultvalue();
        let sourceData = this.activeHot.getSourceData();
        this.model.category = value;

        this.contentSelection['contentMisi'] = sourceData.filter(c => {
            let code = c[0].replace(this.desa.id_visi, '');
            if (code.length == 2) return c;
        });
    }

    selectedOnChange(selector, value): void {
        let type = this.activeSheet.match(/[a-z]+/g)[0];
        let sourceData = this.activeHot.getSourceData();
        let content;

        switch (selector) {
            case 'misi':
                this.contentSelection['contentTujuan'] = [];
                sourceData.forEach(data => {
                    let code = data[0].replace(this.desa.id_visi, '');

                    if (code.length == 4 && data[0].startsWith(value))
                        this.contentSelection['contentTujuan'].push(data);
                })
                break;
            case 'bidangRPJM':
                this.contentSelection['kegiatan'] = this.dataReferences['refKegiatan'].filter(c => c.kode_bidang == value);
                break;
            case 'bidangRKP':
                content = this.dataReferences['rpjmKegiatan'];
                this.contentSelection['kegiatan'] = content.filter(c => c.kode_kegiatan.startsWith(value) && c.kode_kegiatan.split('.').length == 5);
                break;
        }
    }

    async getReferences(type): Promise<any> {
        let sourceData;
        switch (type) {
            case 'sasaran':
                let fields = [{ field: 'kode_sasaran' }, { field: 'category' }, { field: 'uraian_sasaran' }];
                sourceData = this.hots['renstra'].getSourceData().map(c => schemas.arrayToObj(c, fields));
                this.dataReferences["sasaran"] = sourceData.filter(c => c.category == 'Sasaran');
                return true;
            case 'rpjmBidAndKeg':
                sourceData = this.hots['rpjm'].getSourceData();
                let kegiatanResults = [];
                let bidangResults = [];

                for (let i = 0; i < sourceData.length; i++) {
                    let row = schemas.arrayToObj(sourceData[i], schemas.rpjm);
                    let currentBidang = bidangResults.find(c => c.kode_bidang == row.kode_bidang);

                    kegiatanResults.push({ kode_kegiatan: row.kode_kegiatan, nama_kegiatan: row.nama_kegiatan })
                    if (!currentBidang)
                        bidangResults.push({ kode_bidang: row.kode_bidang, nama_bidang: row.nama_bidang })

                }
                this.dataReferences['rpjmKegiatan'] = kegiatanResults;
                this.dataReferences['rpjmBidang'] = bidangResults;
                return true;
        }
    }

    async selectTab(type): Promise<any> {
        let me = this;
        this.isExist = false;
        this.activeSheet = type;
        this.activeHot = this.hots[type];        

        if (type.startsWith('rpjm')) {
            await this.dataReferences.get('refKegiatan');
            await this.dataReferences.get('refBidang');
            await this.getReferences('sasaran');
            await this.dataReferences.get('rpjmBidangAdded');
        }
        else if (type.startsWith('rkp')) {
            await this.getReferences('rpjmBidAndKeg');
        }

        setTimeout(function () {
            me.activeHot.render();
        }, 500);
    }

    setDefaultvalue() {
        this.contentSelection = {};
        switch (this.activeSheet) {
            case 'renstra':
                this.model.misi = null;
                this.model.tujuan = null;
                break;
            case 'rpjm':
                this.model.kode_bidang = null;
                this.model.kode_kegiatan = null;
                this.model.kode_sasaran = null;
                break;
            default:
                this.model.kode_bidang = null;
                this.model.kode_kegiatan = null;
                this.model.pola_kegiatan = null;
                this.model.sumber_dana = null;
                this.model.anggaran = 0;
                this.model.jumlah_sasaran_rumah_tangga = 0;
                this.model.jumlah_sasaran_pria = 0;
                this.model.jumlah_sasaran_wanita = 0;
                this.model.volume = 0;
                break;
        }
    }

    validateIsExist(value, message, schemasType): void {
        let sourceData: any[] = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[schemasType]));
        let kode_kegiatan = this.activeSheet == 'rpjm' ? this.desa.kode_desa + value : value;

        this.messageIsExist = message;
        if (sourceData.length < 1)
            this.isExist = false;

        for (let i = 0; i < sourceData.length; i++) {
            
            if (sourceData[i].kode_kegiatan == kode_kegiatan) {
                this.zone.run(() => {
                    this.isExist = true;
                })
                break;
            }
            this.isExist = false;
        }
    }

    valueNormalizer(model): any {
        Object.keys(model).forEach(val => {
            if (model[val] == null || model[val] === undefined)
                model[val] = '';
        })
        return model;
    }
      
    validateDate() {
        if (this.model.Mulai != "" && this.model.tanggal_selesai != "") {
            let mulai = moment(this.model.tanggal_mulai, "DD/MM/YYYY").format();
            let selesai = moment(this.model.tanggal_selesai, "DD/MM/YYYY").format();

            this.zone.run(() =>{
                this.isValidDate = (mulai > selesai) ? false : true;
            })
        }
    }

    setActivePageMenu(activePageMenu){
        if(!this.printParameters)
            this.printReport();
        else
            this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
        } else {
            titleBar.blue();
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

    printReport(){        
        this.printParameters = {
            param_report: this.getParamsReport(),
            active_sheet: this.activeSheet,
            sheet: this.activeSheet.startsWith('rkp') ? 'rkp' : this.activeSheet,

        }
        this.setActivePageMenu("print");
    }

    getParamsReport(){
        let params = [
            {
                name: 'footer',
                label: 'Footer',
                type: 'input',
            }
        ] 
        switch(this.activeSheet){
            case "renstra":
                return  [
                    {
                        name: 'rentra',
                        label: 'Laporan Renstra Desa',
                        type: 'radio',
                        params: params                
                    }
                ];
            case "rpjm":
                return [
                    {
                        name: 'rpjm',
                        label: 'Laporan RKP Desa',
                        type: 'radio',
                        params: params                 
                    }
                ];
            
            default:
                return[
                    {
                        name: 'rkp-tahunan',
                        label: 'Laporan RKP Desa Tahunan',
                        type: 'radio',
                        params: params                        
                    },
                    {
                        name: 'rkp-kegiatan',                        
                        label: 'Laporan Rencana Kegiatan Desa',
                        type: 'radio',
                        params: params
                    },
                    {
                        name: 'pagu',
                        label: 'Laporan Rencana Kegiatan Desa',
                        type: 'radio',
                        params: params                        
                    }
                ]
        }   
    }


}