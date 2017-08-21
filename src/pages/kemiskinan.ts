import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx';

import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { Progress } from 'angular-progress-http';
import { pbdtIdvImporterConfig, pbdtRtImporterConfig, Importer } from '../helpers/importer';
import { Diff, DiffTracker } from "../helpers/diffTracker";

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';

import schemas from '../schemas';
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var base64 = require("uuid-base64");

@Component({
    selector: 'kemiskinan',
    templateUrl: 'templates/kemiskinan.html'
})
export default class KemiskinanComponent {
    hots: any;
    types: any;
    activeType: string;
    sheets: any[];
    activeSheet: string;
    pdbtYear: string;
    importedData: any;
    bundleData: any;
    bundleSchemas: any;
    isSheetEmpty: boolean;
    progress: Progress;
    progressMessage: string;
    importer: any;
    selectedItem: any;
    selectedSchema: any;
    currentDiffs: any;
    diffTracker: DiffTracker;
    selectedDiff: any;
    afterSaveAction: any
    selectedSheet: any;

    constructor(
        private appRef: ApplicationRef,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private ngZone: NgZone,
        private dataApiService: DataApiService,
        private sharedService: SharedService
    ) {

        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Kemiskinan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
        
        this.types = ['pbdtIdv', 'pbdtRt'];
        this.activeType = this.types[0];
        this.sheets = [];
        this.bundleData = {"pbdtIdv": [], "pbdtRt": []};
        this.bundleSchemas = { "pbdtRt": schemas.pbdtRt, "pbdtIdv": schemas.pbdtIdv };
        this.isSheetEmpty = false;
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        this.importer = { "pbdtIdv": new Importer(pbdtIdvImporterConfig), "pbdtRt": new Importer(pbdtRtImporterConfig) };
        this.importedData = { "pbdtIdv": [], "pbdtRt": [] };
        this.hots = { "pbdtIdv": {}, "pbdtRt": {} };
        this.diffTracker = new DiffTracker();
        this.createHot();

        this.dataApiService.getContentSubType('kemiskinan', null).subscribe(
            result => {
                if (result.length === 0)
                    this.isSheetEmpty = true;
                else
                    this.sheets = result;
            },
            error => {

            }
        );
    }

    getContent(): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent('kemiskinan_' + this.activeSheet, this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';

        this.dataApiService.getContent('kemiskinan', this.activeSheet, changeId, this.progressListener.bind(this))
            .subscribe(
                result => {
                    if (result['change_id'] === localBundle.changeId) {
                        mergedResult = this.mergeContent(localBundle, localBundle);
                        this.synchronizeDiffs(mergedResult);
                        return;
                    }

                    mergedResult = this.mergeContent(result, localBundle);
                    this.checkAndNotifyDiffs(result);
                    this.dataApiService.writeFile(mergedResult, this.sharedService.getPendudukFile(), null);
                    this.synchronizeDiffs(mergedResult);
                },
                error => {
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    this.loadAllData(mergedResult);
                }
            )
    }

