import { remote } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy, Directive } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, FormsModule, NgForm } from '@angular/forms';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { RENSTRA_FIELDS, PerencanaanContentManager } from '../stores/siskeudesContentManager';

import DataApiService from '../stores/dataApiService';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';
import schemas from '../schemas';
import TableHelper from '../helpers/table';
import titleBar from '../helpers/titleBar';
import PageSaver from '../helpers/pageSaver';
import ContentMerger from '../helpers/contentMerger';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';

var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var pdf = require('html-pdf');
var dot = require('dot');

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html',
})

export default class PerencanaanComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    activeSheet: string;
    sheets: any;

    messageIsExist: string;
    isExist: boolean;

    initialDatasets: any = {};
    hots: any = {};
    activeHot: any;

    contentSelection: any = {};
    dataReferences: SiskeudesReferenceHolder;
    newBidangs: any[] = [];

    diffTracker: DiffTracker;
    diffContents: any = {};

    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};

    
    contentManager: PerencanaanContentManager;

    progress: Progress;
    progressMessage: string;

    desa: any = {};
    reports: any = {};
    parameters: any[] = [];

    afterChangeHook: any;
    perencanaanSubscription: Subscription;
    routeSubscription: Subscription;
    pageSaver: PageSaver;
    modalSaveId;

    constructor(
        public dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private sharedService: SharedService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        private router: Router,
        private route: ActivatedRoute,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
    ) {
        super(dataApiService);
        this.diffTracker = new DiffTracker();
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this, sharedService, null, router, toastr);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnInit() {
        titleBar.title("Data Perencanaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        let me = this;
        this.modalSaveId = 'modal-save-diff';
        this.isExist = false;
        this.activeSheet = 'renstra';
        this.sheets = ['renstra', 'rpjm', 'rkp1', 'rkp2', 'rkp3', 'rkp4', 'rkp5', 'rkp6'];
        this.pageSaver.bundleData = { "renstra": [], "rpjm": [], "rkp1": [], "rkp2": [], "rkp3": [], "rkp4": [], "rkp5": [], "rkp6": [] };
        this.pageSaver.bundleSchemas = {
            "renstra": schemas.renstra,
            "rpjm": schemas.rpjm,
            "rkp1": schemas.rkp,
            "rkp2": schemas.rkp,
            "rkp3": schemas.rkp,
            "rkp4": schemas.rkp,
            "rkp5": schemas.rkp,
            "rkp6": schemas.rkp
        };

        let references = ['refBidang', 'refKegiatan', 'refSumberDana', 'sasaran', 'rpjmBidang', 'rpjmKegiatan'];
        references.forEach(item => {
            this.dataReferences[item] = [];
        });

        document.addEventListener('keyup', this.keyupListener, false);

        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-' + sheet);
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
            if(sheet == 'renstra')
                this.activeHot = this.hots['renstra'];
        });

        this.routeSubscription = this.route.queryParams.subscribe(async (params) => {           
            this.desa['ID_Visi'] = params['id_visi'];
            this.desa['Visi_TahunA'] = params['first_year'];
            this.desa['Visi_TahunN'] = params['last_year'];
            let kodeDesa = params['kd_desa'];

            var desa = await this.siskeudesService.getTaDesa(kodeDesa);
            Object.assign(this.desa, desa[0]);

            this.contentManager = new PerencanaanContentManager(this.siskeudesService, this.desa, this.dataReferences)
            var data = await this.contentManager.getContents();
            this.sheets.forEach(sheet => {
                this.hots[sheet].loadData(data[sheet]);
                this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
            });

            data = await this.dataReferences.get('refSumberDana');
            console.log("get", data);
            let sumberdanaContent = data.map(c => c.Kode);

            //tambahkan source dropdown pada kolom sumberdana di semua sheet rkp
            this.sheets.forEach(sheet => {
                if (!sheet.startsWith('rkp'))
                    return;

                let newSetting = schemas.rkp;
                let hot = this.hots[sheet];

                let sumberdanaColumn = newSetting.find(c => c.field == 'sumber_dana')
                sumberdanaColumn['source'] = sumberdanaContent;
                hot.updateSettings({ columns: newSetting });
            });

            data = await this.dataReferences.get('pemda');
            Object.assign(desa, data[0]);

            this.progressMessage = 'Memuat data';

            this.pageSaver.getContent('perencanaan', this.desa.tahun, this.progressListener.bind(this), 
                (err, notifications, isSyncDiffs, data) => {
                    this.dataApiService.writeFile(data, this.sharedService.getPerencanaanFile(), null);
            });

            setTimeout(function () {
                me.activeHot.render();
            }, 300);
        });

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

    onResize(event): void {
        let that = this;
        this.activeHot = this.hots[this.activeSheet];
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }
    
    progressListener(progress: Progress) {
        this.progress = progress;
    }

    createSheet(sheetContainer, sheet): any {
        let me = this;
        //menghilangkan nomor pada sheet rkp => rkp1 -> rkp
        sheet = sheet.match(/[a-z]+/g)[0];

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

                    if (me.activeSheet == 'rpjm' && checkBox.indexOf(col) !== -1)
                        renderer = true;
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

                });
            }
        }
        result.addHook("afterChange", this.afterChangeHook);
        return result;
    }    

    saveContent(): void {
        $('#modal-save-diff').modal('hide');
        let me = this;
        let diffs = {};

        this.sheets.forEach(sheet => {
            let sourceData = [], initialData = [];
            initialData = this.initialDatasets[sheet];
            sourceData = this.hots[sheet].getSourceData();
            
            this.pageSaver.bundleData[sheet] = sourceData;

            diffs[sheet] = this.trackDiffs(initialData, sourceData);
        });

        this.contentManager.saveDiffs(diffs, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan ke Database Berhasil!', '');
                this.saveContentToServer();

                this.contentManager.getContents().then(data => {
                    this.sheets.forEach(sheet => {
                        this.hots[sheet].loadData(data[sheet]);
                        this.initialDatasets[sheet] = data[sheet].map(c => c.slice());

                        //if (isRKPSheet){
                            // jika terdapat sheet rkp yang di edit update sumberdana
                            this.updateSumberDana();
                        //}
                       // else
                            this.pageSaver.onAfterSave();
    
                        setTimeout(function () {
                            me.activeHot.render();
                        }, 300);
                        
                    });
                })
            }
            else
                this.toastr.error('Penyimpanan ke Database  Gagal!', '');
        });
    };

    updateSumberDana(): void {
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };
        let results = [];
        this.siskeudesService.getSumberDanaPaguTahunan(this.desa.Kd_Desa, data => {
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

            this.siskeudesService.saveToSiskeudesDB(bundleData, null, response => {
                this.pageSaver.onAfterSave();
            });

        });
    }

    saveContentToServer() {
        this.sheets.forEach(sheet => {
            this.pageSaver.bundleData[sheet] = this.hots[sheet].getSourceData();
        });

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent('perencanaan', this.desa.tahun, false, this.progressListener.bind(this), 
        (err, data) => {
            if(err)
                this.toastr.error(err);
            else
                this.toastr.success('Data berhasil disimpan ke server');

            this.dataApiService.writeFile(data, this.sharedService.getPerencanaanFile(), null);
        });
    }

    openFillParams(){
        $("#modal-fill-params")['modal']("show");
    }

    retransform(params): any {
        let result = { reports: [], data:[] }
        if(this.activeSheet == 'renstra'){
            let fields = [{ field: 'Code' }, { field: 'Category' }, { field: 'Uraian' }];
            let sourceData = this.activeHot.getSourceData();
            let currents = RENSTRA_FIELDS.currents;
            result.reports.push('renstra');

            sourceData.forEach(row => {
                let data = schemas.arrayToObj(row, fields);
                let code = data.Code.replace(this.desa.ID_Visi, '');
            });
        }
    }

    mergeContent(newBundle, oldBundle): any {
        let contentMerger = new ContentMerger(this.dataApiService);
        return contentMerger.mergeSiskeudesContent(newBundle, oldBundle, Object.keys(this.pageSaver.bundleSchemas));
    }

    print(model){
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'Report', extensions: ['pdf']}]
        });

        let templatePath = 'laporan_templates\\renstra\\renstra.html'
        let template = fs.readFileSync(path.join(__dirname,),'utf8');
        let tempFunc = dot.template( template );
        let html = tempFunc(this.desa);
        let options = { "format": "A4", "orientation": "landscape" }
        

        if(fileName){
            $("#modal-fill-params")['modal']("hide");

            pdf.create(html, options).toFile(fileName, function(err, res) {
                if (err) return console.log(err);
            });         
        }
    }

    addRow(model): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let lastRow;
        let me = this;
        let position = 0;
        let data = this.valueNormalizer(model);
        let content = []
        let sourceData = this.activeHot.getSourceData();

        if (this.isExist)
            return;

        if(sheet == 'renstra'){
            let lastCode;
            if (data['category'] == 'misi') {
                let sourDataFiltered = sourceData.filter(c => {
                    if (c[0].replace(this.desa.ID_Visi, '').length == 2) return c;
                });
                if (sourDataFiltered.length !== 0)
                    lastCode = sourDataFiltered[sourDataFiltered.length - 1][0];
                else
                    lastCode = this.desa.ID_Visi + '00';
                position = sourceData.length;
            }

            if (data['category'] != 'misi') {
                let code = ((data['category'] == 'tujuan') ? data['misi'] : data['tujuan']).replace(this.desa.ID_Visi, '');

                sourceData.forEach((content, i) => {
                    let value = content[0].replace(this.desa.ID_Visi, '');

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
            data.category= text.charAt(0).toUpperCase() + text.slice(1);

            content = [newCode, data['category'], data['uraian']];

        }
        else {        
            let sourceObj = sourceData.map(a => schemas.arrayToObj(a, schemas[sheet]));
            let isNewBidang = true;

            if (sheet == 'rpjm'){
                data.kode_kegiatan = this.desa.Kd_Desa + data.kode_kegiatan;         
                data.kode_bidang = this.desa.Kd_Desa + data.kode_bidang;          
            } 

            sourceObj.forEach((content, i) => {
                if (data['kode_bidang'] == content.kode_bidang)
                    isNewBidang = false;

                if (data['kode_kegiatan'] > content.kode_kegiatan)
                    position = position + 1;
            });

            if (isNewBidang && sheet == 'rpjm')
                this.newBidangs.push(data['kode_bidang']);

            let res = this.completedRow(data, sheet);
           
            content = schemas.objToArray(res, schemas[sheet]);
                
        }
    
        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length, null, 'overwrite');

        let endColumn = (this.activeSheet == 'renstra') ? 2 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, null, null);
    }

    completedRow(data, type): any {
        let checkBox = ['tahun_1', 'tahun_2', 'tahun_3', 'tahun_4', 'tahun_5', 'tahun_6', 'swakelola', 'kerjasama', 'pihak_ketiga'];

        if (type == 'rpjm') {
            //menambahkan property yang false
            checkBox.forEach(c => {
                if (data[c])
                    return;
                else
                    data[c] = false;
            });

            if (data.kode_sasaran)
                data['uraian_sasaran'] = this.dataReferences.sasaran.find(c => c.ID_Sasaran == data.kode_sasaran).Uraian_Sasaran;
            data['nama_kegiatan'] = this.dataReferences.refKegiatan.find(c => c.ID_Keg == data.kode_kegiatan.substring(this.desa.Kd_Desa.length)).Nama_Kegiatan;
            data['nama_bidang'] = this.dataReferences.refBidang.find(c => c.Kd_Bid == data.kode_bidang.substring(this.desa.Kd_Desa.length)).Nama_Bidang;
        }
        else {
            data['nama_kegiatan'] = this.dataReferences.rpjmKegiatan.find(c => c.kode_kegiatan == data.kode_kegiatan).nama_kegiatan;
            data['nama_bidang'] = this.dataReferences.rpjmBidang.find(c => c.kode_bidang == data.kode_bidang).nama_bidang;
        }

        data['id'] = `${data.kode_bidang}_${data.kode_kegiatan}`

        return data
    }

    openAddRowDialog(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        this.isExist = false;
        this.model = {};
        this.setDefaultvalue();

        let selected = this.activeHot.getSelected();
        let category = "misi";

        $("#modal-add-" + sheet)['modal']("show");

        if (sheet !== 'renstra')
            return;  

        if (selected) {
            let data = this.activeHot.getDataAtRow(selected[0]);
            let code = data[0].replace(this.desa.ID_Visi, '');
            let current = RENSTRA_FIELDS.currents.find(c => c.lengthId == code.length + 2);

            if (!current) current = RENSTRA_FIELDS.currents.find(c => c.lengthId == 6);
            category = current.fieldName.split('_')[1];
        }

        this.model.category = category;
        if (category !== 'misi') 
            this.categoryOnChange(category);
        
    }

    getCurrentDiffs(): any {
        let res = {};
        let keys = Object.keys(this.initialDatasets);

        keys.forEach(key => {
            let sourceData = this.hots[key].getSourceData();
            let initialData = this.initialDatasets[key];
            let diffs = this.diffTracker.trackDiff(initialData, sourceData);
            res[key] = diffs;
        });

        return res;   
    }

    addOneRow(model): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        if (sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist) {
            this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan', '');
            return
        }

        let isFilled = this.validateForm(model);
        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if (sheet == 'rkp') {
                if (this.validateDate()) {
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow(model);
                    $("#modal-add-" + sheet)['modal']("hide");
                }
            }
            else {
                this.addRow(model);
                $("#modal-add-" + sheet)['modal']("hide");
            }

        }
    }

    addOneRowAndAnother(model): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let category = model.category;

        if (sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist) {
            this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan', '');
            return
        }

        let isFilled = this.validateForm(model);

        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if (sheet == 'rkp') {
                if (this.validateDate()) {
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow(model);
                    this.categoryOnChange(model.category);
                }
            }
            else {
                this.addRow(model);
                this.categoryOnChange(model.category);
            }
        }
    }

    categoryOnChange(value): void {
        this.model = {};
        this.setDefaultvalue();
        let sourceData = this.activeHot.getSourceData();
        this.model.category = value;

        this.contentSelection['contentMisi'] = sourceData.filter(c => {
            let code = c[0].replace(this.desa.ID_Visi, '');
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
                    let code = data[0].replace(this.desa.ID_Visi, '');

                    if (code.length == 4 && data[0].startsWith(value))
                        this.contentSelection['contentTujuan'].push(data);
                })
                break;
            case 'bidangRPJM':
                this.contentSelection['kegiatan'] = this.dataReferences['refKegiatan'].filter(c => c.Kd_Bid == value);
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
                let fields = [{ field: 'ID_Sasaran' }, { field: 'Category' }, { field: 'Uraian_Sasaran' }];
                sourceData = this.hots['renstra'].getSourceData().map(c => schemas.arrayToObj(c, fields));
                this.dataReferences["sasaran"] = sourceData.filter(c => c.Category == 'Sasaran');
                return true;
            case 'RPJMBidAndKeg':
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
        let that = this;
        this.isExist = false;
        this.activeSheet = type;
        this.activeHot = this.hots[type];

        if (type.startsWith('rpjm')) {
            await this.dataReferences.get('refKegiatan');
            await this.dataReferences.get('refBidang');
            await this.getReferences('sasaran');
        }
        else if (type.startsWith('rkp')) {
            await this.getReferences('RPJMBidAndKeg');
        }

        setTimeout(function () {
            that.activeHot.render();
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
                this.model.sumber_dana = null;
                this.model.anggaran = 0;
                this.model.jumlah_sasran_rumah_tangga = 0;
                this.model.jumlah_sasaran_pria = 0;
                this.model.jumlah_sasaran_wanita = 0;
                this.model.volume = 0;
                break;
        }
    }

    trackDiffs(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    getDiffContents(): any {
        let res = {};
        let keys = Object.keys(this.initialDatasets);

        keys.forEach(key => {
            let sourceData = this.hots[key].getSourceData();
            let initialData = this.initialDatasets[key];
            let diffs = this.diffTracker.trackDiff(initialData, sourceData);
            res[key] = diffs;
        });

        return res;   
    }

    validateForm(data): boolean {
        let result = false;
        let category = data.category;

        if (this.activeSheet == 'renstra') {
            let requiredColumn = { tujuan: ['misi'], sasaran: ['misi', 'tujuan'] }
            if (category == 'misi')
                return false;

            for (let i = 0; i < requiredColumn[category].length; i++) {
                let col = requiredColumn[category][i];

                if (data[col] == '' || !data[col] || data[col] == 'null') {
                    result = true;
                    break;
                }
            }
            return result
        }
        else if (this.activeSheet == 'rpjm') {
            let requiredColumn = ['kode_bidang', 'kode_kegiatan'];

            for (let i = 0; i < requiredColumn.length; i++) {
                if (data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null') {
                    result = true;
                    break;
                }
            }
            return result;
        }
        else if (this.activeSheet.startsWith('rkp')) {
            let requiredColumn = ['kode_bidang', 'kode_kegiatan', 'sumber_dana', 'tanggal_mulai', 'tanggal_selesai'];

            for (let i = 0; i < requiredColumn.length; i++) {
                if (data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null') {
                    result = true;
                    break;
                }
            }
            return result;
        }
    }

    validateIsExist(value, message, schemasType): void {
        let sourceData: any[] = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[schemasType]));
        let kode_kegiatan = this.activeSheet == 'rpjm' ? this.desa.Kd_Desa + value : value;

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

            if (mulai > selesai)
                return true;
            return false
        }
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
