import { Component, ApplicationRef, ViewContainerRef, ViewChild, OnDestroy, OnInit } from "@angular/core";
import { ToastrService } from 'ngx-toastr';
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

import { DataApiService } from '../stores/dataApiService';
import { SettingsService } from '../stores/settingsService';
import { SharedService } from '../stores/sharedService';
import schemas from '../schemas';
import { titleBar } from '../helpers/titleBar';
import { PageSaver } from '../helpers/pageSaver';

@Component({
    selector: 'kemiskinan',
    templateUrl: '../templates/kemiskinan.html'
})
export class KemiskinanComponent implements OnDestroy, OnInit, PersistablePage { 
    type: string;
    subType: string;
    modalSaveId: string;
    mode: string;
    previousSubType: string;
    validationSubType: string;
    progressMessage: string;
    activePageMenu: string;
    activeSheet: string;
    selectedTab: string;
    pageSaver: PageSaver = new PageSaver(this);
    bundleSchemas: SchemaDict = schemas.pbdtBundle;
    categories: any;
    columns: any;
    progress: Progress = { percentage: 0, event: null, lengthComputable: true, total: 0, loaded: 0 };
    selectedData: any;
    selectedDataPrev: any;

    prevData: any;
 
    @ViewChild(PbdtIdvHotComponent)
    pbdtIdvHot: PbdtIdvHotComponent;

    @ViewChild(PbdtRtHotComponent)
    pbdtRtHot: PbdtRtHotComponent;

    constructor(
        public toastr: ToastrService,
        public router: Router,
        public sharedService: SharedService, 
        public settingsService: SettingsService,
        public dataApiService: DataApiService, 
        public route: ActivatedRoute
    ) {
    }

    ngOnInit(): void {
        this.type = 'kemiskinan';
        this.modalSaveId = 'modal-save-diff';
        this.bundleSchemas = schemas.pbdtBundle;
        this.categories = { 
            "pbdtIdv": [{"id": "personal", "label": "Personal", "total": 0}, {"id": "region", "label": "Wilayah", "total": 0}],
            "pbdtRt": [{
                "id": "region",
                "label": "Wilayah",
                "total": 0
            }, {
                "id": "krt",
                "label": "Kepala Rumah Tangga",
                "total": 0
            }, {
                "id": "perumahan",
                "label": "Perumahan",
                "total": 0
            }, {
                "id": "aset",
                "label": "Kepemilikan Aset",
                "total": 0
            }, {
                "id": "program",
                "label": "Kepemilikan Kartu Program",
                "total": 0
            }, {
                "id": "wus",
                "label": "Wanita Usia Subur",
                "total": 0
            }, {
                "id": "rt",
                "label": "Rumah Tangga",
                "total": 0
            }]
        };

        setTimeout(function(){
            $("kemiskinan > #flex-container").addClass("slidein");
        }, 1000);

        this.route.queryParams.subscribe(
            param => {
                this.previousSubType = param['sub'];
                this.validationSubType = param["validationSub"];
                this.mode = param['mode'];
                this.subType = this.previousSubType;

                this.setTitle();
                this.getContent();
            }
        );
    }

    getContent(): void {
        this.pageSaver.getContent(data => {
            this.load(data);
            this.setActiveSheet('pbdtRt');

            let localbundle = this.dataApiService.getLocalContent(this.bundleSchemas, this.type, this.previousSubType);
            
            this.prevData = localbundle.data;
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

        this.subType = this.validationSubType;

        this.pageSaver.saveContent(true, data => {
           this.load(data);
        });
    }

    openValidateModal(): void { 
        $('#modal-validation')['modal']('show');
        
        if (this.activeSheet === 'pbdtIdv')  {
            this.selectedData = schemas
                .arrayToObj(this.pbdtIdvHot.instance.getDataAtRow(this.pbdtIdvHot.instance.getSelected()[0]), schemas.pbdtIdv);

            this.selectedDataPrev = schemas
                .arrayToObj(this.prevData.pbdtIdv.filter(e => e[0] === this.selectedData.id)[0], schemas.pbdtIdv);
        }
           
        if (this.activeSheet === 'pbdtRt') {
            this.selectedData = schemas
                .arrayToObj(this.pbdtRtHot.instance.getDataAtRow(this.pbdtRtHot.instance.getSelected()[0]), schemas.pbdtRt);

            this.selectedDataPrev = schemas
                .arrayToObj(this.prevData.pbdtRt.filter(e => e[0] === this.selectedData.id)[0], schemas.pbdtRt);
        }
            
        this.setActiveTab(this.categories[this.activeSheet][0]['id']);
        this.setTotalDiffs();
    }

    setActiveTab(tab): boolean {
        this.selectedTab = tab;
        this.columns = schemas[this.activeSheet].filter(e => e.category && e.category.id === this.selectedTab);

        console.log(this.columns);
        
        return false;
    }

    setTotalDiffs() {
        let categories = this.categories[this.activeSheet];

        for (let i=0; i<categories.length; i++) {
            let category = categories[i];
            let columns = schemas[this.activeSheet].filter(e => e.category && e.category.id === category.id);

            category.total = 0;

            for (let j=0; j<columns.length; j++) {
                if (this.selectedData[columns[j].field] !== this.selectedDataPrev[columns[j].field])
                    category.total += 1;
            }
        }
    }

    validate(): void {
        if (this.activeSheet === 'pbdtIdv') {
            this.pbdtIdvHot.instance.setDataAtCell(this.pbdtIdvHot.instance.getSelected()[0], 31, 'Terverifikasi');
            this.pbdtIdvHot.instance.setDataAtCell(this.pbdtIdvHot.instance.getSelected()[0], 32, new Date());
            this.pbdtIdvHot.instance.setDataAtCell(this.pbdtIdvHot.instance.getSelected()[0], 33, this.dataApiService.auth.user_display_name);
        }
        else if (this.activeSheet === 'pbdtRt') {
            this.pbdtRtHot.instance.setDataAtCell(this.pbdtRtHot.instance.getSelected()[0], 78, 'Terverifikasi');
            this.pbdtRtHot.instance.setDataAtCell(this.pbdtRtHot.instance.getSelected()[0], 79, new Date());
            this.pbdtRtHot.instance.setDataAtCell(this.pbdtRtHot.instance.getSelected()[0], 80, this.dataApiService.auth.user_display_name);
        }

        $('#modal-validation')['modal']('hide');
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