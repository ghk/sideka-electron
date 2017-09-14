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

import DataApiService from '../stores/dataApiService';
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

var pdf = require('html-pdf');
var dot = require('dot');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

const RENSTRA_FIELDS = {
    fields: [['ID_Visi', 'Visi', 'Uraian_Visi'], ['ID_Misi', 'Misi', 'Uraian_Misi'], ['ID_Tujuan', 'Tujuan', 'Uraian_Tujuan'], ['ID_Sasaran', 'Sasaran', 'Uraian_Sasaran']],
    currents: [{ fieldName: 'ID_Visi', value: '', lengthId: 0 }, { fieldName: 'ID_Misi', value: '', lengthId: 2 }, { fieldName: 'ID_Tujuan', value: '', lengthId: 4 }, { fieldName: 'ID_Sasaran', value: '', lengthId: 6 }]
}

const WHERECLAUSE_FIELD = {
    Ta_RPJM_Visi: ['ID_Visi'],
    Ta_RPJM_Misi: ['ID_Misi'],
    Ta_RPJM_Tujuan: ['ID_Tujuan'],
    Ta_RPJM_Sasaran: ['ID_Sasaran'],
    Ta_RPJM_Kegiatan: ['Kd_Keg'],
    Ta_RPJM_Pagu_Tahunan: ['Kd_Keg', 'Kd_Tahun']
}