    saveContent(isTrackingDiff: boolean): void {
         $('#modal-save-diff').modal('hide');

         let localBundle = this.dataApiService.getLocalContent('kemiskinan_' + this.activeSheet, this.bundleSchemas);

         if (isTrackingDiff) {
            this.bundleData['pbdtIdv'] = this.hots['pbdtIdv'].getSourceData();
            this.bundleData['pbdtRt'] = this.hots['pbdtRt'].getSourceData();

            let diffs = this.trackDiffs(localBundle["data"], this.bundleData);

            if (diffs.pbdtIdv.total > 0)
                localBundle['diffs']['pbdtIdv'] = localBundle['diffs']['pbdtIdv'].concat(diffs.pbdtIdv);
            if (diffs.pbdtRt.total > 0)
                localBundle['diffs']['pbdtRt'] = localBundle['diffs']['pbdtRt'].concat(diffs.pbdtRt);
         }

         this.progressMessage = 'Menyimpan Data';

         this.dataApiService.saveContent('kemiskinan', this.activeSheet, localBundle, this.bundleSchemas, 
            this.progressListener.bind(this)).finally(() => {
                this.dataApiService
                    .writeFile(localBundle, this.sharedService.getSubTypeFile('kemiskinan', this.activeSheet), this.toastr);
            }).subscribe(
                result => {
                    let mergedResult = this.mergeContent(result, localBundle);
                    mergedResult = this.mergeContent(localBundle, mergedResult);

                    localBundle.diffs['pbdtIdv'] = [];
                    localBundle.diffs['pbdtRt'] = [];

                    localBundle.data['pbdtIdv'] = mergedResult['data']['pbdtIdv'];
                    localBundle.data['pbdtRt'] = mergedResult['data']['pbdtRt'];

                    this.loadAllData(mergedResult);
                    this.toastr.success('Data berhasil disimpan ke server');
                },
                error => {
                    this.toastr.error('Data gagal disimpan ke server');
                }
            )
    }

    changeType(type): void {
        this.activeType = type;
    }

    createHot(): void {
        this.types.forEach(type => {
            let element = $('.' + type + '-sheet')[0];

            this.hots[type] = new Handsontable(element, {
                data: [],
                topOverlay: 34,
                rowHeaders: true,
                colHeaders: schemas.getHeader(schemas[type]),
                columns: schemas.getColumns(schemas[type]),
                colWidths: schemas.getColWidths(schemas[type]),
                rowHeights: 23,
                columnSorting: true,
                sortIndicator: true,
                hiddenColumns: { columns: [0], indicators: true },
                renderAllRows: false,
                outsideClickDeselects: false,
                autoColumnSize: false,
                search: true,
                schemaFilters: true,
                contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
                dropdownMenu: ['filter_by_condition', 'filter_action_bar']
            });
        });
    }

    setActiveType(type): boolean {
        if (this.activeType) {
            this.hots[type].unlisten();
        }

        this.activeType = type;

        if (this.activeType) {
            this.hots[type].listen();
        }

        return false;
    }

    openPbdtModal(): void {
        $('#add-pbdt-modal')['modal']('show');
    }

    initImportFile(type): void {
        let files = remote.dialog.showOpenDialog(null);

        if (files && files.length) {
            this.importer[type].init(files[0]);
            let objData = this.importer[type].getResults();
  
            for(let i=0; i<objData.length; i++)
                objData[i]['id'] = base64.encode(uuid.v4());
        
            this.importedData[type] = objData.map(o => schemas.objToArray(o, schemas[type]));
        }
    }

    doImport(): void {
        if (!this.pdbtYear) {
            this.toastr.error('Tahun harus diisi');
            return;
        }

        let existingYear = this.sheets.filter(e => e == this.pdbtYear)[0];

        if (existingYear) {
            this.toastr.error('Tahun sudah ada');
            return;
        }

        this.sheets.push(this.pdbtYear);
        this.activeSheet = this.sheets[this.sheets.length - 1];

        this.bundleData = { 
            "pbdtIdv": this.importedData["pbdtIdv"], 
            "pbdtRt": this.importedData["pbdtRt"] 
        };

        setTimeout(() => {
            this.createHot();
            this.hots['pbdtIdv'].loadData(this.bundleData.pbdtIdv);
            this.hots['pbdtRt'].loadData(this.bundleData.pbdtRt);

            if(this.bundleData.pbdtIdv.length > 0 && this.bundleData.pbdtRt.length > 0)
                this.isSheetEmpty = false;
                
        }, 2000);

        console.log(this.bundleData);
        $('#add-pbdt-modal')['modal']('hide');
    }

    validate(): void {
        let hot = this.hots[this.activeType][this.activeSheet];
        
        if(!hot.getSelected()){

        }

        this.selectedSchema = schemas[this.activeType];
        this.selectedItem = hot.getDataAtRow(hot.getSelected()[0]);

        $('#validation-modal')['modal']('show');
    }

