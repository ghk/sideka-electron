import { remote } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { PersistablePage } from '../pages/persistablePage';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import PageSaver from '../helpers/pageSaver';

import schemas from '../schemas';
import SumCounterPenerimaan from "../helpers/sumCounterPenerimaan";
import TableHelper from '../helpers/table';
import titleBar from '../helpers/titleBar';

import * as $ from 'jquery';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
window['jQuery'] = $;

var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var bootstrap = require('./node_modules/bootstrap/dist/js/bootstrap.js');

const CATEGORY = [{
    name: "penerimaan",
    fields: [
        ['No_Bukti', 'Uraian', '', '', 'Tgl_Bukti', 'Nm_Penyetor', 'Alamat_Penyetor', 'TTD_Penyetor', 'NoRek_Bank', 'Nama_Bank'], ['Kd_Rincian', 'Nama_Obyek', 'Nilai', 'SumberDana']
    ],
    current: { fieldName: 'No_Bukti', value: '' }
}, {
    name: "penyetoran",
    fields: [
        ['No_Bukti', 'Uraian', '', 'Tgl_Bukti', 'NoRek_Bank', 'Nama_Bank'],
        ['No_TBP', 'Uraian_Rinci', 'Nilai']
    ],
    current: { fieldName: 'No_Bukti', value: '' }
}, {
    name: "swadaya",
    fields: [
        ['No_Bukti', 'Uraian', '', '', 'Tgl_Bukti', 'Nm_Penyetor', 'Alamat_Penyetor', 'TTD_Penyetor'], ['Kd_Rincian', 'Nama_Obyek', 'Nilai', 'SumberDana', '', '', '', '', 'Kd_Keg', 'Nama_Kegiatan']
    ],
    current: { fieldName: 'No_Bukti', value: '' }
}];

const FIELD_WHERE = {
    Ta_TBP: ['Tahun', 'Kd_Desa', 'No_Bukti'],
    Ta_TBPRinci: ['Tahun', 'Kd_Desa', 'No_Bukti', 'Kd_Rincian', 'Kd_Keg'],
    Ta_STS: ['Tahun', 'Kd_Desa', 'No_Bukti'],
    Ta_STSRinci: ['Tahun', 'Kd_Desa', 'No_Bukti', 'No_TBP']
}

@Component({
    selector: 'penerimaan',
    templateUrl: 'templates/penerimaan.html',
})

