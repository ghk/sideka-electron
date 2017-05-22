import { Component, ApplicationRef } from "@angular/core";
import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import dataApi from '../stores/dataApi';
import titleBar from '../helpers/titleBar';

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent {
    indicators: any[];
    indicator: any;
    village: any;
    selectedLayer: any;
    isFileMenuShown: boolean;

    constructor(private appRef: ApplicationRef){}

    ngOnInit(): void {
        this.indicators = [
            { id: 'none', name: 'None' },
            { id: 'area', name: 'Area', features: ['tutupanLahan', 'bangunan'], subFeature: null },
            { id: 'electricity', name: 'Electricity' },
            { id: 'water', name: 'Water' },
            { id: 'population', name: 'Population' },
       ];

       this.indicator = this.indicators.filter(e => e.id === 'area')[0];

       dataApi.getDesaMapMetadata('alas', (result) => {
           this.village = result;
       });
    }

    onLayerSelected(layer: any): void {
        this.selectedLayer = layer;
        console.log(layer);
    }

    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
      
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }
}