enum Types { Visi = 0, Misi = 2, Tujuan = 4, Sasaran = 6 };
enum Tables { Ta_RPJM_Visi = 0, Ta_RPJM_Misi = 2, Ta_RPJM_Tujuan = 4, Ta_RPJM_Sasaran = 6 };

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
    dataReferences: any = {};
    newBidangs: any[] = [];

    diffTracker: DiffTracker;
    diffContents: any = {};

    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};

    progress: Progress;
    progressMessage: string;

    desa: any = {};
    reports: any = {};
    parameters: any[] = [];

    afterChangeHook: any;
    documentKeyupListener: any;
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

        let references = ['kegiatan', 'bidang', 'sasaran', 'sumberDana', 'rpjmBidang', 'rpjmKegiatan'];
        references.forEach(item => {
            this.dataReferences[item] = [];
        });

        this.documentKeyupListener = (e) => {
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
        document.addEventListener('keyup', this.documentKeyupListener, false);

        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-' + sheet);
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
        });

        this.routeSubscription = this.route.queryParams.subscribe(params => {           
            this.desa['ID_Visi'] = params['id_visi'];
            this.desa['Visi_TahunA'] = params['first_year'];
            this.desa['Visi_TahunN'] = params['last_year'];
            let kodeDesa = params['kd_desa'];

            this.siskeudesService.getTaDesa(kodeDesa, desa => {
                Object.assign(this.desa, desa[0]);
                let data = this.getContent('renstra').then( data => {
                    this.activeHot = this.hots.renstra;
                    this.activeHot.loadData(data);
                    this.initialDatasets['renstra'] = data.map(c => c.slice());

                    this.getAllContent().then(data => {
                        let keys = Object.keys(data);

                        keys.forEach(sheet => {
                            if (sheet == 'renstra')
                                return;

                            this.hots[sheet].loadData(data[sheet]);
                            this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
                        });

                        this.getReferences('sumberDana', data => {
                            let sumberdanaContent = data.map(c => c.Kode);

                            //tambahkan source dropdown pada kolom sumberdana di semua sheet rkp
                            this.sheets.forEach(sheet => {
                                if (!sheet.startsWith('rkp'))
                                    return;

                                let newSetting = schemas.rkp;
                                let hot = this.hots[sheet];

                                let sumberdanaColumn = newSetting.find(c => c.field == 'Kd_Sumber')
                                sumberdanaColumn.source = sumberdanaContent;

                                hot.updateSettings({ columns: newSetting });
                            });
                        })

                        this.getReferences('Pemda', data => {
                            Object.assign(desa, data[0]);
                        })

                        this.progressMessage = 'Memuat data';

                        this.pageSaver.getContent('perencanaan', this.desa.tahun, this.progressListener.bind(this), 
                            (err, notifications, isSyncDiffs, data) => {
                                this.dataApiService.writeFile(data, this.sharedService.getPerencanaanFile(), null);
                        });
                    });

                    setTimeout(function () {
                        me.activeHot.render();
                    }, 300);
                });
            });
        });
    }

    ngOnDestroy(): void {
        if (this.documentKeyupListener)
            document.removeEventListener('keyup', this.documentKeyupListener, false);
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

    async getContent(sheet): Promise<any> {
        let results;
        switch (sheet) {
            case "renstra":
                RENSTRA_FIELDS.currents.map(c => c.value = '');
                var data = await this.siskeudesService.getRenstraRPJM(this.desa.ID_Visi, this.desa.Kd_Desa, this.desa.Tahun);
                results = this.transformData(data);
                return results;

            case "rpjm":
                var data = await this.siskeudesService.getRPJM(this.desa.Kd_Desa);
                results = data.map(o => {
                    let data = schemas.objToArray(o, schemas.rpjm)
                    data[0] = `${o.Kd_Bid}_${o.Kd_Keg}`
                    return data;
                });
                return results;

            default:
                let indexRKP = sheet.match(/\d+/g)[0];
                var data = await this.siskeudesService.getRKPByYear(this.desa.Kd_Desa, indexRKP);
                if (data.length == 0) {
                    results = [];
                }
                else {
                    results = data.map(o => {
                        let data = schemas.objToArray(o, schemas.rkp)
                        data[0] = `${o.Kd_Bid}_${o.Kd_Keg}`
                        return data;
                    });
                }
                return results;
        };
    }

    async getAllContent(): Promise<any> {
        let results = {};

        results["renstra"] = await this.getContent('renstra');
        results["rpjm"] =  await this.getContent('rpjm');
        results["rkp1"] = await this.getContent('rkp1');
        results["rkp2"] = await this.getContent('rkp2');
        results["rkp3"] = await this.getContent('rkp3');
        results["rkp4"] = await this.getContent('rkp4');
        results["rkp5"] = await this.getContent('rkp5');
        results["rkp6"] = await this.getContent('rkp6');

        return results;
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

    transformData(source): any[] {
        let results = [];
        RENSTRA_FIELDS.currents.map(c => c.value = "");
        source.forEach(content => {
            RENSTRA_FIELDS.fields.forEach((field, idx) => {
                let res = [];
                let current = RENSTRA_FIELDS.currents[idx];
                let valueNulled = false;

                for (let i = 0; i < field.length; i++) {
                    let value = content[field[i]]

                    if (!value && value !== "") {
                        if (value === null) { valueNulled = true; break; }
                    }
                    let data = (content[field[i]] || content[field[i]] == "") ? content[field[i]] : field[i];
                    res.push(data)
                }

                if (valueNulled) return;
                if (current.value !== content[current.fieldName]) results.push(res);

                current.value = content[current.fieldName];
            })

        })

        return results;
    }

    saveContent(): void {
        let isRKPSheet = false;
        let me = this;
        $('#modal-save-diff')['modal']('hide');

        let requiredCol = { Kd_Desa: this.desa.Kd_Desa, Tahun: this.desa.Tahun }
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };

        this.sheets.forEach(sheet => {
            let initialDataset = this.initialDatasets[sheet];
            let hot = this.hots[sheet];
            let sourceData = hot.getSourceData();

            this.pageSaver.bundleData[sheet] = sourceData;

            let diff = this.trackDiffs(initialDataset, sourceData);
            if (diff.total == 0)
                return;

            if (sheet == 'renstra') {
                diff.added.forEach(content => {
                    let result = this.bundleArrToObj(content);

                    Object.assign(result.data, requiredCol);
                    bundleData.insert.push({ [result.table]: result.data });
                });

                diff.modified.forEach(content => {
                    let res = { whereClause: {}, data: {} }
                    let results = this.bundleArrToObj(content);

                    Object.assign(results.data, requiredCol);

                    WHERECLAUSE_FIELD[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = this.sliceObject(results.data, WHERECLAUSE_FIELD[results.table]);
                    bundleData.update.push({ [results.table]: res })
                });

                diff.deleted.forEach(content => {
                    let results = this.bundleArrToObj(content);
                    let res = { whereClause: {}, data: {} };

                    WHERECLAUSE_FIELD[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = this.sliceObject(results.data, WHERECLAUSE_FIELD[results.table]);
                    bundleData.delete.push({ [results.table]: res });
                });
            }
            else {
                let unique = Array.from(new Set(this.newBidangs));
                let table = (sheet == 'rpjm') ? 'Ta_RPJM_Kegiatan' : 'Ta_RPJM_Pagu_Tahunan';
                let schema = (sheet == 'rpjm') ? 'rpjm' : 'rkp';

                if (sheet.startsWith('rkp')) {
                    let indexRKP = sheet.match(/\d+/g);
                    requiredCol['Kd_Tahun'] = `THN${indexRKP}`;
                    isRKPSheet = true;
                }

                if (sheet == 'rpjm') {
                    unique.forEach(c => {
                        let tableBidang = 'Ta_RPJM_Bidang';
                        let data = this.dataReferences['bidang'].find(o => o.Kd_Bid == c.substring(this.desa.Kd_Desa.length));

                        Object.assign(data, requiredCol, { Kd_Bid: c });
                        bundleData.insert.push({ [tableBidang]: data });
                    });
                }

                diff.added.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[schema]);
                    let ID_Keg = data.Kd_Keg.substring(this.desa.Kd_Desa.length);
                    data = this.valueNormalizer(data, true);

                    Object.assign(data, requiredCol, { ID_Keg: ID_Keg });
                    bundleData.insert.push({ [table]: data });
                });

                diff.modified.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[schema]);
                    let res = { whereClause: {}, data: {} }
                    let ID_Keg = data.Kd_Keg.substring(this.desa.Kd_Desa.length);
                    data = this.valueNormalizer(data, true);

                    if (sheet == 'rpjm' && !data['Keluaran'])
                        data['Keluaran'] = "";

                    Object.assign(data, requiredCol, { ID_Keg: ID_Keg })

                    WHERECLAUSE_FIELD[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = this.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    bundleData.update.push({ [table]: res });
                });

                diff.deleted.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[schema]);
                    let res = { whereClause: {}, data: {} };

                    WHERECLAUSE_FIELD[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = this.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    bundleData.delete.push({ [table]: res });
                });
            }
        });

        this.siskeudesService.saveToSiskeudesDB(bundleData, null, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan ke Database Berhasil!', '');
                this.saveContentToServer();

                this.getAllContent().then(data => {
                    let keys = Object.keys(data);

                    keys.forEach(sheet => {
                        this.hots[sheet].loadData(data[sheet]);
                        this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
                    });

                    if (isRKPSheet){
                        // jika terdapat sheet rkp yang di edit update sumberdana
                        this.updateSumberDana();
                    }
                    else
                        this.pageSaver.onAfterSave();

                    setTimeout(function () {
                        me.activeHot.render();
                    }, 300);
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

    bundleArrToObj(content): any {
        let result = {};
        let code = content[0].substring(this.desa.ID_Visi.length);
        let table = Tables[code.length];
        let field = RENSTRA_FIELDS.fields.find(c => c[1] == content[1])
        let data = this.arrayToObj(content.slice(0, field.length), field);
        let codes = this.parsingCode(content[0]);

        Object.assign(data, codes);
        return { table: table, data: data }
    }

    parsingCode(codeSource): any {
        let fields = ['ID_Visi', 'ID_Misi', 'ID_Tujuan', 'ID_Sasaran'];
        let code = codeSource.substring(this.desa.ID_Visi.length);
        let type = Types[code.length];

        let posField = fields.indexOf('ID_' + type)
        let results = {};

        fields.slice(posField - 1, posField).forEach(field => {
            let endSlice = Types[field.split('_')[1]]
            results[field] = this.desa.ID_Visi + code.slice(0, parseInt(endSlice))
        });

        results['No_' + type] = (type == 'Visi') ? this.desa.ID_Visi.substring(this.desa.Kd_Desa.length).slice(0, -1) : code.slice(-2);
        return results;
    }

    addRow(model): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let lastRow;
        let me = this;
        let position = 0;
        let data = this.valueNormalizer(model, false);
        let content = []
        let sourceData = this.activeHot.getSourceData();

        if (this.isExist)
            return;

        switch (sheet) {
            case 'renstra':
                let lastCode;
                if (data['category'] == 'Misi') {
                    let sourDataFiltered = sourceData.filter(c => {
                        if (c[0].replace(this.desa.ID_Visi, '').length == 2) return c;
                    });
                    if (sourDataFiltered.length !== 0)
                        lastCode = sourDataFiltered[sourDataFiltered.length - 1][0];
                    else
                        lastCode = this.desa.ID_Visi + '00';
                    position = sourceData.length;
                }

                if (data['category'] != 'Misi') {
                    let code = ((data['category'] == 'Tujuan') ? data['Misi'] : data['Tujuan']).replace(this.desa.ID_Visi, '');

                    sourceData.forEach((content, i) => {
                        let value = content[0].replace(this.desa.ID_Visi, '');

                        if (value.length == code.length + 2 && value.startsWith(code))
                            lastCode = content[0];

                        if (value.startsWith(code))
                            position = i + 1;
                    });

                    if (!lastCode) {
                        lastCode = (data['category'] == 'Tujuan') ? data['Misi'] + '00'
                            : (data['category'] == 'Misi') ? '00'
                                : data['Tujuan'] + '00';
                    }
                }

                let newDigits = ("0" + (parseInt(lastCode.slice(-2)) + 1)).slice(-2);
                let newCode = lastCode.slice(0, -2) + newDigits;

                content = [newCode, data['category'], data['uraian']];
                break;

            case 'rpjm':
            case 'rkp':
                let sourceObj = sourceData.map(a => schemas.arrayToObj(a, schemas[sheet]));
                let isNewBidang = true;

                sourceObj.forEach((content, i) => {
                    if (data['Kd_Bid'] == content.Kd_Bid)
                        isNewBidang = false;

                    if (data['Kd_Keg'] > content.Kd_Keg)
                        position = position + 1;
                });

                if (isNewBidang && sheet == 'rpjm')
                    this.newBidangs.push(data['Kd_Bid']);

                let res = this.completedRow(data, sheet);
                content = schemas.objToArray(res, schemas[sheet]);
                break;
        }

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length, null, 'overwrite');

        let endColumn = (this.activeSheet == 'renstra') ? 2 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, null, null);
    }

    completedRow(data, type): any {
        let checkBox = ['Tahun1', 'Tahun2', 'Tahun3', 'Tahun4', 'Tahun5', 'Tahun6', 'Swakelola', 'Kerjasama', 'Pihak_Ketiga'];

        if (type == 'rpjm') {
            //menambahkan property yang false
            checkBox.forEach(c => {
                if (data[c])
                    return;
                else
                    data[c] = false;
            });

            if (data.Kd_Sas)
                data['Uraian_Sasaran'] = this.dataReferences.sasaran.find(c => c.ID_Sasaran == data.Kd_Sas).Uraian_Sasaran;

            data['Nama_Kegiatan'] = this.dataReferences.kegiatan.find(c => c.ID_Keg == data.Kd_Keg.substring(this.desa.Kd_Desa.length)).Nama_Kegiatan;
            data['Nama_Bidang'] = this.dataReferences.bidang.find(c => c.Kd_Bid == data.Kd_Bid.substring(this.desa.Kd_Desa.length)).Nama_Bidang;
        }
        else {
            data['Nama_Kegiatan'] = this.dataReferences.rpjmKegiatan.find(c => c.Kd_Keg == data.Kd_Keg).Nama_Kegiatan;
            data['Nama_Bidang'] = this.dataReferences.rpjmBidang.find(c => c.Kd_Bid == data.Kd_Bid).Nama_Bidang;
        }

        data['id'] = `${data.Kd_Bid}_${data.Kd_Keg}`

        return data
    }

    openAddRowDialog(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        this.isExist = false;
        this.model = {};
        this.setDefaultvalue();

        let selected = this.activeHot.getSelected();
        let category = "Misi";

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
        if (category !== 'Misi') 
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
                value = value.substring(this.desa.Kd_Desa.length);
                content = this.dataReferences['kegiatan'];

                this.contentSelection['kegiatan'] = content.filter(c => c.Kd_Bid == value);
                break;
            case 'bidangRKP':
                content = this.dataReferences['rpjmKegiatan'];
                this.contentSelection['kegiatan'] = content.filter(c => c.Kd_Keg.startsWith(value) && c.Kd_Keg.split('.').length == 5);
                break;
        }
    }

    getReferences(type, callback): void {
        let sourceData;
        switch (type) {
            case 'kegiatan':
                this.siskeudesService.getRefKegiatan(data => {
                    this.dataReferences['kegiatan'] = data;
                    callback(data);
                })
                break;
            case 'bidang':
                this.siskeudesService.getRefBidang(data => {
                    this.dataReferences['bidang'] = data;
                    callback(data);
                })
                break;
            case 'sasaran':
                let fields = [{ field: 'ID_Sasaran' }, { field: 'Category' }, { field: 'Uraian_Sasaran' }];
                sourceData = this.hots['renstra'].getSourceData().map(c => schemas.arrayToObj(c, fields));
                this.dataReferences["sasaran"] = sourceData.filter(c => c.Category == 'Sasaran');
                callback(true)
                break;
            case 'sumberDana':
                this.siskeudesService.getRefSumberDana(data => {
                    this.dataReferences["sumberDana"] = data;
                    callback(data);
                })
                break;
            case 'RPJMBidAndKeg':
                sourceData = this.hots['rpjm'].getSourceData();
                let kegiatanResults = [];
                let bidangResults = [];

                for (let i = 0; i < sourceData.length; i++) {
                    let row = schemas.arrayToObj(sourceData[i], schemas.rpjm);
                    let currentBidang = bidangResults.find(c => c.Kd_Bid == row.Kd_Bid);

                    kegiatanResults.push({ Kd_Keg: row.Kd_Keg, Nama_Kegiatan: row.Nama_Kegiatan })
                    if (!currentBidang)
                        bidangResults.push({ Kd_Bid: row.Kd_Bid, Nama_Bidang: row.Nama_Bidang })

                }
                this.dataReferences['rpjmKegiatan'] = kegiatanResults;
                this.dataReferences['rpjmBidang'] = bidangResults;
                callback(true)
                break;
            case 'Pemda':
                this.siskeudesService.getTaPemda(data => {
                    callback(data);
                })
                break;
        }
    }

    selectTab(type): void {
        let that = this;
        this.isExist = false;
        this.activeSheet = type;
        this.activeHot = this.hots[type];

        if (type.startsWith('rpjm')) {
            this.getReferences('kegiatan', () => {
                this.getReferences('bidang', () => {
                    this.getReferences('sasaran', () => { })
                })
            })
        }
        else if (type.startsWith('rkp')) {
            this.getReferences('RPJMBidAndKeg', () => { })
        }

        setTimeout(function () {
            that.activeHot.render();
        }, 500);
    }

    setDefaultvalue() {
        this.contentSelection = {};
        switch (this.activeSheet) {
            case 'renstra':
                this.model.Misi = null;
                this.model.Tujuan = null;
                break;
            case 'rpjm':
                this.model.Kd_Bid = null;
                this.model.Kd_Keg = null;
                this.model.Kd_Sas = null;
                break;
            default:
                this.model.Kd_Bid = null;
                this.model.Kd_Keg = null;
                this.model.Kd_Sumber = null;
                this.model.Biaya = 0;
                this.model.Jml_Sas_ARTM = 0;
                this.model.Jml_Sas_Pria = 0;
                this.model.Jml_Sas_Wanita = 0;
                this.model.Volume = 0;
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
            let requiredColumn = { Tujuan: ['Misi'], Sasaran: ['Misi', 'Tujuan'] }
            if (category == 'Misi')
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
            let requiredColumn = ['Kd_Bid', 'Kd_Keg'];

            for (let i = 0; i < requiredColumn.length; i++) {
                if (data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null') {
                    result = true;
                    break;
                }
            }
            return result;
        }
        else if (this.activeSheet.startsWith('rkp')) {
            let requiredColumn = ['Kd_Bid', 'Kd_Keg', 'Kd_Sumber', 'Mulai', 'Selesai'];

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
        this.messageIsExist = message;

        if (sourceData.length < 1)
            this.isExist = false;

        for (let i = 0; i < sourceData.length; i++) {
            if (sourceData[i].Kd_Keg == value) {
                this.zone.run(() => {
                    this.isExist = true;
                })
                break;
            }
            this.isExist = false;
        }
    }

    validateDate() {
        if (this.model.Mulai != "" && this.model.Selesai != "") {
            let mulai = moment(this.model.Mulai, "DD/MM/YYYY").format();
            let selesai = moment(this.model.Selesai, "DD/MM/YYYY").format();

            if (mulai > selesai)
                return true;
            return false
        }
    }

    valueNormalizer(model, isSave): any {
        Object.keys(model).forEach(val => {
            if (model[val] == null || model[val] === undefined)
                model[val] = '';
        })
        return model;
    }

    //REVIEW: ini daripada gini mending langsung jadi field aja SheetAliases = {}, dipanggil langssung SheetAlieases['renstra'];
    sheetAliases(sheet) {
        let aliases = { renstra: 'RENSTRA', rpjm: 'RPJM', rkp1: 'RKP 1', rkp2: 'RKP 2', rkp3: 'RKP 3', rkp4: 'RKP 4', rkp5: 'RKP 5', rkp6: 'RKP 6' }
        return aliases[sheet];
    }
}
