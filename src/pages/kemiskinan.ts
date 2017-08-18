import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx'; 

import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { Progress } from 'angular-progress-http';

import DataApiService from '../stores/dataApiService';
import settings from '../stores/settings';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

@Component({
    selector: 'kemiskinan',
    templateUrl: 'templates/kemiskinan.html'
})
export default class KemiskinanComponent {
    rtHots: any;
    idvHots: any;
    sheets: any[];
    activeSheet: string;
    pdbtYear: string;
    importedData: any[];
    bundleData: any;
    bundleSchemas: any;
    isSheetEmpty: boolean;
    progress: Progress;

    constructor(private appRef: ApplicationRef, 
                private toastr: ToastsManager, 
                private vcr: ViewContainerRef, 
                private ngZone: NgZone,
                private dataApiService: DataApiService) {
        
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Kemiskinan - " +this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
        
        this.sheets = [];
        this.bundleData = {"pbdtRt": [], "pbdtIdv": []};
        this.bundleSchemas = {"pbdtRt": schemas.pdbtRt, "pbdtIdv": [] };
        this.isSheetEmpty = false;
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };

        this.dataApiService.getContentSubType('kemiskinan', null).subscribe(
            result => {
                if(result.length === 0)
                   this.isSheetEmpty = true;
                else
                   this.sheets = result;
            },
            error => {

            }
        );
    }

    createHot(sheet): void {
        let element = $('.' + sheet + '-sheet')[0];

        this.rtHots[sheet] = new Handsontable(element, {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.pdbtRt),
            columns: schemas.getColumns(schemas.pdbtRt),
            colWidths: schemas.getColWidths(schemas.pdbtRt),
            rowHeights: 23, 
            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {columns: [0], indicators: true}, 
            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        });
    }

    setActiveSheet(): void {

    }

    openPbdtModal(): void {
        $('#add-pbdt-modal')['modal']('show');
    }

    importPbdtIDV(event): void {
        let path = event.target.files[0].path;
        let workbook = xlsx.readFile(path);
        let sheetNames = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[sheetNames];
        
    }

    importPbdtRT(): void {

    }

    addPbdt(): void {
        if(!this.pdbtYear){
            this.toastr.error('Tahun harus diisi');
            return;
        }

        let existingYear = this.sheets.filter(e => e == this.pdbtYear)[0];

        if(existingYear){
            this.toastr.error('Tahun sudah ada');
            return;
        }

        this.sheets.push(this.pdbtYear);
        this.activeSheet = this.sheets[this.sheets.length - 1];

        setTimeout(() => {
            this.createHot(this.activeSheet);
            this.rtHots[this.activeSheet].loadData(this.bundleData.pbdtRt);
        }, 2000);
       
        $('#add-pbdt-modal')['modal']('hide');
    }
    
    progressListener(progress: Progress){
        this.progress = progress;
    }
   
    redirectMain(): void {
        document.location.href = "app.html";
    }
}
