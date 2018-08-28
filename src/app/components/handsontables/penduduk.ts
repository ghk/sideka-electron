import { remote } from 'electron';
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from "@angular/core";
import { BaseHotComponent } from './base';

import schemas from '../../schemas';
import DataApiService from '../../stores/dataApiService';
import TableHelper from '../../helpers/table';

import * as base64 from 'uuid-base64';
import * as uuid from 'uuid';
import PageSaver from '../../helpers/pageSaver';

const FILTER_COLUMNS = [
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "pekerjaan", "kewarganegaraan", "rt", "rw", "nama_dusun", "agama", "alamat_jalan"],
    ["nik", "nama_penduduk", "no_telepon", "email", "rt", "rw", "nama_dusun", "alamat_jalan"],
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "hubungan_keluarga", "no_kk"]
];


@Component({
    selector: 'penduduk-hot',
    template: ''
})
export class PendudukHotComponent extends BaseHotComponent implements OnInit, OnDestroy {
    private _sheet;
    private _schema;
    private _itemPerPage;
    private _currentPage;
    private _totalItems;
    resultBefore: any[] = [];

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
    set itemPerPage(value) {
        this._itemPerPage = value;
    }

    get itemPerPage() {
        return this._itemPerPage;
    }

    @Input()
    set currentPage(value) {
        this._currentPage = value;
    }

    get currentPage() {
        return this._currentPage;
    }

    @Input()
    set totalItems(value) {
        this._totalItems = value;
    }

    get totalItems() {
        return this._totalItems;
    }

    @Output() onSetCurrentPage = new EventEmitter<any>();
    @Output() onCalculatePages = new EventEmitter<any>();

    isFiltered: boolean = false;
    isPendudukEmpty: boolean = false;
    trimmedRows: any[] = [];
    tableHelper: TableHelper = null;

    constructor(private _dataService: DataApiService) {
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
            contextMenu: ['undo', 'redo', 'row_above', 'row_below', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        };

        this.createHot(element, options);

        this.addHook('afterFilter', this.afterFilter.bind(this));
        this.addHook('afterRemoveRow', this.afterRemoveRow.bind(this));
        this.addHook('afterCreateRow', this.afterCreateRow.bind(this));

        this.tableHelper = new TableHelper(this.instance);
        let inputSearch = document.getElementById("penduduk-input-search");
        this.tableHelper.initializeTableSearch(document, inputSearch, null);

        let spanSelected = $("#span-selected")[0];
        this.tableHelper.initializeTableSelected(2, spanSelected);

        let spanCount = $("#penduduk-span-count")[0];
        this.tableHelper.initializeTableCount(spanCount);

    }

    afterFilter(formulas) {
        let plugin = this.instance.getPlugin('trimRows');

        if (this.itemPerPage) {
            if (plugin.trimmedRows.length === 0) {
                this.trimmedRows = [];
                this.isFiltered = false;
            }
            else {
                this.trimmedRows = plugin.trimmedRows.slice();
                this.isFiltered = true;
            }

            if (formulas.length === 0)
                this.totalItems = this.instance.getSourceData().length;
            else
                this.totalItems = this.trimmedRows.length;

            this.onSetCurrentPage.emit(1);
            this.onCalculatePages.emit();

            this.pagingData();
        }
        else {
            if (plugin.trimmedRows.length === 0) {
                this.trimmedRows = [];
                this.isFiltered = false;
            }
            else {
                this.trimmedRows = plugin.trimmedRows.slice();
                this.isFiltered = true;
            }
        }
    }

    afterRemoveRow(index, amount) { 
        this.checkPenduduk.bind(this);       
        this.instance.render();
    }

    afterCreateRow(index, amount) { 
        this.instance.setDataAtCell(index, 0, base64.encode(uuid.v4()));       
        this.checkPenduduk.bind(this);
    }

    pagingData(): void {
        let instance = this.instance;

        instance.scrollViewportTo(0);

        let plugin = instance.getPlugin('trimRows');
        let dataLength = instance.getSourceData().length;

        let pageBegin = (this.currentPage - 1) * this.itemPerPage;
        let offset = this.currentPage * this.itemPerPage;

        let sourceRows = [];
        let rows = [];

        plugin.untrimAll();

        if (this.trimmedRows.length > 0)
            plugin.trimRows(this.trimmedRows);

        for (let i = 0; i < dataLength; i++)
            sourceRows.push(i);

        if (this.trimmedRows.length > 0)
            rows = sourceRows.filter(e => plugin.trimmedRows.indexOf(e) < 0);
        else
            rows = sourceRows;

        let displayedRows = rows.slice(pageBegin, offset);

        plugin.trimRows(sourceRows);
        plugin.untrimRows(displayedRows);

        this.render();
    }

    checkPenduduk(): void {
        this.isPendudukEmpty = this.instance.getSourceData().length > 0 ? false : true;
    }

    insert(): void {        
        this.checkPenduduk();
        if(this.isPendudukEmpty){
            let row = [base64.encode(uuid.v4())];
            let schemaLength = schemas.getHeader(this.schema).length;
            for(let i=0; i < schemaLength - 1; i++){
                row.push(null)
            }  
            this.instance.loadData([row]);
        } else {
            this.instance.alter('insert_row', 0, []);
        }         
        this.checkPenduduk();   
    }

    filterContent() {
        let plugin = this.instance.getPlugin('hiddenColumns');
        let value = parseInt($('input[name=btn-filter]:checked').val().toString());
        let fields = schemas.penduduk.map(c => c.field);
        let result = PageSaver.spliceArray(fields, FILTER_COLUMNS[value]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);

        this.instance.render();
        this.resultBefore = result;
    }

    ngOnDestroy(): void {
        this.tableHelper.removeListenerAndHooks();
        this.removeHook('afterFilter', this.afterFilter);
        this.removeHook('afterRemoveRow', this.afterRemoveRow);
        this.removeHook('afterCreateRow', this.afterCreateRow);
    }
}