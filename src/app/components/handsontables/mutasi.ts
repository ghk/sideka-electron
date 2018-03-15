import { remote } from 'electron';
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from "@angular/core";
import { BaseHotComponent } from './base';

import schemas from '../../schemas';
import DataApiService from '../../stores/dataApiService';

import * as base64 from 'uuid-base64';
import * as uuid from 'uuid';

enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'mutasi-hot',
    templateUrl: '../../templates/handsontables/mutasi.html'
})
export class MutasiHotComponent extends BaseHotComponent implements OnInit, OnDestroy {
    private _sheet;
    private _schema;
    private _selectedPenduduk;

    @Input()
    set sheet(value) {
        this._sheet = value;
    }
    get sheet() {
        return this._sheet;
    }

    @Input()
    set schema(value) {
        this._schema = value;
    }
    get schema() {
        return this._schema;
    }

    @Input()
    set selectedPenduduk(value) {
        this._selectedPenduduk = value;
    }
    get selectedPenduduk() {
        return this._selectedPenduduk;
    }

    @Output() onAddMutasiLog: EventEmitter<any> = new EventEmitter();

    pendudukHotInstance: any;

    constructor(private _dataService: DataApiService) {
        super();
    }

    selectedMutasi: any;

    ngOnInit(): void {
        let schema = this.schema;
        let element = $('.' + this.sheet + '-sheet')[0];

        if (!element || !schema)
            return;

        let options = {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schema),
            columns: schemas.getColumns(schema),
            colWidths: schemas.getColWidths(schema),
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
        };

        this.selectedMutasi = Mutasi.kelahiran;
        this.createHot(element, options);
    }

    openMutasiModal(hot): void {
        this.selectedPenduduk = {};
        
        if (!hot.getSelected()) {
            this.selectedMutasi = Mutasi.pindahDatang;
        }
        else {
            this.selectedMutasi = Mutasi.pindahPergi;
            
            if (!isNaN(hot.getSelected()[0]))
                this.selectedPenduduk = schemas.arrayToObj(hot.getSourceData()[hot.getSelected()[0]], schemas.penduduk);
        }
        
        this.pendudukHotInstance = hot;
        $('#mutasi-modal')['modal']('show');
    }

    changeMutasi(mutasi): void {
        this.selectedMutasi = mutasi;
    }

    mutasi(isMultiple: boolean): void {
        let data = [base64.encode(uuid.v4()), 
                    this.selectedPenduduk.nik, 
                    this.selectedPenduduk.nama_penduduk, 
                    null, 
                    this.selectedPenduduk.desa, 
                    new Date().toUTCString()];

        let pendudukData = [];
        let pendudukSchema = schemas.penduduk.map(e => e.field);

        switch(this.selectedMutasi) {
            case Mutasi.pindahPergi:
                this.pendudukHotInstance.alter('remove_row', this.pendudukHotInstance.getSelected()[0]);
                this.instance.alter('insert_row', 0);

                data[3] = 'Pindah Pergi';
                break;
            case Mutasi.pindahDatang:
                this.selectedPenduduk.nik = null;
                this.selectedPenduduk.name = null;

                for(let i=0; i<pendudukSchema.length; i++) {
                    if(i === 0)
                        pendudukData.push(base64.encode(uuid.v4()));
                    else if(i === 1)
                        pendudukData.push(this.selectedPenduduk.nik);
                    else if(i === 2)
                        pendudukData.push(this.selectedPenduduk.nama_penduduk);
                    else
                        pendudukData.push(null);
                }
                
                data[3] = 'Pindah Datang';
                break;
            case Mutasi.kematian:; 
                data[3] = 'Kematian';
                break;
            case Mutasi.kelahiran:
                this.selectedPenduduk.nik = null;
                this.selectedPenduduk.name = null;
                
                for(let i=0; i<pendudukSchema.length; i++) {
                    if(i === 0)
                        pendudukData.push((base64.encode(uuid.v4())));
                    else if(i === 2)
                        pendudukData.push(this.selectedPenduduk.nama_penduduk); 
                    else
                        pendudukData.push(null);
                }
    
                data[3] = 'Kelahiran';
                break;
        }

        this.setData(0, data);

        if (!isMultiple) 
            $('#mutasi-modal')['modal']('hide');

        let index = this.pendudukHotInstance.getSelected() ? this.pendudukHotInstance.getSelected()[0] : 0;

        this.onAddMutasiLog.emit({
            mutasi: this.selectedMutasi, 
            data: pendudukData, 
            index: index
        });

        this.selectedPenduduk.desa = null;
    }

    ngOnDestroy(): void {}
}