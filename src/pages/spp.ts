import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

import schemas from '../schemas';
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import TableHelper from '../helpers/table';
import SumCounterSPP from "../helpers/sumCounterSPP";
import { Diff, DiffTracker } from "../helpers/diffTracker";
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var uuid = require('uuid');
var base64 = require("uuid-base64");

window['jQuery'] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');
require('jquery-ui-bundle');

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

export default class SppComponent implements OnInit, OnDestroy {
    hot: any;
    sub: any;
    contentSelection: any = {};
    potongan: any = {};
    isExist: boolean;
    message: string;
    refDatasets: any = {};
    initialData: any;
    kdKegiatan: string;
    diffTracker: DiffTracker;
    afterSaveAction: string;
    isSPPDetailEmpty: boolean;
    isLockedAddRow: boolean;
    SPP: any = {};
    model: any = {};
    posting = {};
    sisaAnggaran: any[];
    sum: any = {};
    stopLooping: boolean;
    isPencairan: boolean;
    diffContents: any = {};
    bundleData: any;
    bundleSchemas: any;
    progress: Progress;
    progressMessage: string;

    afterRemoveRowHook: any;
    beforeRemoveRowHook: any;
    afterChangeHook: any;
    
    constructor(
        private dataApiService: DataApiService,
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
        this.diffTracker = new DiffTracker();
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        this.posting = {};
        this.isLockedAddRow = false
        this.isExist = false;
        this.kdKegiatan = null;

        this.sub = this.route.queryParams.subscribe(params => {
            let sheetContainer = document.getElementById("sheet");
            titleBar.blue(`SPP ${JENIS_SPP[params['jenis_spp']]} -` + this.dataApiService.getActiveAuth()['desa_name']);

            this.SPP['noSPP'] = params['no_spp'];
            this.SPP['kdDesa'] = params['kd_desa'];
            this.SPP['tahun'] = params['tahun'];
            this.SPP['jenisSPP'] = params['jenis_spp'];
            this.SPP['tanggalSPP'] = params['tanggal_spp'];
            this.hot = this.createSheet(sheetContainer);                
            this.bundleSchemas = { rincian: schemas.spp };
            this.bundleData = { rincian: []}

            this.getContentFromServer();
            this.getContent();
        });
    }

    ngOnDestroy(): void {
        if (this.afterRemoveRowHook)
            this.hot.removeHook('afterRemoveRow', this.afterRemoveRowHook);
        if (this.beforeRemoveRowHook)
            this.hot.removeHook('beforeRemoveRow', this.beforeRemoveRowHook);
        if (this.afterChangeHook)
            this.hot.removeHook('afterChange', this.afterChangeHook);
        this.hot.destroy();
        this.sub.unsubscribe();
        titleBar.removeTitle();
    }

    redirectMain(): void {
        this.hot.sumCounter.calculateAll();
        let sourceData = this.getSourceDataWithSums();
        let diff = this.trackDiff(this.initialData, sourceData)
        this.afterSaveAction = 'home';

        if (diff.total === 0)
            this.router.navigateByUrl('/');
        else
            this.openSaveDialog();
    }

