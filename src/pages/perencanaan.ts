import { remote } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';

import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var path = require('path');
var jetpack = require('fs-jetpack');
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var base64 = require('uuid-base64');

window['jQuery'] = $;
var bootstrap = require('./node_modules/bootstrap/dist/js/bootstrap.js');

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

export default class PerencanaanComponent {
    activeSheet: string;
    sheets: any;

    idVisi: string;
    tahunAnggaran: string;
    sub: any;

    messageIsExist: string;
    isExist: boolean;

    initialDatasets: any = {};
    hots: any = {};
    activeHot: any;
    bundleSchemas: any;
    bundleData: any;

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

    desaDetails: any = {};
    temp = {};

    constructor(
        private dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private sharedService: SharedService,
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

    ngOnInit() {
        titleBar.title("Data Perencanaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
        
        let me = this;
        this.isExist = false;
        this.activeSheet = 'renstra';
        this.sheets = ['renstra', 'rpjm', 'rkp1', 'rkp2', 'rkp3', 'rkp4', 'rkp5', 'rkp6']; 
        this.bundleData = { "renstra": [], "rpjm": [], "rkp1": [], "rkp2": [], "rkp3": [], "rkp4": [], "rkp5": [], "rkp6": []};       
        this.bundleSchemas = { 
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

        document.addEventListener('keyup', (e) => {
            if (e.ctrlKey && e.keyCode === 83) {
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.ctrlKey && e.keyCode === 80) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);

        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-' + sheet);
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
        });

        this.sub = this.route.queryParams.subscribe(params => {
            this.idVisi = params['id_visi'];
            let kodeDesa = params['kd_desa'];
        
            this.siskeudesService.getTaDesa(kodeDesa, desa => {
                this.desaDetails = desa[0];
                this.getContent('renstra', data => {
                    this.activeHot = this.hots.renstra;
                    this.activeHot.loadData(data);
                    this.initialDatasets['renstra'] = data.map(c => c.slice());

                    this.getAllContent(data => {                        
                        let keys = Object.keys(data);
                        
                        keys.forEach(sheet => {
                            if(sheet == 'renstra')
                                return;

                            this.hots[sheet].loadData(data[sheet]);
                            this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
                        })
                        this.getContentFromServer();
                    });  

                    setTimeout(function () {
                        me.activeHot.render();                                              
                    }, 300);
                });
            }); 
        });
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    onResize(event): void {
        let that = this;
        this.activeHot = this.hots[this.activeSheet];
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }

    redirectMain() {
        let diff = this.getDiffContents();
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
            document.location.href = "app.html";
        else if (this.afterSaveAction == "quit")
            remote.app.quit();
    }

    getContent(sheet, callback) {
        let results;
        switch (sheet) {
            case "renstra":
                RENSTRA_FIELDS.currents.map(c => c.value = '');
                this.siskeudesService.getRenstraRPJM(this.idVisi,this.desaDetails.Kd_Desa, this.desaDetails.Tahun, data => {
                    results = this.transformData(data);
                    callback(results);
                });
                break;

            case "rpjm":
                this.siskeudesService.getRPJM(this.desaDetails.Kd_Desa, data => {
                    let references = ['kegiatan', 'bidang', 'sasaran',]

                    results = data.map(o => {
                        let data = schemas.objToArray(o, schemas.rpjm)
                        data[0] = `${o.Kd_Bid}_${o.Kd_Keg}`
                        return data;
                    });
                    callback(results);
                });
                break;

            default:
                let indexRKP = sheet.match(/\d+/g)[0];
                this.siskeudesService.getRKPByYear(this.desaDetails.Kd_Desa, indexRKP, data => {
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
                    callback(results);
                });
                break;
        };
    }

    getAllContent(callback){
        let results = {};
        this.getContent('renstra', renstraData =>{
            results['renstra'] = renstraData;

            this.getContent('rpjm', rpjmData =>{
                results['rpjm'] = rpjmData;
                
                this.getContent('rkp1', rkp1Data => {
                    results['rkp1'] = rkp1Data; 

                    this.getContent('rkp2', rkp2Data => {
                        results['rkp2'] = rkp2Data; 

                        this.getContent('rkp3', rkp3Data => {
                            results['rkp3'] = rkp3Data; 

                            this.getContent('rkp4', rkp4Data => {
                                results['rkp4'] = rkp4Data; 

                                this.getContent('rkp5', rkp5Data => {
                                    results['rkp5'] = rkp5Data; 

                                    this.getContent('rkp6', rkp6Data => {
                                        results['rkp6'] = rkp6Data; 
                                        callback(results);
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }
    
    getContentFromServer(): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent('perencanaan', this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';

        this.dataApiService.getContent('perencanaan', this.desaDetails.Tahun, changeId, this.progressListener.bind(this))
            .subscribe(
            result => {
                if(result['change_id'] === localBundle.changeId){
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    return;
                }

                mergedResult = this.mergeContent(result, localBundle);

                this.dataApiService.writeFile(mergedResult, this.sharedService.getPerencanaanFile(), null);
            },
            error => {
                mergedResult = this.mergeContent(localBundle, localBundle);
                this.dataApiService.writeFile(mergedResult, this.sharedService.getPerencanaanFile(), null);
            });
    }

    mergeContent(newBundle, oldBundle): any {
        if (newBundle['diffs']) {
            this.sheets.forEach(sheet =>{
                let newDiffs = newBundle["diffs"][sheet] ? newBundle["diffs"][sheet] : [];
                oldBundle["data"][sheet] = this.dataApiService.mergeDiffs(newDiffs, oldBundle["data"][sheet]);
            })
        }
        else {
            this.sheets.forEach(sheet =>{
                oldBundle["data"][sheet] = newBundle["data"][sheet] ? newBundle["data"][sheet] : [];
            })
        }

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }
    
    createSheet(sheetContainer, sheet): any {
        let me = this;
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

        result.addHook("afterChange", (changes, source) => {
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
        });

        return result;
    }

    updateSetting(sheet, field, arr){
        let schema = sheet.match(/[a-z]+/g)[0];

    }

    transformData(source): any[] {
        let results = [];
        source.forEach(content => {
            RENSTRA_FIELDS.fields.forEach((field, idx) => {
                let res = [];
                let current = RENSTRA_FIELDS.currents[idx];
                let valueNulled = false;

                for (let i = 0; i < field.length; i++) {
                    let value = content[field[i]]

                    if (!value && value !== "") {
                        if (value === null ) { valueNulled = true; break; }
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
        $('#modal-save-diff').modal('hide');
        
        let requiredCol = { Kd_Desa: this.desaDetails.Kd_Desa, Tahun: this.desaDetails.Tahun}
        let dataBundles = {
            insert: [],
            update: [],
            delete: []
        };

        this.sheets.forEach(sheet => {
            let initialDataset = this.initialDatasets[sheet];
            let hot = this.hots[sheet];
            let sourceData = hot.getSourceData();

            this.bundleData[sheet] = sourceData;

            let diff = this.trackDiff(initialDataset, sourceData);
            if (diff.total == 0) 
                return;

            if(sheet == 'renstra'){
                diff.added.forEach(content => {
                    let result = this.bundleArrToObj(content);

                    Object.assign(result.data, requiredCol);
                    dataBundles.insert.push({ [result.table]: result.data });
                });

                diff.modified.forEach(content => {
                    let res = { whereClause: {}, data: {} }
                    let results = this.bundleArrToObj(content);

                    Object.assign(results.data, requiredCol);

                    WHERECLAUSE_FIELD[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = this.sliceObject(results.data, WHERECLAUSE_FIELD[results.table]);
                    dataBundles.update.push({ [results.table]: res })
                });

                diff.deleted.forEach(content => {
                    let results = this.bundleArrToObj(content);
                    let res = { whereClause: {}, data: {} };

                    WHERECLAUSE_FIELD[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = this.sliceObject(results.data, WHERECLAUSE_FIELD[results.table]);
                    dataBundles.delete.push({ [results.table]: res });
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
                        let data = this.dataReferences['bidang'].find(o => o.Kd_Bid == c.substring(this.desaDetails.Kd_Desa.length));

                        Object.assign(data, requiredCol, { Kd_Bid: c });
                        dataBundles.insert.push({ [tableBidang]: data });
                    });
                }

                diff.added.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[schema]);
                    let ID_Keg = data.Kd_Keg.substring(this.desaDetails.Kd_Desa.length);
                    data = this.valueNormalized(data);

                    Object.assign(data, requiredCol, { ID_Keg: ID_Keg });
                    dataBundles.insert.push({ [table]: data });
                });

                diff.modified.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[schema]);
                    let res = { whereClause: {}, data: {} }
                    let ID_Keg = data.Kd_Keg.substring(this.desaDetails.Kd_Desa.length);
                    data = this.valueNormalized(data);

                    if (sheet == 'rpjm' && !data['Keluaran'])
                        data['Keluaran'] = "";

                    Object.assign(data, requiredCol, { ID_Keg: ID_Keg })

                    WHERECLAUSE_FIELD[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = this.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    dataBundles.update.push({ [table]: res });
                });

                diff.deleted.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[schema]);
                    let res = { whereClause: {}, data: {} };

                    WHERECLAUSE_FIELD[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = this.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    dataBundles.delete.push({ [table]: res });
                });
            }
        });
        
        this.siskeudesService.saveToSiskeudesDB(dataBundles, null, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan ke Database Berhasil!', '');
                this.saveContentToServer();
                
                this.getAllContent(data =>{
                    let keys = Object.keys(data);
                    
                    keys.forEach(sheet => {
                        this.hots[sheet].loadData(data[sheet]);
                        this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
                    });                                         

                    if(isRKPSheet)
                        this.updateSumberDana();
                    else
                        this.afterSave();

                    setTimeout(function() {
                        me.activeHot.render();
                    }, 300);
                })
            }
            else
                this.toastr.error('Penyimpanan ke Database  Gagal!', '');
        });
    };

    updateSumberDana(): void {
        let dataBundles = {
            insert: [],
            update: [],
            delete: []
        };
        let results = [];
        this.siskeudesService.getSumberDanaPaguTahunan(this.desaDetails.Kd_Desa, data => {
            data.forEach(row => {
                let content = results.find(c => c.Kd_Keg == row.Kd_Keg);

                if (content) {
                    let sumberdana = content.Sumberdana;
                    sumberdana = sumberdana.replace(/\s/g, '');
                    let splitSumberdana = sumberdana.split(',');

                    if (splitSumberdana.indexOf(row.Sumberdana) == -1) {
                        let newSumberDana = splitSumberdana.join(', ') + (', ') + row.Kd_Sumber;
                        let bundleUpdate = dataBundles.update.find(c => c.Ta_RPJM_Kegiatan.whereClause.Kd_Keg == row.Kd_Keg)

                        content.Sumberdana = newSumberDana;
                        bundleUpdate.Ta_RPJM_Kegiatan.data.Sumberdana = newSumberDana;
                    }

                }
                else {
                    let whereClause = { whereClause: { Kd_Keg: row.Kd_Keg }, data: { Sumberdana: row.Kd_Sumber } }
                    dataBundles.update.push({ ['Ta_RPJM_Kegiatan']: whereClause });
                    results.push({ Kd_Keg: row.Kd_Keg, Sumberdana: row.Kd_Sumber })
                }
            });

            this.siskeudesService.saveToSiskeudesDB(dataBundles, null, response => {
                this.afterSave();
            });

        });
    }

    saveContentToServer(){
        let localBundle = this.dataApiService.getLocalContent('perencanaan', this.bundleSchemas);

        for(let i = 0; i < this.sheets.length; i++){
            let sheet = this.sheets[i];
            let diff =  this.diffTracker.trackDiff(localBundle['data'][sheet], this.bundleData[sheet]);
            if (diff.total > 0)
                localBundle['diffs'][sheet] = localBundle['diffs'][sheet].concat(diff);
        }

        this.dataApiService.saveContent('perencanaan', this.desaDetails.Tahun, localBundle, this.bundleSchemas, this.progressListener.bind(this))
            .finally(() => {
                this.dataApiService.writeFile(localBundle, this.sharedService.getPerencanaanFile(), this.toastr)
            })
            .subscribe(
            result => {
                let mergedResult = this.mergeContent(result, localBundle);
                
                mergedResult = this.mergeContent(localBundle, mergedResult);
                for(let i = 0; i < this.sheets.length; i++){
                    let sheet = this.sheets[i];
                    localBundle.diffs[sheet] = [];
                    localBundle.data[sheet] = mergedResult['data'][sheet];
                }

                this.toastr.success('Data berhasil disimpan ke server');
            },
            error => {
                this.toastr.error('Data gagal disimpan ke server');
            });

    }

    arrayToObj(arr, schema): any {
        let result = {};
        for (let i = 0; i < schema.length; i++) {
            let newValue;
            if (arr[i] == 'true' || arr[i] == 'false')
                newValue = arr[i] == 'true' ? true : false;
            else
                newValue = arr[i];

            result[schema[i]] = newValue;
        }

        return result;
    }

    bundleArrToObj(content): any {
        let result = {};
        let code = content[0].substring(this.idVisi.length);
        let table = Tables[code.length];
        let field = RENSTRA_FIELDS.fields.find(c => c[1] == content[1])
        let data = this.arrayToObj(content.slice(0, field.length), field);
        let codes = this.parsingCode(content[0]);

        Object.assign(data, codes);
        return { table: table, data: data }
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

    parsingCode(codeSource): any {
        let fields = ['ID_Visi', 'ID_Misi', 'ID_Tujuan', 'ID_Sasaran'];
        let code = codeSource.substring(this.idVisi.length);
        let type = Types[code.length];

        let posField = fields.indexOf('ID_' + type)
        let results = {};

        fields.slice(posField - 1, posField).forEach(field => {
            let endSlice = Types[field.split('_')[1]]
            results[field] = this.idVisi + code.slice(0, parseInt(endSlice))
        });

        results['No_' + type] = (type == 'Visi') ? this.idVisi.substring(this.desaDetails.Kd_Desa.length).slice(0, -1) : code.slice(-2);
        return results;
    }

    addRow(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let lastRow;
        let me = this;
        let position = 0;
        let data = this.valueNormalized(this.model);
        let content = []
        let sourceData = this.activeHot.getSourceData();

        if (this.isExist)
            return;

        switch (sheet) {
            case 'renstra':
                let lastCode;
                if (data['category'] == 'Misi') {
                    let sourDataFiltered = sourceData.filter(c => {
                        if (c[0].replace(this.idVisi, '').length == 2) return c;
                    });
                    if(sourDataFiltered.length !== 0)
                        lastCode = sourDataFiltered[sourDataFiltered.length - 1][0];
                    else 
                        lastCode = this.idVisi + '00';
                    position = sourceData.length;
                }

                if (data['category'] != 'Misi') {
                    let code = ((data['category'] == 'Tujuan') ? data['Misi'] : data['Tujuan']).replace(this.idVisi, '');

                    sourceData.forEach((content, i) => {
                        let value = content[0].replace(this.idVisi, '');

                        if (value.length == code.length + 2 && value.startsWith(code))
                            lastCode = content[0];

                        if (value.startsWith(code))
                            position = i + 1;
                    });

                    if (!lastCode){
                        lastCode = (data['category'] == 'Tujuan') ? data['Misi'] + '00' 
                        : (data['category'] == 'Misi') ? '00' 
                        :  data['Tujuan'] + '00';
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
            checkBox.forEach(c => {
                if (data[c])
                    return;
                else
                    data[c] = false;
            });

            if (data.Kd_Sas)
                data['Uraian_Sasaran'] = this.dataReferences.sasaran.find(c => c.ID_Sasaran == data.Kd_Sas).Uraian_Sasaran;

            data['Nama_Kegiatan'] = this.dataReferences.kegiatan.find(c => c.ID_Keg == data.Kd_Keg.substring(this.desaDetails.Kd_Desa.length)).Nama_Kegiatan;
            data['Nama_Bidang'] = this.dataReferences.bidang.find(c => c.Kd_Bid == data.Kd_Bid.substring(this.desaDetails.Kd_Desa.length)).Nama_Bidang;
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

        $("#modal-add-" + sheet).modal("show");

        if (sheet !== 'renstra')
            return

        if (selected) {
            let data = this.activeHot.getDataAtRow(selected[0]);
            let code = data[0].replace(this.idVisi, '');
            let current = RENSTRA_FIELDS.currents.find(c => c.lengthId == code.length + 2);

            if (!current) current = RENSTRA_FIELDS.currents.find(c => c.lengthId == 6);
            category = current.fieldName.split('_')[1];
        }

        this.model.category = category;
        if (category !== 'Misi') this.categoryOnChange(category);
    }

    openSaveDialog() {
        let that = this;
        this.diffContents = this.getDiffContents();

        if (this.diffContents.total > 0) {
            $("#modal-save-diff").modal("show");
            setTimeout(() => {
                that.hots[that.activeSheet].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
        else
            this.toastr.warning('Tidak ada data yang berubah', '');
    }

    addOneRow(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let data = {};
        $("#form-add-" + sheet).serializeArray().map(c => { data[c.name] = c.value });

        if (sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist) {
            this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan', '');
            return
        }

        let isFilled = this.validateForm(data);
        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if (sheet == 'rkp') {
                if (this.validateDate()) {
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow();
                    $("#modal-add-" + sheet).modal("hide");
                    $('#form-add-' + sheet)[0].reset();
                }
            }
            else {
                this.addRow();
                $("#modal-add-" + sheet).modal("hide");
                $('#form-add-' + sheet)[0].reset();
            }

        }
    }

    addOneRowAndAnother(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let data = {};
        $("#form-add-" + sheet).serializeArray().map(c => { data[c.name] = c.value });
        let category = this.model.category;

        if (sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist) {
            this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan', '');
            return
        }

        let isFilled = this.validateForm(data);

        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if (sheet == 'rkp') {
                if (this.validateDate()) {
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow();
                    this.categoryOnChange(this.model.category);
                }
            }
            else {
                this.addRow();
                this.categoryOnChange(this.model.category);
            }
        }
    }

    categoryOnChange(value): void {
        this.model = {};
        this.setDefaultvalue();
        let sourceData = this.activeHot.getSourceData();
        this.model.category = value;

        this.contentSelection['contentMisi'] = sourceData.filter(c => {
            let code = c[0].replace(this.idVisi, '');
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
                    let code = data[0].replace(this.idVisi, '');

                    if (code.length == 4 && data[0].startsWith(value))
                        this.contentSelection['contentTujuan'].push(data);
                })
                break;
            case 'bidangRPJM':
                value = value.substring(this.desaDetails.Kd_Desa.length);
                content = this.dataReferences['kegiatan'];

                this.contentSelection['kegiatan'] = content.filter(c => c.Kd_Bid == value);
                break;
            case 'bidangRKP':
                content = this.dataReferences['rpjmKegiatan'];
                this.contentSelection['kegiatan'] = content.filter(c => c.Kd_Keg.startsWith(value) && c.Kd_Keg.split('.').length == 5);
                break;
        }
    }

    getReferences( type, callback): void {
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
                let fields = [{ field:'ID_Sasaran' }, { field: 'Category' }, { field: 'Uraian_Sasaran' }];
                sourceData = this.hots['renstra'].getSourceData().map(c => schemas.arrayToObj(c, fields));
                this.dataReferences["sasaran"] = sourceData.filter( c => c.Category == 'Sasaran');   
                callback(true)                             
                break;
            case 'sumberDana':
                this.siskeudesService.getRefSumberDana(data => {
                    this.dataReferences["sumberDana"] = data;
                    callback(data);
                })
                break;
            case 'RPJMBidAndKeg':
                sourceData =  this.hots['rpjm'].getSourceData();
                let kegiatanResults = [];
                let bidangResults = [];

                for(let i = 0; i < sourceData.length; i++){
                    let row = schemas.arrayToObj(sourceData[i], schemas.rpjm);
                    let currentBidang = bidangResults.find(c => c.Kd_Bid == row.Kd_Bid);

                    kegiatanResults.push({ Kd_Keg: row.Kd_Keg, Nama_Kegiatan: row.Nama_Kegiatan })
                    if(!currentBidang)
                        bidangResults.push({ Kd_Bid: row.Kd_Bid, Nama_Bidang: row.Nama_Bidang })
                                        
                }
                this.dataReferences['rpjmKegiatan'] = kegiatanResults;
                this.dataReferences['rpjmBidang'] = bidangResults;
                callback(true)
                break;
        }
    }

    selectTab(type): void {
        let that = this;
        this.isExist = false;
        this.activeSheet = type;
        this.activeHot = this.hots[type];

        if(type.startsWith('rpjm')){
             this.getReferences('kegiatan',()=>{
                this.getReferences('bidang', ()=>{
                    this.getReferences('sasaran', ()=>{})
                })
            })
        }
        else if(type.startsWith('rkp')){
            this.getReferences('RPJMBidAndKeg',()=>{
                this.getReferences('sumberDana', ()=>{})
            })
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

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    getDiffContents(): any {
        let res = { diff: [], total: 0 };
        Object.keys(this.initialDatasets).forEach(sheet => {
            let sourceData = this.hots[sheet].getSourceData();
            let initialData = this.initialDatasets[sheet];
            let diffcontent = this.diffTracker.trackDiff(initialData, sourceData);

            if (diffcontent.total > 0) {
                res.diff.push({ data: diffcontent, sheet: [sheet] })
                res.total += diffcontent.total;
            }
        })
        return res;
    }

    validateForm(data): boolean {
        let result = false;
        let category = this.model.category;

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
            let mulai = moment(this.model.Mulai, "YYYY-MM-DD").format("DD/MM/YYYY");
            let selesai = moment(this.model.Selesai, "YYYY-MM-DD").format("DD/MM/YYYY");

            if (mulai > selesai)
                return true;
            return false
        }
    }

    valueNormalized(model): any {
        if (this.model.Mulai != "" && this.model.Selesai != "") {
            if (this.model.Mulai != null && this.model.Selesai != null) {
                this.model.Mulai = moment(this.model.Mulai, "YYYY-MM-DD").format("DD/MM/YYYY");
                this.model.Selesai = moment(this.model.Selesai, "YYYY-MM-DD").format("DD/MM/YYYY");
            }
        }

        Object.keys(model).forEach(val => {
            if (model[val] == null || model[val] === undefined)
                model[val] = '';
        })
        return model;
    }

    sheetAliases(sheet){
        let aliases = {renstra: 'RENSTRA', rpjm: 'RPJM', rkp1: 'RKP 1', rkp2: 'RKP 2', rkp3: 'RKP 3',rkp4: 'RKP 4', rkp5: 'RKP 5', rkp6: 'RKP 6'}
        return aliases[sheet];                
    }
}