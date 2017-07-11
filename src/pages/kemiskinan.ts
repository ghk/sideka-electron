import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx'; 

import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";

import dataApi from "../stores/dataApi";
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

    constructor(private appRef: ApplicationRef, 
                public toastr: ToastsManager, 
                vcr: ViewContainerRef, 
                private ngZone: NgZone) {
        
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Kemiskinan - " +dataApi.getActiveAuth()['desa_name']);
        titleBar.blue();
        
        this.sheets = [];
        this.bundleData = {"pbdtRt": [], "pbdtIdv": []};
        this.bundleSchemas = {"pbdtRt": schemas.pdbtRt, "pbdtIdv": [] };

        dataApi.getContentSubType('kemiskinan', (result => {
            if(result.length > 0){
                this.sheets = result;
                this.activeSheet = this.sheets[0];
            }
        }));
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

    importPbdtRt(): void {
        let files = remote.dialog.showOpenDialog(null);
        let workbook = xlsx.readFile(files[0]);
        let json = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
        let data = this.mapData(json);

        this.bundleData.pbdtRt = data;

        /*
        dataApi.saveContent('pbdtRt', this.activeSheet, this.bundleData, this.bundleSchemas, (result) => {

        });*/
    }
    
    mapData(data): any {
        let result = [];

        for(let i=0; i<data.length; i++){
            let keys = Object.keys(data[i]);
            let headers = schemas.pdbtRt.map(e => e.header);
            let dataItem = [];
            
            for(let j=0; j<keys.length; j++){
                let field = headers.filter(e => e === keys[j])[0];
                dataItem.push(data[i][keys[j]]);
            }

            result.push(dataItem);
        }

        return result;
    }
}
