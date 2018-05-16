import { Component, ApplicationRef, ViewContainerRef, ViewChild, OnDestroy, OnInit } from "@angular/core";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { pbdtIdvImporterConfig, pbdtRtImporterConfig, Importer } from '../helpers/importer';
import { DiffTracker, DiffMerger } from "../helpers/diffs";
import { Router, ActivatedRoute } from "@angular/router";
import { DiffItem } from '../stores/bundle';
import { PersistablePage } from './persistablePage';
import { SchemaColumn, SchemaDict } from '../schemas/schema';
import { PbdtIdvHotComponent } from '../components/handsontables/pbdtIdv';
import { PbdtRtHotComponent } from '../components/handsontables/pbdtRt';

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx';

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import PageSaver from '../helpers/pageSaver';

@Component({
    selector: 'kemiskinan',
    templateUrl: '../templates/kemiskinan.html'
})
export class KemiskinanComponent implements OnDestroy, OnInit, PersistablePage { 
    type: string;
    subType: string;
    modalSaveId: string;
    mode: string;
    validationSubType: string;
    progressMessage: string;
    activePageMenu: string;
    activeSheet: string;
    pageSaver: PageSaver = new PageSaver(this);
    bundleSchemas: SchemaDict = schemas.pbdtBundle;
    progress: Progress = { percentage: 0, event: null, lengthComputable: true, total: 0, loaded: 0 };

    @ViewChild(PbdtIdvHotComponent)
    pbdtIdvHot: PbdtIdvHotComponent;

    @ViewChild(PbdtRtHotComponent)
    pbdtRtHot: PbdtRtHotComponent;

    constructor(public toastr: ToastsManager,
        public router: Router,
        public sharedService: SharedService, 
        public settingsService: SettingsService,
        public dataApiService: DataApiService, 
        public route: ActivatedRoute,
        private vcr: ViewContainerRef) {
            this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        this.type = 'kemiskinan';
        this.bundleSchemas = schemas.pbdtBundle;
        
        setTimeout(function(){
            $("kemiskinan > #flex-container").addClass("slidein");
        }, 1000);

        this.route.queryParams.subscribe(
            param => {
                this.subType = param['sub'];
                this.mode = param['mode'];
                this.validationSubType = param["validationSub"];

                this.setTitle();
            }
        );

        this.getContent();
    }

    getContent(): void {
        this.pageSaver.getContent(data => {
            this.load(data);
            this.setActiveSheet('pbdtIdv');
        }); 
    }

    setTitle(): void {
        if(this.mode === 'view')
            titleBar.title("Data PBDT " + this.subType + ' - ' + this.dataApiService.auth.desa_name);
       
        else if(this.mode === 'validate')
            titleBar.title("Data PBDT " + this.validationSubType + ' - ' + this.dataApiService.auth.desa_name);
        
        titleBar.blue();
    }

    saveContent(): void {
        $('#modal-save-diff')["modal"]('hide');

        this.pageSaver.bundleData['pbdtIdv'] = this.pbdtIdvHot.instance.getSourceData();
        this.pageSaver.bundleData['pbdtRt'] = this.pbdtRtHot.instance.getSourceData();
    
        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(true, data => {
           this.load(data);
        });
    }

    load(data): void {
        this.pageSaver.bundleData['pbdtIdv'] = data['data']['pbdtIdv'];
        this.pageSaver.bundleData['pbdtRt'] = data['data']['pbdtRt'];

        this.pbdtIdvHot.load(this.pageSaver.bundleData['pbdtIdv']);
        this.pbdtRtHot.load(this.pageSaver.bundleData['pbdtRt']);
    }

    setActiveSheet(sheet: string): boolean {
        if (this.activeSheet === 'pbdtIdv')
            this.pbdtIdvHot.instance.unlisten();
        else if (this.activeSheet === 'pbdtRt')
            this.pbdtRtHot.instance.unlisten();
      
        this.activeSheet = sheet;

        if (this.activeSheet === 'pbdtIdv')
            this.pbdtIdvHot.instance.listen();
        else if (this.activeSheet === 'pbdtRt')
            this.pbdtRtHot.instance.listen();
        
        return false;
    }

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
            titleBar.title(null);
            this.unlistenHot(this.activeSheet);
        } 
        else {
            this.setTitle();
            this.listenHot(this.activeSheet);
        }
    }

    unlistenHot(sheet: string){
        if (sheet === 'pbdtIdv')
            this.pbdtIdvHot.instance.unlisten();
        else if (sheet === 'pbdtRt')
            this.pbdtRtHot.instance.unlisten();
    }

    listenHot(sheet: string){
        if (sheet === 'pbdtIdv')
            this.pbdtRtHot.instance.listen();
        else if (sheet === 'pbdtRt')
            this.pbdtRtHot.instance.listen();
    }

    getCurrentUnsavedData() {
        return { 
            "pbdtIdv": this.pbdtIdvHot.instance.getSourceData(), 
            "pbdtRt": this.pbdtRtHot.instance.getSourceData()
        };
    }
    
    progressListener(progress: Progress) {
        this.progress = progress;
    }

    removeListener(): void {
        document.removeEventListener('keyup', this.keyupListener, false); 
        window.removeEventListener('beforeunload', this.pageSaver.beforeUnloadListener, false);
    }

    ngOnDestroy(): void {
        if (this.pageSaver.subscription)
            this.pageSaver.subscription.unsubscribe();

        titleBar.removeTitle();
    
        this.removeListener();

        $("kemiskinan > #flex-container").removeClass("slidein");
    }

    keyupListener = (e) => {
        if (e.ctrlKey && e.keyCode === 83) {
            if(this.dataApiService.auth.isAllowedToEdit("kemiskinan")){
                this.pageSaver.onBeforeSave();
                e.preventDefault();
                e.stopPropagation();
            }
        }
        else if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}