export default class PenerimaanComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    activeSheet: string;
    sheets: any;
    messageIsExist: string;
    isExist: boolean;

    initialDatasets: any = {};
    hots: any = {};
    activeHot: any;

    contentSelection: any = {};
    dataReferences: any = {};
    desa: any = {};
    rinciansTBP: any[] = [];

    diffTracker: DiffTracker;
    diffContents: any = {};

    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};

    progress: Progress;
    progressMessage: string;

    documentKeyupListener: any;
    afterRemoveRowHook: any;
    afterChangeHook: any;

    pageSaver: PageSaver;
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
    }

    ngOnInit(): void {
        titleBar.title("Data Keuangan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        let me = this;
        this.modalSaveId = 'modal-save-diff';
        this.activeSheet = 'penerimaanBank';
        this.sheets = [ 'penerimaanBank', 'penerimaanTunai', 'penyetoran', 'swadaya'];
        this.pageSaver.bundleData = { "penerimaanTunai": [], "penerimaanBank": [], "penyetoran": [], "swadaya": [] };
        this.pageSaver.bundleSchemas = { 
            "penerimaanTunai": schemas.penerimaan,
            "penerimaanBank": schemas.penerimaan, 
            "penyetoran": schemas.penyetoran, 
            "swadaya": schemas.swadaya 
        };
        this.diffContents = { diff: [], total: 0 };

        document.addEventListener('keyup', this.keyupListener, false);
        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-' + sheet);
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
        });

        let isValidDB = this.checkSiskeudesDB();
        if (!isValidDB)
            return;

        this.siskeudesService.getTaDesa(null, details => {
            this.desa = details[0];
            this.getContents('penerimaanTunai', data => {
                this.activeHot = this.hots.penerimaanTunai;
                this.activeHot.loadData(data);
                this.activeHot.sumCounter.calculateAll();
                

                setTimeout(function () {
                    me.initialDatasets['penerimaanTunai'] = me.getSourceDataWithSums('penerimaanTunai').map(c => c.slice());                   
                    me.activeHot.render();
                }, 500);

                this.getReferences('rincianTBP', data => {
                    me.dataReferences['rincianTBP'] = data;
                    me.getAllContent(results => {
                        me.sheets.forEach(sheet => {
                            if (sheet == 'penerimaanTunai')
                                return;

                            let hot = me.hots[sheet];
                            me.initialDatasets[sheet]
                            hot.loadData(results[sheet]);
                            hot.sumCounter.calculateAll();

                            setTimeout(function () {
                                me.initialDatasets[sheet] = me.getSourceDataWithSums(sheet).map(c => c.slice());
                            }, 100);
                        });
                    });
                    this.progressMessage = 'Memuat data';
                    
                    this.pageSaver.getContent('penerimaan', this.desa.tahun, this.progressListener.bind(this), 
                        (err, notifications, isSyncDiffs, data) => {
                            this.dataApiService.writeFile(data, this.sharedService.getPenerimaanFile(), null);
                    });
                });
                
            });
        })
    }

    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        for (let key in this.hots) {
            if (this.afterChangeHook)
                this.hots[key].removeHook('afterChange', this.afterChangeHook);
            if (this.afterRemoveRowHook)
                this.hots[key].removeHook('afterRemoveRow', this.afterRemoveRowHook);
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

        return result
    }

    onResize(event): void {
        let that = this;
        this.activeHot = this.hots[this.activeSheet];
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }

    forceQuit(): void {
        $('#modal-save-diff').modal('hide');
        this.router.navigateByUrl('/');
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            this.router.navigateByUrl('/');
        else if (this.afterSaveAction == "quit")
            remote.app.quit();
    }

    getAllContent(callback) {
        let results = {};
        this.getContents('penerimaanTunai', penerimaanTunai => {
            results['penerimaanTunai'] = penerimaanTunai;

            this.getContents('penerimaanBank', penerimaanBank => {
                results['penerimaanBank'] = penerimaanBank;

                this.getContents('penyetoran', penyetoran => {
                    results['penyetoran'] = penyetoran;

                    this.getContents('swadaya', swadaya => {
                        results['swadaya'] = swadaya;
                        callback(results);
                    })
                })
            })
        })
    }

    getContents(sheet, callback) {
        let results;
        switch (sheet) {
            case "penerimaanTunai":
                this.siskeudesService.getPenerimaan(1, data => {
                    results = this.transformData(sheet, data);
                    callback(results);
                });
                break;

            case "penerimaanBank":
                this.siskeudesService.getPenerimaan(2, data => {
                    results = this.transformData(sheet, data);
                    callback(results);
                });
                break;

            case 'penyetoran':
                this.siskeudesService.getPenyetoran(data => {
                    results = this.transformData(sheet, data);
                    callback(results);
                })
                break;

            case 'swadaya':
                this.siskeudesService.getPenerimaan(3, data => {
                    results = this.transformData(sheet, data);
                    callback(results);
                });
                break;
        }
    }

    saveContentToServer() {
        this.sheets.forEach(sheet => {
            this.pageSaver.bundleData[sheet] = this.hots[sheet].getSourceData();
        });

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent('penerimaan', this.desa.tahun, false, this.progressListener.bind(this), 
        (err, data) => {
            if(err)
                this.toastr.error(err);
            else
                this.toastr.success('Data berhasil disimpan ke server');

            this.dataApiService.writeFile(data, this.sharedService.getPenerimaanFile(), null);
        });
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

    createSheet(sheetContainer, sheet): any {
        let me = this;
        sheet = (sheet == 'penerimaanTunai' || sheet == 'penerimaanBank') ? 'penerimaan' : sheet;

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

        result.sumCounter = new SumCounterPenerimaan(result, sheet);
        this.afterRemoveRowHook = () => {
            result.sumCounter.calculateAll();
            result.render();
        }
        result.addHook('afterRemoveRow', this.afterRemoveRowHook);

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

                    if (me.activeSheet == 'penerimaanTunai') {
                        let id = result.getDataAtCell(row, 0);
                        if (me.initialDatasets['penyetoran']) {
                            let TBPCode = id.split('_')[0];
                            let sourceData = me.hots.penyetoran.getSourceData().map(c => schemas.arrayToObj(c, schemas.penyetoran));
                            let content = sourceData.find(c => c.Code == TBPCode)

                            if (content) {
                                me.toastr.error('Nomor TBP tidak dapat di edit ini karene sudah di Setorkan', '');
                                me.stopLooping = true;
                                result.setDataAtCell(row, col, prevValue);
                                return;
                            }
                        }
                        else {
                            me.getContents('penyetoran', data => {
                                let TBPCode = id.split('_')[0];
                                let sourceData = data.map(c => schemas.arrayToObj(c, schemas.penyetoran));
                                let content = sourceData.find(c => c.Code == TBPCode)

                                if (content) {
                                    me.toastr.error('Nomor TBP tidak dapat di edit ini karene sudah di Setorkan', '');
                                    me.stopLooping = true;
                                    result.setDataAtCell(row, col, prevValue);
                                    return;
                                }
                            })
                        }
                        rerender = true;
                    }
                    if (col == 3) {
                        rerender = true;
                    }

                    if (col == 5) {
                        let year = moment(value, "DD-MM-YYYY").year()

                        if (me.desa.Tahun < year) {
                            me.toastr.error('Tahun Tidak Boleh Melebihi Tahun Anggaran', '');
                            result.setDataAtCell(row, col, prevValue);
                            me.stopLooping = true;
                            return;
                        }
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

    transformData(sheet, source): any[] {
        let results = [];
        let currentFields = (sheet == 'penerimaanTunai' || sheet == 'penerimaanBank') ?
            CATEGORY.find(c => c.name == 'penerimaan') : CATEGORY.find(c => c.name == sheet);

        CATEGORY.map(c => c.current.value = '');

        source.forEach(content => {
            currentFields.fields.forEach(fields => {
                let row = [];
                let currentParent = currentFields.current;

                fields.forEach(f => {
                    let value = (content[f]) ? content[f] : '';
                    row.push(value);
                })

                if (fields.indexOf(currentParent.fieldName) !== -1) {
                    if (currentParent.value != content[currentParent.fieldName]) {
                        let id = content.No_Bukti;
                        row.splice(0, 0, id);
                        results.push(row);
                    }

                    if (row.filter(c => c != "").length == 0)
                        return;

                    currentParent.value = content[currentParent.fieldName];
                }
                else {
                    let id = '';

                    if (this.activeSheet == 'penyetoran')
                        id = `${content.No_Bukti}_${content.No_TBP}`;
                    else
                        id = `${content.No_Bukti}_${content.Kd_Rincian}`;

                    if (row.filter(c => c != "").length == 0)
                        return;

                    row.splice(0, 0, id);
                    results.push(row);
                }
            })
        })
        return results;
    }

    selectTab(sheet): void {
        let me = this;
        this.isExist = false;
        this.activeSheet = sheet;
        this.activeHot = this.hots[sheet];

        if (sheet == 'swadaya') {
            this.getReferences('kegiatan', data => { })
        }

        setTimeout(function () {
            me.activeHot.render();
        }, 500);
    }

    saveContent(): void {
        let me = this;
        let diff = this.getDiffContents();
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };

        $('#modal-save-diff').modal('hide');
        let requiredCol = { Kd_Desa: this.desa.Kd_Desa, Tahun: this.desa.Tahun };
        let diffSheets = [];

        this.sheets.forEach(sheet => {
            let hot = this.hots[sheet];
            let extraCol = {};
            hot.sumCounter.calculateAll();

            let sourceData = this.getSourceDataWithSums(sheet);
            let initialDataset = this.initialDatasets[sheet];
            let typeSheet = (sheet == 'penerimaanBank' || sheet == 'penerimaanTunai') ? 'penerimaan' : sheet;
            let diffcontent = this.trackDiffs(initialDataset, sourceData);

            if(sheet !== 'penyetoran'){
                extraCol = { Ref_Bayar: null, Nm_Bendahara: null, Jbt_Bendahara: null, Status: null};

                if(sheet != 'penerimaanBank')
                    Object.assign(extraCol, { NoRek_Bank: '-', Nama_Bank:'-'} );
            }

            this.pageSaver.bundleData[sheet] = sourceData;
            if (diffcontent.total < 1)
                return;
            diffSheets.push(sheet);

            diffcontent.added.forEach(content => {
                let row = schemas.arrayToObj(content, schemas[typeSheet]);
                let result = this.getExtraColumns(hot, row, sheet);
                let data = Object.assign(row, requiredCol, result.data, extraCol);

                bundleData.insert.push({ [result.table]: data })
            });

            diffcontent.modified.forEach(content => {
                let res = { whereClause: {}, data: {} }
                let row = schemas.arrayToObj(content, schemas[typeSheet]);
                let result = this.getExtraColumns(hot, row, sheet);
                let data = Object.assign(row, requiredCol, result.data, extraCol);

                FIELD_WHERE[result.table].forEach(c => {
                    res.whereClause[c] = data[c];
                });

                res.data = this.sliceObject(data, FIELD_WHERE[result.table]);
                bundleData.update.push({ [result.table]: res })
            });

            diffcontent.deleted.forEach(content => {
                let res = { whereClause: {}, data: {} }
                let row = schemas.arrayToObj(content, schemas[typeSheet]);
                let result = this.getExtraColumns(hot, row, sheet);
                let data = Object.assign(row, requiredCol, result.data, extraCol);


                FIELD_WHERE[result.table].forEach(c => {
                    res.whereClause[c] = data[c];
                });

                res.data = this.sliceObject(data, FIELD_WHERE[result.table]);
                bundleData.delete.push({ [result.table]: res })
            });
        });

        this.siskeudesService.saveToSiskeudesDB(bundleData, null, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Ke Database berhasil', '');
                this.saveContentToServer();

                this.getAllContent(data => {
                    this.sheets.forEach(sheet => {
                        let hot = this.hots[sheet];
                        hot.loadData(data[sheet]);
                        hot.sumCounter.calculateAll();
                        this.initialDatasets[sheet] = this.getSourceDataWithSums(sheet).map(c => c.slice());
                    });

                    setTimeout(function () {
                        me.activeHot.render();
                    }, 300);
                })

            }
            else
                this.toastr.warning('Penyimapanan Ke Database gagal', '')
        })
    };

    getExtraColumns(hot, row, sheet) {
        let result = { table: '', data: {} }
        enum Sheets { penerimaanTunai = 1, penerimaanBank = 2, swadaya = 3 }

        if (sheet !== 'penyetoran') {
            if (row.Id.split('_').length == 1) {
                result.table = 'Ta_TBP'
                result.data['Jumlah'] = hot.sumCounter.sums[row.Code];
                result.data['No_Bukti'] = row.Code;
                result.data['KdBayar'] = Sheets[sheet];
                result.data['TTD_Penyetor'] = (row.TTD_Penyetor === "") ? null : row.TTD_Penyetor;
                result.data['Nm_Penyetor'] = (row.Nm_Penyetor === "") ? null : row.Nm_Penyetor;
                result.data['Alamat_Penyetor'] = (row.Alamat_Penyetor === "") ? null : row.Alamat_Penyetor;
            }
            else {
                let rincian = this.dataReferences.rincianTBP.find(c => c.Kd_Rincian == row.Code);

                result.table = 'Ta_TBPRinci'
                result.data['Kd_Rincian'] = row.Code;
                result.data['RincianSD'] = row.Code + rincian.SumberDana;
                result.data['SumberDana'] = row.SumberDana;
                result.data['No_Bukti'] = row.Id.split('_')[0];
                result.data['Kd_Keg'] = (sheet != 'swadaya') ? this.desa.Kd_Desa + '00.00.' : row.Kd_Keg;
            }
        }
        else {
            if (row.Id.split('_').length == 1) {
                result.table = 'Ta_STS';
                result.data['No_Bukti'] = row.Code;
                result.data['Jumlah'] = hot.sumCounter.sums[row.Code]
            }
            else {
                let sourceDataTBPTunai = this.hots['penerimaanTunai'].getSourceData().map(c => schemas.arrayToObj(c, schemas.penerimaan));
                let currentTBP = sourceDataTBPTunai.find(c => c.Code == row.Code);

                result.table = 'Ta_STSRinci';
                result.data['No_TBP'] = row.Code;
                result.data['No_Bukti'] = row.Id.split('_')[0];
                result.data['Uraian'] = currentTBP.Uraian;
            }
        }
        return result;
    }

    addRow(): void {
        let me = this;
        let position = 0;
        let data = this.model;
        let type = (this.activeSheet == 'penerimaanTunai' || this.activeSheet == 'penerimaanBank') ? 'penerimaan' : this.activeSheet;
        let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[type]));
        let content = [];

        if (data.Tgl_Bukti)
            data.Tgl_Bukti = moment(data.Tgl_Bukti, "YYYY-MM-DD").format('DD/MM/YYYY');

        if (this.activeSheet != 'penyetoran') {
            data.NoRek_Bank = (!data.NoRek_Bank || data.NoRek_Bank == '') ? '-' : data.NoRek_Bank;
            data.Nama_Bank = (!data.Nama_Bank || data.Nama_Bank == '') ? '-' : data.Nama_Bank;
            data.Id = (data.category == 'TBP') ? data.No_Bukti : data.No_Bukti + '_' + data.Kd_Rincian;


            position = sourceData.length;
            if (data.category == 'Rincian') {
                sourceData.forEach((c, i) => {
                    if (c.Id.startsWith(data.No_Bukti))
                        position = i + 1;
                })
                let rincian = this.dataReferences.rincianTBP.find(c => c.Kd_Rincian == data.Kd_Rincian);
                data.Nama_Obyek = rincian.Nama_Obyek;
                data.SumberDana = rincian.SumberDana;

                if (this.activeSheet == 'swadaya') {
                    let kegiatan = this.dataReferences['kegiatan'].find(c => c.Kd_Keg == data.Kd_Keg);
                    data.Nama_Kegiatan = kegiatan.Nama_Kegiatan
                }
            }
        }
        else {
            data.Id = (data.category == 'STS') ? data.No_Bukti : data.No_Bukti + '_' + data.No_TBP;

            if (data.category == 'Rincian') {
                sourceData.forEach((c, i) => {
                    if (c.Id.startsWith(data.No_Bukti))
                        position = i + 1;
                })
                let sourceDataTPBTunai = this.hots['penerimaanTunai'].getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
                let content = sourceDataTPBTunai.find(c => c.Code == data.No_TBP);

                data['Uraian_Rinci'] = content.Uraian
            }
        }

        let nameCategory = (this.activeSheet == 'penerimaanTunai' || this.activeSheet == 'penerimaanBank') ? 'penerimaan' : this.activeSheet;
        let currentCategory = CATEGORY.find(c => c.name == nameCategory);
        let fields = (data.category == 'TBP' || data.category == 'STS') ? currentCategory.fields[0] : currentCategory.fields[1];

        content.push(data.Id);
        fields.forEach(f => {
            (data[f] || data[f] == 0) ? content.push(data[f]) : content.push('');
        });

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length - 1, null, 'overwrite');

        let endColumn = (this.activeSheet == 'renstra') ? 2 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, null, null);

        setTimeout(function () {
            me.activeHot.sumCounter.calculateAll();
            me.activeHot.render();
        }, 300);
    }

    openAddRowDialog(): void {
        let sheet = (this.activeSheet == 'penerimaanBank' || this.activeSheet == 'penerimaanTunai') ? 'penerimaan' : this.activeSheet;

        this.model = {};
        this.model.category = (sheet == 'penerimaan' || sheet == 'swadaya') ? 'TBP' : 'STS';
        this.setDefaultvalue();
        this.getNumTBPOrSTS();
        $("#modal-add-" + sheet).modal("show");
    }

    getNumTBPOrSTS(): void {
        if (this.model.category == 'Rincian')
            return;

        if (this.activeSheet != 'penyetoran') {
            this.siskeudesService.getMaxNoTBP(data => {
                let fixLastNum = 0;
                let lastNumFromSheet = this.getLastNumFromSheet('TBP');

                if (data.length !== 0 && data[0].No_Bukti) {
                    let lastNumFromDB = data[0].No_Bukti.split('/')[0];
                    fixLastNum = (parseInt(lastNumFromDB) < lastNumFromSheet) ? lastNumFromSheet : parseInt(lastNumFromDB);
                }
                this.zone.run(() => {
                    this.model.No_Bukti = this.getNextCode(fixLastNum);
                })
            })
        }
        else {
            this.siskeudesService.getMaxNoSTS(data => {
                let fixLastNum = 0;
                let lastNumFromSheet = this.getLastNumFromSheet('STS');
                let lastNumFromDB = (data[0].No_Bukti) ? data[0].No_Bukti.split('/')[0] : '0';

                fixLastNum = (parseInt(lastNumFromDB) < lastNumFromSheet) ? lastNumFromSheet : parseInt(lastNumFromDB);
                this.zone.run(() => {
                    this.model.No_Bukti = this.getNextCode(fixLastNum);
                })
            })
        }
    }

    getNextCode(lastNumber) {
        let kodeDesa = this.desa.Kd_Desa.slice(0, -1);
        let pad = '0000';
        let type = (this.activeSheet != 'penyetoran') ? 'TBP' : 'STS';
        let newNumber = (parseInt(lastNumber) + 1).toString();
        let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
        let result = stringNum + '/' + type + '/' + kodeDesa + '/' + this.desa.Tahun;
        return result;
    }

    getLastNumFromSheet(type) {
        let maxNumbers = [0];
        let sheets = ['penerimaanTunai', 'penerimaanBank', 'swadaya'];

        if (this.activeSheet == 'penyetoran')
            sheets = ['penyetoran'];

        sheets.forEach(sheet => {
            let hot = this.hots[sheet];
            let sourceData = hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
            let numbers = [0];

            if (sourceData.length == 0)
                return;

            sourceData.forEach(c => {
                if (c.Code.split('/').length == 4 && c.Code.search(type) != -1) {
                    let splitCode = c.Code.split('/');
                    numbers.push(parseInt(splitCode[0]));
                }
            })
            maxNumbers.push(Math.max.apply(null, numbers))
        });
        return Math.max.apply(null, maxNumbers);
    }

    addOneRow(): void {
        let isValidForm = this.validateForm();

        if (!isValidForm)
            return;

        this.addRow();
        let sheet = (this.activeSheet == 'penerimaanTunai' || this.activeSheet == 'penerimaanBank') ? 'penerimaan' : this.activeSheet;
        $("#modal-add-" + sheet).modal("hide");
    }

    addOneRowAndAnother(): void {
        let isValidForm = this.validateForm();

        if (!isValidForm)
            return;

        this.addRow();
        this.getNumTBPOrSTS();
    }

    categoryOnChange(value): void {
        this.model = {};
        this.model.category = value;
        this.getNumTBPOrSTS();
        this.setDefaultvalue();

        if (value !== 'Rincian')
            return;

        if (value == 'Rincian' && this.activeSheet != 'penyetoran') {
            this.contentSelection['kegiatan'] = [];
            let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
            this.contentSelection['TBPAvailable'] = sourceData.filter(c => c.Code.split('.').length != 5);

            if (this.activeSheet == 'swadaya') {
                this.zone.run(() => {
                    this.contentSelection['kegiatan'] = this.dataReferences.kegiatan;
                })
            }
        }
        else {
            this.contentSelection['STSAvailable'] = [];
            let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penyetoran));
            this.zone.run(() => {
                this.contentSelection['STSAvailable'] = sourceData.filter(c => c.Code.search('STS') !== -1);
            });
        }
    }

    selectedOnChange(selector): void {
        if (selector == '')
            return;
        let sheet = (this.activeSheet == 'penerimaanTunai' || this.activeSheet == 'penerimaanBank') ? 'penerimaan' : this.activeSheet;
        let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[sheet]));

        if (sheet == 'penerimaan' || sheet == 'swadaya') {
            if (sheet == 'swadaya' && selector == 'Kegiatan') {
                if (!this.model.Kd_Keg || this.model.Kd_Keg == 'null')
                    return;

                return;
            }

            if (!this.model.No_Bukti || this.model.No_Bukti == 'null')
                return;

            this.contentSelection['rincianTBP'] = [];
            let referencesRincian = this.dataReferences.rincianTBP.map(c => Object.assign({}, c))
            sourceData.forEach(c => {
                if (c.Id.startsWith(this.model.No_Bukti) && c.Id.split('_').length == 2) {
                    let index = referencesRincian.findIndex(r => c.Code == r.Kd_Rincian);
                    if (index != -1)
                        referencesRincian.splice(index, 1);
                }
            });
            this.contentSelection.rincianTBP = referencesRincian;
        }
        else {
            if (selector === 'Penerimaan') {
                if (!this.model.No_TBP || this.model.No_TBP == 'null')
                    return;

                let sums = this.hots['penerimaanTunai'].sumCounter.sums;
                this.model.Nilai = sums[this.model.No_TBP];
                return;
            }

            let results = [];
            let detailsPenyetoran = sourceData.find(c => c.Code == this.model.No_Bukti);
            let sourceDataTPBTunai = this.hots['penerimaanTunai'].getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
            let datePenyetoran = moment(detailsPenyetoran.Tgl_Bukti, "DD-MM-YYYY");

            sourceDataTPBTunai.forEach(c => {
                if (c.Id.split('_').length == 1) {
                    let content = sourceData.find(row => row.Code == c.Code);
                    if (!content) {
                        let datePenerimaan = moment(c.Tgl_Bukti, "DD-MM-YYYY");

                        if (datePenerimaan <= datePenyetoran)
                            results.push(c);
                    }
                }
            });
            this.contentSelection['TBPTunaiAvailable'] = results;
        }
    }

    getReferences(type, callback): void {
        switch (type) {
            case 'rincianTBP':
                this.siskeudesService.getRincianTBP(this.desa.Tahun, this.desa.Kd_Desa, data => {
                    callback(data)
                })
                break;
            case 'kegiatan':
                this.siskeudesService.getAllKegiatan(this.desa.Kd_Desa, data => {
                    this.dataReferences['kegiatan'] = data;
                    this.contentSelection['kegiatan'] = data;
                    callback(data)
                })
                break;
        }
    }

    setDefaultvalue() {
        let columns = [];

        if (this.model.category != 'Rincian')
            return;

        if (this.activeSheet == 'penyetoran')
            columns = ['No_Bukti', 'No_TBP'];
        else {
            columns = ['No_Bukti', 'Kd_Rincian'];

            if (this.activeSheet == 'swadaya')
                columns.push('Kd_Keg');
        }

        columns.forEach(c => {
            this.model[c] = '';
        })
    }

    getCurrentDiffs(): any {
        let res = {};
        let keys = Object.keys(this.initialDatasets);

        keys.forEach(key => {
            this.hots[key].sumCounter.calculateAll();
            let sourceData = this.getSourceDataWithSums(key);
            let initialData = this.initialDatasets[key];
            let diffs = this.diffTracker.trackDiff(initialData, sourceData);
            res[key] = diffs;
        });

        return res;   
    }

    trackDiffs(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    getDiffContents(): any {
        let res = { diffs: [], total: 0 };
        Object.keys(this.initialDatasets).forEach(sheet => {
            let hot = this.hots[sheet];
            hot.sumCounter.calculateAll();
            let sourceData = this.getSourceDataWithSums(sheet);
            let initialData = this.initialDatasets[sheet];
            let diffcontent = this.diffTracker.trackDiff(initialData, sourceData);

            if (diffcontent.total > 0) {
                res.diffs.push({ data: diffcontent, sheet: [sheet] })
                res.total += diffcontent.total;
            }
        })
        return res;
    }

    getSourceDataWithSums(sheet): any[] {
        let scheme = (sheet == 'penerimaanTunai' || sheet == 'penerimaanBank') ? 'penerimaan' : sheet;
        let data = this.hots[sheet].sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas[scheme]));
        return data
    }

    validateForm(): boolean {
        let fields = [];
        let result = true;

        if (this.activeSheet != 'penyetoran') {
            if (this.model.category == 'TBP') {
                let year = moment(this.model.Tgl_Bukti, 'YYYY-MM-DD').year()
                if (year != this.desa.Tahun) {
                    this.toastr.error('Tahun tidak sama dengan tahun anggaran', '')
                    result = false;
                }
                fields.push({
                    name: 'Nomor Bukti Penerimaan', field: 'No_Bukti'
                }, {
                        name: 'Tanggal Penerimaan', field: 'Tgl_Bukti'
                    }, {
                        name: 'Uraian Penerimaan', field: 'Uraian'
                    }, {
                        name: 'Nama Penyetor', field: 'Nm_Penyetor'
                    }, {
                        name: 'Alamat Penyetor', field: 'Alamat_Penyetor'
                    });
            }
            else {
                fields.push({
                    name: 'Nomor Bukti Penerimaan', field: 'No_Bukti'
                }, {
                        name: 'Rincian', field: 'Kd_Rincian'
                    }, {
                        name: 'Nilai Anggaran', field: 'Nilai'
                    });
                if (this.activeSheet == 'swadaya') {
                    fields.push({ name: 'Kegiatan', field: 'Kd_Keg' })
                }

            }
        }
        else {
            if (this.model.category == 'STS') {
                let year = moment(this.model.Tgl_Bukti, 'YYYY-MM-DD').year()
                if (year != this.desa.Tahun) {
                    this.toastr.error('Tahun tidak sama dengan tahun anggaran', '')
                    result = false;
                }
                fields.push({
                    name: 'Nomor Bukti Penyetoran', field: 'No_Bukti'
                }, {
                        name: 'Tanggal Penyetoran', field: 'Tgl_Bukti'
                    }, {
                        name: 'Uraian Penyetoran', field: 'Uraian'
                    }, {
                        name: 'No Rekening Bank', field: 'NoRek_Bank'
                    }, {
                        name: 'Nama Bank', field: 'Nama_Bank'
                    });
            }
            else {
                fields.push({
                    name: 'Nomor Bukti Penerimaan', field: 'No_Bukti'
                }, {
                        name: 'Nomor Penerimaan Tunai', field: 'No_TBP'
                    });

            }

        }

        fields.forEach(c => {
            if (this.model[c.field] == null || this.model[c.field] == "" || this.model[c.field] == 'null') {
                this.toastr.error(`${c.name} Tidak boleh Kosong`, ``);
                result = false;
            }
        })

        return result;
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