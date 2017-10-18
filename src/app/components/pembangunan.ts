import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import MapUtils from '../helpers/mapUtils';

import * as uuid from 'uuid';

var base64 = require("uuid-base64");

@Component({
    selector: 'pembangunan',
    templateUrl: '../templates/pembangunan.html'
})
export default class PembangunanComponent {
    private _indicator;
    private _map;

    @Input()
    set indicator(value) {
        this._indicator = value;
    }
    get indicator() {
        return this._indicator;
    }

    @Input()
    set map(value) {
        this._map = value;
    }
    get map() {
        return this._map;
    }

    @Output()
    savePembangunan: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    addMarker: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onEditFeature: EventEmitter<any> = new EventEmitter<any>();

    feature: any;
    pembangunanData: any;
    selectedElement: any;
    attributes: any[];
    selectedAttribute: any;
    properties: any;
    selectedYear: number;
    desaCode: string;
    totalAnggaran: number;

    constructor(private dataApiService: DataApiService, private settingsService: SettingsService) {}

    initialize(): void {
        this.properties = Object.assign({}, this.feature.feature.properties);
        this.selectedYear = new Date().getFullYear();

        this.settingsService.getAll().subscribe(settings => { 
            this.desaCode = settings.kodeDesa;
        });

        let keys = Object.keys(this.properties);

        if(!this.pembangunanData) {
             this.pembangunanData = [base64.encode(uuid.v4()),
                                     this.feature.feature.id,
                                     this.selectedYear,
                                     keys[0],
                                     [['', '', 0]], //anggaran
                                     Object.assign({}, this.properties),
                                     this.properties,
                                     0];
        }
           
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

        if(this.selectedElement.attributes){
           this.attributes = this.attributes.concat(this.selectedElement.attributes);
        }

        this.selectedAttribute = this.properties;

        if(this.selectedElement['style']){
           let style = MapUtils.setupStyle(this.selectedElement['style']);
           this.feature.setStyle(style);
        }

        this.onEditFeature.emit(this.feature.feature.id);
    }

    onAttributeChange(key): void {
        let attribute = this.attributes.filter(e => e.key === key)[0];

        if(attribute && attribute['options']){
            let option = attribute['options'].filter(e => e.value == this.selectedAttribute[key])[0];  

            if(option['marker']){
                let bounds = this.feature.getBounds();
                let center = bounds.getCenter();
                
                if(this.feature['marker']){
                    this.map.removeLayer(this.feature['marker']);
                }
                   
                this.feature['marker'] = MapUtils.createMarker(option['marker'], center).addTo(this.map).addTo(this.map);
                this.properties['icon'] = option['marker'];
                
                this.addMarker.emit(this.feature['marker']);
            }
        }

        Object.assign(this.properties, this.selectedAttribute);
        this.onEditFeature.emit(this.feature.feature.id);
    }

    onAddRAB(): void {
        this.pembangunanData[4].push(['', '', 0]);
    }

    onDeleteRAB(): void {
       if(this.pembangunanData[4].length === 1)
         return;

       this.pembangunanData[4].splice(this.pembangunanData[4].length - 1, 1);
    }

    onSave(): void {    
        this.pembangunanData[2] = this.selectedYear;
        
        let rab = this.pembangunanData[4];

        this.pembangunanData[7] = this.calculateTotal();
        this.savePembangunan.emit({ properties: this.properties, pembangunan: this.pembangunanData });
    }

    onAnggaranSelected(data, rab): void {
        rab[0] = data.kegiatan;
        rab[1] = data.rab;
        rab[2] = data.anggaran;
    }

    calculateTotal(): number {
        let total = 0;

        this.pembangunanData[4].forEach(rab => {
            total += rab[2];
        });

        return total;
    }

    onPendudukSelected(data){
        this.selectedAttribute['kk'] = data.id;
        this.onAttributeChange('kk');
    }
}
