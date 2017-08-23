import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter } from "@angular/core";
import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';

import schemas from '../schemas';

@Component({
    selector: 'kemiskinan-validation',
    templateUrl: 'templates/kemiskinanValidation.html'
})
export default class KemiskinanValidationComponent {
    private _item;
    private _sheet;

    @Input()
    get item(){
        return this._item
    }
    set item(value){
        this._item = value;
    }

    @Input()
    get sheet(){
        return this._sheet
    }
    set sheet(value){
        this._sheet = value;
    }

    categories: any = { 
        "pbdtIdv": [{"id": "personal", "label": "Personal"}, {"id": "region", "label": "Wilayah"}],
        "pbdtRt": [{
            "id": "region",
            "label": "Wilayah"
        }, {
            "id": "krt",
            "label": "Kepala Rumah Tangga"
        }, {
            "id": "perumahan",
            "label": "Perumahan"
        }, {
            "id": "aset",
            "label": "Kepemilikan Aset"
        }, {
            "id": "program",
            "label": "Kepemilikan Kartu Program"
        }, {
            "id": "wus",
            "label": "Wanita Usia Subur"
        }, {
            "id": "rt",
            "label": "Rumah Tangga"
        }]
    };
    
    selectedTab;
    columns;

    ngOnInit(): void {
        this.selectedTab = this.categories[this.sheet][0].id;
    }

    setActiveTab(tab): boolean {
        this.selectedTab = tab;
        this.columns = schemas[this.sheet].filter(e => e.category && e.category.id === tab);
        return false;
    }
}
