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
    subIndicators: any[];

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

       this.indicators = [
            {"id": 'landuse', "name": 'Tutupan Lahan'},
            {"id": 'boundary', "name": 'Batas'},
            {"id": 'building', "name": 'Bangunan'},
            {"id": 'electricity', "name": 'Listrik'},
            {"id": 'highway', "name": 'Jalan'}]

       this.indicator = this.indicators.filter(e => e.id === 'landuse')[0];

       dataApi.getDesaMapMetadata('alas', (result) => {
           this.village = result;
       });
    }

    onIndicatorChange(indicator): void {
        this.indicator = indicator;
        this.map.indicator = indicator;
        this.subIndicators = [];
        this.map.loadGeoJson();
    }

    onLayerSelected(layer: any): void {
        this.selectedLayer = layer;
        this.subIndicators = [];
    }

    onTypeChange(): void {
        this.subIndicators = this.getSubIndicators(this.selectedLayer);
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

    getSubIndicators(layer): any[] {
        let subIndicators = [];

        if(this.indicator.id === 'landuse'){
            switch(layer.feature.properties.type){
                case 'farmland':
                    subIndicators = [{
                        "id": 'crop',
                        "name": 'Tanaman'
                    }];
                break;
                case 'orchard':
                    subIndicators = [{
                        "id": 'trees',
                        "name": "Pohon"
                    }]
                    break;
                case 'forest':
                    subIndicators = [{
                        "id": 'trees',
                        "name": "Pohon"
                    }]
                    break;
                case 'river':
                    subIndicators = [{
                        "id": 'name',
                        "name": "Nama"
                    },{
                        "id": 'width',
                        "name": "Panjang"
                    }]
                    break;
                case 'spring':
                    subIndicators = [{
                        "id": 'drinking_water',
                        "name": "Bisa Diminum"
                    }]
                    break;
            }
        }

        else if(this.indicator.id === 'boundary'){
            subIndicators = [{"id": 'admin_level', "name": "Level"}];
        }

        else if(this.indicator.id === 'building'){
            switch(layer.feature.properties.type){
                case 'school':
                    subIndicators = [{"id": "capacity", "name": "Kapasitas"}, { "id": "name", "name": "Nama"}, {"id": "addr", "name": "Alamat"}, {"id": "isced", "name": "ISCED"}];
                    break;
                case 'place_of_worship':
                    subIndicators = [{"id": "building", "name": "Jenis Tempat"}, { "id": "religion", "name": "Agama"}, {"id": "name", "name": "Nama"}];
                    break;
                case 'waterwell':
                    subIndicators = [{"id": "pump", "name": "Pompa"}, {"id": "drinking_water", "name": "Bisa Diminum"}];
                    break;
                case 'drain':
                    subIndicators = [{"id": "width", "name": "Panjang"}];
                    break;
                case "toilets":
                    subIndicators = [{"id": "access", "name": "Akses"}];
                    break;
                case "pitch":
                    subIndicators = [{"id": "sport", "name": "Olahraga"}, { "id": "surface", "name": "Permukaan"}];
                    break;
                case 'marketplace':
                    subIndicators = [{"id": "opening_hours", "name": "Jam Buka"}, { "id": "name", "name": "Nama"}];
                    break;
            }
        }
        
        return subIndicators;
    }
}
