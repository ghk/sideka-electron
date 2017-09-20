import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";

import DataApiService from '../stores/dataApiService';

import * as uuid from 'uuid';

var base64 = require("uuid-base64");

@Component({
    selector: 'pembangunan',
    templateUrl: 'templates/pembangunan.html'
})
export default class PembangunanComponent {
    private _indicator;
   
    @Input()
    set indicator(value) {
        this._indicator = value;
    }
    get indicator() {
        return this._indicator;
    }

    @Output()
    savePembangunan: EventEmitter<any> = new EventEmitter<any>();

    feature: any;
    pembangunanData: any;
    selectedElement: any;
    attributes: any[];
    selectedAttribute: any;
    properties: any;
    selectedYear: number;

    constructor(private dataApiService: DataApiService) {}

    initialize(): void {
        this.properties = Object.assign({}, this.feature.properties);
        let oldProperties = Object.assign({}, this.feature.properties);

        if(!this.pembangunanData) {
             this.pembangunanData = [base64.encode(uuid.v4()), //id
                                     null, //year
                                     this.feature.id, //feature
                                     [['', '']], //rab
                                     JSON.stringify(oldProperties),
                                     JSON.stringify(this.properties)];
        }

        this.selectedYear = new Date().getFullYear();
           
        this.selectedElement = this.indicator.elements.filter(e => 
           e.values && Object.keys(e.values).every(valueKey => 
             e.values[valueKey] === this.properties[valueKey])
        )[0];

        if(this.selectedElement) {
            this.onElementChange();
        }
    }

    onElementChange(): void {
        if(this.selectedElement.values){
           Object.keys(this.selectedElement.values).forEach(valueKey => {
               this.properties[valueKey] = this.selectedElement.values[valueKey];
           });
       }

        this.attributes = [];

        if(this.selectedElement.attributeSetNames){
            this.selectedElement.attributeSetNames.forEach(attributeSetName => {
                this.attributes = this.attributes.concat(this.indicator.attributeSets[attributeSetName]);
            });
        }

        this.selectedAttribute = this.properties;
    }

    onAttributeChange(key): void {
        let attribute = this.attributes.filter(e => e.key === key)[0];

        if(attribute && attribute['options']){
            let option = attribute['options'].filter(e => e.value == this.selectedAttribute[key])[0];  
        }

        Object.assign(this.properties, this.selectedAttribute)
    }

    onAddRAB(): void {
        this.pembangunanData[3].push(['', '']);
    }

    onDeleteRAB(): void {
       if(this.pembangunanData[3].length === 1)
         return;

       this.pembangunanData[3].splice(this.pembangunanData[3].length - 1, 1);
    }

    onSave(): void {    
        this.pembangunanData[1] = this.selectedYear;
        this.savePembangunan.emit({ properties: this.properties, pembangunan: this.pembangunanData });
    }
}