    openSaveDialog(): void {
        let pbdtIdv = this.hots['pbdtIdv'].getSourceData();
        let pbdtRt = this.hots['pbdtRt'].getSourceData();

        let localBundle = this.dataApiService.getLocalContent('kemiskinan_' + this.activeSheet, this.bundleSchemas);

        this.currentDiffs = this.trackDiffs(localBundle["data"], {"pbdtIdv": pbdtIdv, "pbdtRt": pbdtRt });
        
        let me = this;

        if (this.currentDiffs.pbdtIdv.total > 0 || this.currentDiffs.pbdtRt.total > 0) {
            this.selectedDiff = 'pbdtIdv';
            this.afterSaveAction = null;
            
            $('#modal-save-diff')['modal']('show');

            setTimeout(() => {
                me.hots['pbdtIdv'].unlisten();
                me.hots['pbdtRt'].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else {
            this.toastr.custom('<span style="color: red">Tidak ada data yang berubah.</span>', null, { enableHTML: true });
        }
    }

    switchDiff(type): boolean {
        this.selectedDiff = type;
        return false;
    }

    trackDiffs(localData, realTimeData): any {
        return {
            "pbdtIdv": this.diffTracker.trackDiff(localData['pbdtIdv'], realTimeData['pbdtIdv']),
            "pbdtRt": this.diffTracker.trackDiff(localData['pbdtRt'], realTimeData['pbdtRt'])
        };
    }

    synchronizeDiffs(bundle): void {
        let diffExists = bundle['diffs']['pbdtIdv'].length > 0 ||
            bundle['diffs']['pbdtRt'].length > 0;

        if (diffExists)
            this.saveContent(false);
        else
            this.loadAllData(bundle);
    }

    checkAndNotifyDiffs(serverData): void {
        if (serverData["diffs"]) {
            if (serverData["diffs"]["pbdtIdv"].length > 0)
                this.toastr.info("Terdapat " + serverData["diffs"]["pbdtIdv"].length + " perubahan pada data IDV");
            if (serverData["diffs"]["pbdtRt"].length > 0)
                this.toastr.info("Terdapat " + serverData["diffs"]["logSurat"].length + " perubahan pada data RT");     
        }
    }

    mergeContent(newBundle, oldBundle): any {
        if (newBundle['diffs']) {
            let newPbdtIdvDiffs = newBundle["diffs"]["pbdtIdv"] ? newBundle["diffs"]["pbdtIdv"] : [];
            let newPbdtRtDiffs = newBundle["diffs"]["pbdtRt"] ? newBundle["diffs"]["pbdtRt"] : [];
          
            oldBundle["data"]["pbdtIdv"] = this.dataApiService.mergeDiffs(newPbdtIdvDiffs, oldBundle["data"]["pbdtIdv"]);
            oldBundle["data"]["pbdtRt"] = this.dataApiService.mergeDiffs(newPbdtRtDiffs, oldBundle["data"]["pbdtRt"]);
        }
        else {
            oldBundle["data"]["pbdtIdv"] = newBundle["data"]["pbdtIdv"] ? newBundle["data"]["pbdtIdv"] : [];
            oldBundle["data"]["pbdtRt"] = newBundle["data"]["mutasi"] ? newBundle["data"]["pbdtRt"] : [];
        }

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

     loadAllData(bundle) {
        let me = this;

        me.hots['pbdtIdv'].loadData(bundle['data']['pbdtIdv']);
        me.hots['pbdtRt'].loadData(bundle['data']['pbdtIdv']);

        setTimeout(() => {
            me.hots['pbdtIdv'].render();
            me.hots['pbdtRt'].render();
        }, 200);
    }

    viewPBDT(): void {
        this.activeSheet = this.selectedSheet;
        this.getContent();
    }

    progressListener(progress: Progress){
        this.progress = progress;
    }

    redirectMain(): void {
        document.location.href = "app.html";
    }
}
