import { remote } from 'electron';
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from "@angular/core";
import { BaseHotComponent } from './base';

import schemas from '../../schemas';
import SiksNgService from '../../stores/siksNgService';
import SettingsService from '../../stores/settingsService';

import * as base64 from 'uuid-base64';
import * as uuid from 'uuid';
import TableHelper from '../../helpers/table';

@Component({
    selector: 'bdtRt-hot',
    template: ''
})
export class BdtRtHotComponent extends BaseHotComponent implements OnInit, OnDestroy {
    private _sheet;
    private schema;
    private _mode;

    tableHelper: TableHelper = null;
    databaseError = null;
    hasValidConfiguration = false;

    settingsSubscription = null;

    @Input()
    set sheet(value) {
        this._sheet = value;
    }
    get sheet() {
        return this._sheet;
    }


    constructor(private settingsService: SettingsService, private siksNgService: SiksNgService ) {
        super();
    }

    ngOnInit(): void {
        let schema = schemas.bdtRt;
        this.schema = schema;
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
            hiddenColumns: { columns: [], indicators: true },
            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            readOnly: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        };

        this.createHot(element, options)

        let dbUrl = null;
        let kodeKecamatan = null;
        let kodeDesa = null;
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            if(dbUrl == settings["siksng.path"] && kodeKecamatan==settings["siksng.kecamatan"] && kodeDesa==settings["siksng.desa"]){
                return;
            }

            this.hasValidConfiguration = false;
            dbUrl = settings["siksng.path"];
            kodeKecamatan = settings["siksng.kecamatan"];
            kodeDesa = settings["siksng.desa"];
            if(!dbUrl || !kodeKecamatan || !kodeDesa){
                return;
            }

            this.siksNgService.getAll(dbUrl, kodeKecamatan, kodeDesa, (err, rows) => {
                if(err){
                    this.databaseError = err;
                    return;
                }

                this.hasValidConfiguration = true;

                for(var i = 0, len = rows.length; i < len; i++){
                    rows[i].id = rows[i]["NoPBDTKemsos"];
                }
                var data = rows.map(obj => schemas.objToArray(obj, schema));
                this.load(data);
            });
        });


        this.tableHelper = new TableHelper(this.instance);

        let inputSearch = document.getElementById("bdtRt-input-search");
        this.tableHelper.initializeTableSearch(document, inputSearch, null);

        let spanCount = $("#bdtRt-span-count")[0];
        this.tableHelper.initializeTableCount(spanCount);
    }

    filterContent() {
        let plugin = this.instance.getPlugin('hiddenColumns');
        plugin.showColumns(schemas.bdtRt.map((c, i) => i));

        let value = $('input[name=btn-bdt-filter]:checked').val();
        if(value){
            var hidden = [];
            for(var i = 0 ; i < schemas.bdtRt.length; i++){
                var c = schemas.bdtRt[i];
                if(c.category && c.category.id != value)
                    hidden.push(i);

            }
            plugin.hideColumns(hidden);
        }

        this.instance.render();
    }

    ngOnDestroy(): void {
        this.tableHelper.removeListenerAndHooks();
        this.settingsSubscription.unsubscribe();
    }
}