    forceQuit(): void {
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
            me.hot.render();
        }, 200);
    }

    createSheet(sheetContainer): any {
        let me = this;
        let config = {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.spp),
            columns: schemas.spp,
            hiddenColumns: {
                columns: schemas.spp.map((c, i) => { return (c.hiddenColumn == true) ? i : '' }).filter(c => c !== ''),
                indicators: true
            },

            colWidths: schemas.getColWidths(schemas.spp),
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
        result.sumCounter = new SumCounterSPP(result, this.SPP.jenisSPP);

        this.afterRemoveRowHook = (index, amount) => {
            result.sumCounter.calculateAll();
            result.render();
        }
        result.addHook('afterRemoveRow', this.afterRemoveRowHook);

        this.beforeRemoveRowHook = (index, amount, row) => {}
        result.addHook('beforeRemoveRow', this.beforeRemoveRowHook);

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

                    if (col == 5 && me.SPP.jenisSPP !== 'UM') {
                        let rowData = result.getDataAtRow(row);
                        let id = rowData[0];
                        if(!id)
                            return;
                        let kdRincian = id.split('_')[0];
                        let rincian = me.sisaAnggaran.find(c => c.Kd_Rincian == kdRincian);

                        if(rincian){
                            let sisaAnggaran = (rincian.Sisa + prevValue)
                            if(sisaAnggaran < value){
                                me.toastr.error('Sisa Anggaran Untuk Kode Rincian Ini Tidak Mencukupi !', '');
                                result.setDataAtCell(row, col, prevValue);
                                me.stopLooping = true;
                            }
                            else{
                                rerender = true;
                                rincian.Sisa = rincian.Sisa+ (prevValue - value);
                            }
                        }
                        else
                            rerender = true;
                    }                    
                });
                if (rerender) {
                    result.sumCounter.calculateAll();
                    result.render();
                }
            }
        }
        result.addHook('afterChange', this.afterChangeHook);
        return result;
    }

    getContent(): void{
        let me = this;

        this.siskeudesService.getPostingLog(this.SPP.kdDesa, data => {
            let kdPostingSelected;
            this.isLockedAddRow = true;

            data.forEach(c => {
                if (c.KdPosting == 3)
                    return;

                if (c.KdPosting == 1 && kdPostingSelected !== 2) {
                    this.posting = c;
                    this.isLockedAddRow = false;
                    kdPostingSelected = 1;
                }
                else if (c.KdPosting == 2) {
                    this.posting = c;
                    this.isLockedAddRow = false;
                    kdPostingSelected = 2;
                }
            });
            
            if (kdPostingSelected) {
                let datePosting = moment(this.posting['TglPosting'], "DD-MM-YYYY");
                let dateSPP = moment(this.SPP.tanggalSPP, "DD-MM-YYYY");
                this.SPP['kdPosting'] = kdPostingSelected;

                if (datePosting > dateSPP) {
                    this.toastr.error('Tidak Bisa menambah Rincian Karena Tanggal SPP Dibuat Sebelum Tanggal Posting', '')
                    this.isLockedAddRow = true;
                }
            }

            this.siskeudesService.getPencairanSPP(this.SPP.kdDesa, this.SPP.noSPP, data =>{
                if(data.length !== 0){
                    this.toastr.error('SPP ini telah di cairkan', '')
                    this.isLockedAddRow = true;
                    this.isPencairan = true;
                }
                else if (!kdPostingSelected && data.length == 0){
                    this.toastr.error('Harap Posting APBDes Awal Tahun Terlebih Dahulu Untuk Menambah Rincian', '');
                    this.isPencairan = true;
                }

                this.siskeudesService.getDetailSPP(this.SPP.noSPP, detail => {                
                    let results = [];

                    if (detail.length !== 0) {
                        results = this.transformData(detail);
                        
                        this.zone.run(() => {
                            this.isSPPDetailEmpty = false;
                        });
                                            
                        this.kdKegiatan = detail[0].Kd_Keg;
                        this.getSisaAnggaran(null, data => {
                            this.sisaAnggaran = data;
                        });
                    }
                    else {
                        this.zone.run(() => {
                                this.isSPPDetailEmpty = true;
                        });
                    }
                    
                    this.hot.loadData(results);
                    this.hot.sumCounter.calculateAll();
                    this.getReferences();

                    setTimeout(function () {
                        me.initialData = me.getSourceDataWithSums().map(c => c.slice());
                        me.hot.render();
                    }, 200);
                });
            })
        })
    }

    
    getContentFromServer(): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent('penatausahaan', this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';

        let subtype = this.SPP.noSPP.split('/').join('_');
        this.dataApiService.getContent('penatausahaan', subtype, changeId, this.progressListener.bind(this))
            .subscribe(
            result => {
                if(result['change_id'] === localBundle.changeId){
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    return;
                }

                mergedResult = this.mergeContent(result, localBundle);

                this.dataApiService.writeFile(mergedResult, this.sharedService.getPenatausahaanFile() , null);
            },
            error => {
                mergedResult = this.mergeContent(localBundle, localBundle);
                this.dataApiService.writeFile(mergedResult, this.sharedService.getPenatausahaanFile(), null);
            });
    }

    mergeContent(newBundle, oldBundle): any {
        if (newBundle['diffs']) {
            let newDiffs = newBundle["diffs"]['rincian'] ? newBundle["diffs"]['rincian'] : [];
            oldBundle["data"]['rincian'] = this.dataApiService.mergeDiffs(newDiffs, oldBundle["data"]['rincian']);
        }
        else 
            oldBundle["data"]['rincian'] = newBundle["data"]['rincian'] ? newBundle["data"]['rincian'] : [];
        

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

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
        let diffcontent = this.trackDiff(this.initialData, sourceData);

        if (diffcontent.total < 1) return;

        this.sum = this.getSumAnggaran()
        let bundle = this.bundle(diffcontent);

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

    saveContentToServer(){
        let localBundle = this.dataApiService.getLocalContent('penatausahaan', this.bundleSchemas);

        let sourceData = this.getSourceDataWithSums().map(c => c.slice());
        let diff =  this.diffTracker.trackDiff(localBundle['data']['rincian'], sourceData);

        if (diff.total > 0)
            localBundle['diffs']['rincian'] = localBundle['diffs']['rincian'].concat(diff);
        
        let subtype = this.SPP.noSPP.split('/').join('_');
        this.dataApiService.saveContent('penatausahaan', subtype, localBundle, this.bundleSchemas, this.progressListener.bind(this))
            .finally(() => {
                this.dataApiService.writeFile(localBundle, this.sharedService.getPenatausahaanFile(), this.toastr)
            })
            .subscribe(
            result => {
                let mergedResult = this.mergeContent(result, localBundle);
                
                mergedResult = this.mergeContent(localBundle, mergedResult);
                
                localBundle.diffs['rincian'] = [];
                localBundle.data['rincian'] = mergedResult['data']['rincian'];

                this.toastr.success('Data berhasil disimpan ke server');
            },
            error => {
                this.toastr.error('Data gagal disimpan ke server');
            });

    }

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    bundle(bundleDiff): any {        
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        bundleDiff.added.forEach(content => {
            let contentObj = schemas.arrayToObj(content, schemas.spp);
            let result = this.bundleArrToObj(contentObj);  
                                 
            bundle.insert.push({[result.table]: result.data})
        });

        bundleDiff.modified.forEach(content => {
            let contentObj = schemas.arrayToObj(content, schemas.spp);
            let result = this.bundleArrToObj(contentObj);
            let whereClause = {};

            FIELD_WHERE[result.table].forEach(c => {
                whereClause[c] = result.data[c];
            });

            result.data = this.sliceObject(result.data, FIELD_WHERE[result.table])
            bundle.update.push({ [result.table]: { whereClause: whereClause, data: result.data  } })  
        });

        bundleDiff.deleted.forEach(content => {
            let contentObj = schemas.arrayToObj(content, schemas.spp);
            let result = this.bundleArrToObj(contentObj);
            let whereClause = {};

            FIELD_WHERE[result.table].forEach(c => {
                whereClause[c] = result.data[c];
            });

            result.data = this.sliceObject(result.data, FIELD_WHERE[result.table])
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

    sliceObject(obj, values): any {
        let res = {};
        let keys = Object.keys(obj);

        for (let i = 0; i < keys.length; i++) {
            if (values.indexOf(keys[i]) !== -1) continue;
            res[keys[i]] = obj[keys[i]]
        }
        return res;
    }

    getSourceDataWithSums(): any[] {
        let data = this.hot.sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas.spp));
        return data
    }

    openSaveDialog() {
        let that = this;
        this.hot.sumCounter.calculateAll();

        let sourceData = this.getSourceDataWithSums();    
        this.diffContents = this.trackDiff(this.initialData, sourceData)

        if (this.diffContents.total > 0) {
            $("#modal-save-diff").modal("show");
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
        (sourceData.length == 0 && category == 'rincian' || category == 'potongan') ? this.categoryOnChange(category) : this.getKodeKegAndChange();
    }

    addRow(): void {
        let me = this;
        let position = 0;
        let results = [];
        let data = this.model;
        let currentCode, lastCode;
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
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
                data.Tgl_Bukti = moment(data.Tgl_Bukti, "YYYY-MM-DD").format("DD/MM/YYYY");
                break;
            case 'potongan':
                let buktiPengeluaran = '';
                let id = data.Kd_Rincian +'_'+ this.model.No_Bukti;
                sourceData.forEach((c, i) => {
                    if (c.id.startsWith(id))
                        position = i + 1;
                });
                let potongan = this.refDatasets.potongan.find(c => c.Kd_Potongan == data.Kd_Potongan);
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
                 this.contentSelection['allKegiatan'] = this.refDatasets["allKegiatan"];
            }
            else 
                this.getKodeKegAndChange();            
        }
        else {
            let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
            let rincian = sourceData.filter(c => c.code.startsWith('5.') && c.code.split('.').length == 5);
                        
            if(value == 'pengeluaran')
                this.model.No_Bukti = '00000/KWT/' + this.SPP.kdDesa + this.SPP.tahun;        
            this.contentSelection['availableRincian'] = rincian;       
        }
    }

    getKodeKegAndChange(): void {
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let row = sourceData.filter(c => c.code.startsWith('5.') && c.code.split('.').length == 5);
        let code = row[0].code;

        if (code == '')
            return;

        this.siskeudesService.getKegiatanByCodeRinci(code, data => {            
            this.kdKegiatan = data[0].Kd_Keg;
            this.selectedOnChange(this.kdKegiatan);
        });
    }

    selectedOnChange(value): void {
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
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
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
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
                let year = moment(this.model.Tgl_Bukti, "YYYY-MM-DD").year().toString();
                
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
                let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
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
        this.siskeudesService.getRefPotongan(data => {
            this.refDatasets["potongan"] = data;
        })

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

            this.refDatasets["allKegiatan"] = results;
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
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let currentKdRincian = '';
        let pad = '00000';
        let result;

        if(kdRincian == 'null' || !kdRincian)
            return;

        this.siskeudesService.getMaxNoBukti(this.SPP.kdDesa, data =>{
            if(data.length == 0){
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
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
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
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
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
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        if(this.potongan)
            this.model.PersentasePajak = this.potongan.value; 
        else
            this.model.dppPajak =  0;    
        this.getPajakValue();       
    }

    getPajakValue(){
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let pengeluaran = sourceData.find(c => c.code == this.model.No_Bukti)

        if(pengeluaran && this.potongan){
            if(this.potongan.code != '7.1.1.04.')
                this.model.nilaiPajak = ((this.model.PersentasePajak / (100+this.model.PersentasePajak) * pengeluaran.anggaran));
            else {
                let ppn = 10 / (100 + 10) * pengeluaran.anggaran;
                this.model.nilaiPajak = ((pengeluaran.anggaran-this.model.PersentasePajak)*(this.model.PersentasePajak/100)); 
            }
            this.model.dppPajak = (pengeluaran.anggaran - this.model.nilaiPajak).toFixed(3);  
            this.model.nilaiPajak = this.model.nilaiPajak.toFixed(3)

        }
    }

    setPajakOnClick(){
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let pengeluaran = sourceData.find(c => c.code == this.model.No_Bukti)

        if(pengeluaran && this.potongan){
            if(this.potongan.code != '7.1.1.04.')
                this.model.Nilai_SPPPot = ((this.model.PersentasePajak / (100+this.model.PersentasePajak) * pengeluaran.anggaran));
            else {
                let ppn = 10 / (100 + 10) * pengeluaran.anggaran;
                this.model.Nilai_SPPPot = ((pengeluaran.anggaran-this.model.PersentasePajak)*(this.model.PersentasePajak/100)); 
            }
            this.model.dppPajak =  (pengeluaran.anggaran - this.model.Nilai_SPPPot).toFixed(3); 
            this.model.Nilai_SPPPot = this.model.Nilai_SPPPot.toFixed(3) 
        }
    }
}