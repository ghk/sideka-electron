import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx';

import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { Progress } from 'angular-progress-http';
import { pbdtIdvImporterConfig, pbdtRtImporterConfig, Importer } from '../helpers/importer';
import { Diff, DiffTracker } from "../helpers/diffs";
import { Router, ActivatedRoute } from "@angular/router";

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';

import schemas from '../schemas';
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
var base64 = require("uuid-base64");

@Component({
    selector: 'kemiskinan',
    templateUrl: '../templates/kemiskinan.html'
})
export default class KemiskinanComponent {
    hots: any;
    activeSub: string;
    activeSheet: string;
    mode: string;
    bundleData: any;
    bundleSchemas: any;
    progress: Progress;
    progressMessage: string;
    selectedDiff: any;
    currentDiffs: any;
    afterSaveAction: any; 
    categories: any;
    isValidationFormShown: boolean;
    selectedItem: any;

    constructor(
        private appRef: ApplicationRef,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private ngZone: NgZone,
        private router: Router,
        private route: ActivatedRoute,
        private dataApiService: DataApiService,
        private sharedService: SharedService
    ) {

        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        this.hots = { "pbdtIdv": null, "pbdtRt": null };
        this.bundleData = {"pbdtIdv": [], "pbdtRt": []};
        this.bundleSchemas = { "pbdtRt": schemas.pbdtRt, "pbdtIdv": schemas.pbdtIdv };
        this.categories = {
            "pbdtIdv": ['region', 'personal'],
            "pbdtRt": ['region', 'krt', 'perumahan', 'aset', 'program', 'wus', 'rt']
        };
        
        this.isValidationFormShown = false;
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        
        this.createHot();
        this.activeSheet = 'pbdtIdv';

        this.route.queryParams.subscribe(
            param => {
                this.activeSub = param['sub'];
                this.mode = param['mode'];
                
                if(this.mode === 'view'){
                    titleBar.title("PBDT " + this.activeSub + ' - ' + this.dataApiService.getActiveAuth()['desa_name']);
                    titleBar.blue();
                }
                   
                else if(this.mode === 'validate'){
                    titleBar.title("PBDT " + param['validationSub'] + ' - ' + this.dataApiService.getActiveAuth()['desa_name']);
                    titleBar.blue();
                }

                this.getContent();      
            }
        );
    }

    ngOnDestroy(): void {
        titleBar.removeTitle();
    }

    createHot(): void {
        let pbdtIdvElement = $('.pbdtIdv')[0];
        let pbdtRtElement = $('.pbdtRt')[0];

        this.hots['pbdtIdv'] = new Handsontable(pbdtIdvElement, {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.pbdtIdv),
            columns: schemas.getColumns(schemas.pbdtIdv),
            colWidths: schemas.getColWidths(schemas.pbdtIdv),
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

        this.hots['pbdtRt'] = new Handsontable(pbdtRtElement, {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.pbdtRt),
            columns: schemas.getColumns(schemas.pbdtRt),
            colWidths: schemas.getColWidths(schemas.pbdtRt),
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
    }

   getContent(): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, "kemiskinan", this.activeSub);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';
        
        this.dataApiService.getContent('kemiskinan', this.activeSub, changeId, this.progressListener.bind(this))
            .subscribe(
                result => {
                    if (result['change_id'] === localBundle.changeId) {
                        mergedResult = this.mergeContent(localBundle, localBundle);
                        this.synchronizeDiffs(mergedResult);
                        return;
                    }

                    mergedResult = this.mergeContent(result, localBundle);
                    this.checkAndNotifyDiffs(result);
                    //this.dataApiService.writeFile(mergedResult, this.sharedService.getPendudukFile(), null);
                    this.synchronizeDiffs(mergedResult);
                },
                error => {
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    this.loadAllData(mergedResult);
                }
        );
    }

    saveContent(isTrackingDiff: boolean): void {
        $('#modal-save-diff').modal('hide');

        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, "kemiskinan", this.activeSub);

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
                    .writeFile(localBundle, this.sharedService.getContentFile('kemiskinan', this.activeSheet), this.toastr);
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
            );
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
            oldBundle["data"]["pbdtRt"] = newBundle["data"]["pbdtRt"] ? newBundle["data"]["pbdtRt"] : [];
        }

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    loadAllData(bundle) {
        let me = this;

        me.hots['pbdtIdv'].loadData(bundle['data']['pbdtIdv']);
        me.hots['pbdtRt'].loadData(bundle['data']['pbdtRt']);

        setTimeout(() => {
            me.hots['pbdtIdv'].render();
            me.hots['pbdtRt'].render();
        }, 200);
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

    showValidationForm(show): void {
       this.isValidationFormShown = show;

       let hot = this.hots[this.activeSheet];

       if(!hot.getSelected())
         return;

        if (!show) {
            titleBar.blue();
            return;
        }
       
       this.selectedItem = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas[this.activeSheet]); 
       titleBar.normal();
       titleBar.title(null);
    }

    getCategoryLabel(id): string{
        let column = schemas[this.activeSheet].filter(e => e.category && e.category.id === id)[0];

        if(!column)
            return '';
        
        return column.category.label;
    }

    setActiveSheet(sheet): boolean {
        if (this.activeSheet) {
            this.hots[sheet].unlisten();
        }

        this.activeSheet = sheet;

        if (this.activeSheet) {
            this.hots[sheet].listen();
        }

        return false;
    }

    openSaveDialog(): void {
        let pbdtIdv = this.hots['pbdtIdv'].getSourceData();
        let pbdtRt = this.hots['pbdtRt'].getSourceData();

        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, "kemiskinan", this.activeSub);

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
            "pbdtIdv": DiffTracker.trackDiff(localData['pbdtIdv'], realTimeData['pbdtIdv']),
            "pbdtRt": DiffTracker.trackDiff(localData['pbdtRt'], realTimeData['pbdtRt'])
        };
    }

    progressListener(progress: Progress){
        this.progress = progress;
    }

    redirectMain(): void {
        if (!this.activeSheet) 
            this.router.navigateByUrl('/');

        let pbdtIdvData = this.hots['pbdtIdv'].getSourceData();
        let pbdtRtData = this.hots['pbdtRt'].getSourceData();
        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, "kemiskinan", this.activeSub);

        this.selectedDiff = 'pbdtIdv';
        this.currentDiffs = this.trackDiffs(localBundle["data"], { "pbdtIdv": pbdtIdvData, "pbdtRt": pbdtRtData });
    
        if (this.currentDiffs.pbdtIdv.total > 0 || this.currentDiffs.pbdtRt.total > 0) {
            this.openSaveDialog();
        }
        else {
            this.router.navigateByUrl('/');
        }
    }    
}
