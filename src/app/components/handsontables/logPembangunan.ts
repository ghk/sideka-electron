import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { BaseHotComponent } from './base';

import schemas from '../../schemas';
import DataApiService from '../../stores/dataApiService';

@Component({
    selector: 'logPembangunan-hot',
    template: ''
})
export class LogPembangunanHotComponent extends BaseHotComponent implements OnInit, OnDestroy {
    private _sheet;
    private _schema;

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

    @Output()
    onViewProperties:EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onViewRab:EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onViewData:EventEmitter<any> = new EventEmitter<any>();

    constructor(_dataService: DataApiService) {
        super();
    }

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

        this.createHot(element, options);

        this.instance.addHook('afterRender', (isForced) => {
            this.setEvents();
        });
    }

    setEvents(): void {
        let data = this.instance.getSourceData();
        if(!data || data.length === 0)
            return;
        
        for(let i=0; i<data.length; i++){
            $('#btn1-' + i + '-5').on('click', this.viewData.bind(this));
            $('#btn1-' + i + '-6').on('click', this.viewData.bind(this));
            $('#btn0-' + i + '-4').on('click', this.viewData.bind(this));
        }
    }

    viewData(e): void {
        let id = e.target.id;
        let segmentedId = id.split('-');
        let row = segmentedId[1];
        let column = segmentedId[2];
        let type = null;

        if(column == 5 || column == 6)
            type = 'properties';
        else
            type = 'rab';

        let dataAtRow = this.instance.getDataAtRow(row);
        this.onViewData.emit({ col: column, row: row, type: type, atCurrentRow: dataAtRow });
    }

    ngOnDestroy(): void {
        this.instance.removeHook('afterRender', this.setEvents);
    }
}