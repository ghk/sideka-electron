import { Component, ApplicationRef, ViewChild } from "@angular/core";
import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import dataApi from '../stores/dataApi';
import titleBar from '../helpers/titleBar';
import MapComponent from '../components/map';

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
    tags: any[];

    @ViewChild(MapComponent)
    private map: MapComponent;

    constructor( private appRef: ApplicationRef){ }

    ngOnInit(): void {
        /*
        this.tags = [{"id": 'satellite', "name": 'Satelit'}, 
            {"id": 'area', "name": 'Tutupan Lahan'},
            {"id": 'border', "name": 'Batas'},
            {"id": 'building', "name": 'Bangunan'},
            {"id": 'street', "name": 'Jalan'},
            {"id": 'electricity', "name": 'Listrik'},
            {"id": 'water', "name": 'Air'}];

        this.indicators = [
            { id: 'satellite', name: 'Satelit' },
            { id: 'area', name: 'Area', features: ['tutupanLahan'], subFeature: null },
            { id: 'building', name: 'Bangunan', features: ['bangunan'], subFeature: null },
            { id: 'electricity', name: 'Listrik', features: ['batasan', 'bangunan'], subFeature: 'dusun' },
            { id: 'water', name: 'Air', features: ['bangunan', 'batasan'], subFeature: 'dusun' },
            { id: 'population', name: 'Populasi' },
       ];*/

       this.indicators = [{"id": 'satellite', "name": 'Satelit'},
            {"id": 'landuse', "name": 'Tutupan Lahan'},
            {"id": 'boundary', "name": 'Batas'},
            {"id": 'building', "name": 'Bangunan'},
            {"id": 'electricity', "name": 'Listrik'},
            {"id": 'highway', "name": 'Jalan'}]

       this.indicator = this.indicators.filter(e => e.id === 'landuse')[0];

       dataApi.getDesaMapMetadata('leu', (result) => {
           this.village = result;
       });
    }

    onIndicatorChange(indicator): void {
        this.indicator = indicator;
        this.map.indicator = indicator;
        this.map.loadGeoJson();
    }

    onLayerSelected(layer: any): void {
        this.selectedLayer = layer;
        console.log(this.selectedLayer);
    }

    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
      
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }

    saveContent(): void {
        dataApi.saveContent('map', null, {}, {}, (err, result) => {

        });
    }
}
