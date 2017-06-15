import { Component, ApplicationRef, ViewChild } from "@angular/core";
import { remote, shell } from "electron";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as path from 'path';

import dataApi from '../stores/dataApi';

import titleBar from '../helpers/titleBar';
import { Diff, DiffTracker } from "../helpers/diffTracker";

import MapComponent from '../components/map';

var $ = require('jquery');

interface SubIndicator{
    id: string;
    label: string;
    type: string;
    order?: number;
    options?: any[]
};

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent {
    indicators: any[];
    indicator: any;
    selectedLayer: any;
    isFileMenuShown: boolean;
    subIndicators: SubIndicator[];
    currentDiff: Diff;
    diffTracker: DiffTracker;

    @ViewChild(MapComponent)
    private map: MapComponent;

    constructor(private appRef: ApplicationRef){ }

    ngOnInit(): void {
       this.diffTracker = new DiffTracker();

       this.indicators = [
            {"id": 'landuse', "name": 'Tutupan Lahan'},
            {"id": 'boundary', "name": 'Batas'},
            {"id": 'building', "name": 'Bangunan'},
            {"id": 'electricity', "name": 'Listrik'},
            {"id": 'highway', "name": 'Jalan'}]

       this.indicator = this.indicators.filter(e => e.id === 'landuse')[0];
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

        if(this.selectedLayer.feature.properties.type)
            this.subIndicators = this.loadSubIndicators(this.indicator.id, this.selectedLayer);
    }

    onTypeChange(): void {
        this.subIndicators = this.loadSubIndicators(this.indicator.id, this.selectedLayer);
    }

    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
      
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }

    openSaveDialog(): void {
        let bundleData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, "map.json")));
        let currentData = this.map.mappingData;
        this.currentDiff = this.diffTracker.trackDiffMapping(bundleData['data'], currentData['data']);

        if(this.currentDiff.total > 0){
            $("#modal-save-diff")['modal']("show");

            setTimeout(() => {
                $("button[type='submit']").focus();
            }, 500);
        }
    }

    saveContent(): void {
        dataApi.saveContentMap(this.map.mappingData['data'], (err, result) => {
            if(!err)
                $("#modal-save-diff")['modal']("hide");
        });
    }

    loadSubIndicators(indicatorId, layer): SubIndicator[]{
        let subIndicators: SubIndicator[] = [];

        if(indicatorId === 'landuse'){
            switch(layer.feature.properties.type){
                case 'farmland':
                    subIndicators = [{id: 'crop', label: 'Tanaman', type: 'text'}];
                break;
                case 'orchard':
                    subIndicators = [{id: 'trees', label: 'Pohon', type: 'text'}];
                break;
                case 'forest':
                    subIndicators = [{id: 'trees', label: 'Pohon', type: 'text'}];
                break;
                case 'river':
                    subIndicators = [{id: 'name', label: 'Nama', type: 'text'}, {id: 'width', label: 'Panjang', type: 'text'}];
                break;
                case 'spring':
                    subIndicators = [{id: 'drinking_water', label: 'Air Minum', type: 'boolean'}];
                break;
            }
        }

        else if(indicatorId === 'boundary'){
            subIndicators = [{id: 'admin_level', label: 'Level', type: 'text'}];
        }

        else if(indicatorId === 'building'){
            switch(layer.feature.properties.type){
                case 'school':
                    subIndicators = [{id: 'capacity', label: 'Kapasitas', type: 'text'}, 
                                     {id: 'name', label: 'Nama', type: 'text'}, 
                                     {id: 'addr', label: 'Alamat', type: 'text'},
                                     {id: 'isced', label: 'Tingkat', type: 'option_object', 
                                      options: [{"value": 0, "label": 'PAUD/TK'}, 
                                                {"value": 1, "label": 'SD'},
                                                {"value": 2, "label": 'SMP'},
                                                {"value": 3, "label": 'SMA'},
                                                {"value": 4, "label": 'Universitas'}]}];
                break;
                case 'place_of_worship':
                    subIndicators = [{id: 'building', label: 'Bangunan', type: 'option', options: ['Masjid', 'Gereja', 'Vihara', 'Pura']}, 
                                     {id: 'religion', label: 'Agama', type: 'option', options: ['Islam', 'Kristen', 'Katolik', 'Buddha', 'Hindu']},
                                     {id: 'name', label: 'Name', type: 'text'}];
                break;     
                case 'waterwell':
                    subIndicators = [{id: 'pump', label: 'Pompa', type: 'text'}, 
                                     {id: 'drinking_water', label: 'Air Minum', type: 'boolean'}];
                break;              
                case 'drain':
                    subIndicators = [{id: 'width', label: 'Panjang', type: 'text'}];
                break;
                case 'toilets':
                    subIndicators = [{id: 'access', label: 'Akses', type: 'text'}];
                break;
                case 'pitch':
                    subIndicators = [{id: 'sport', label: 'Olahraga', type: 'text'}, {id: 'surface', label: 'Permukaan', type: 'text'}];
                break;
                case 'marketplace':
                    subIndicators = [{id: 'name', label: 'Nama', type: 'text'}, {id: 'opening_hours', label: 'Jam Buka', type: 'time'}]
                break;
            }
        }

        else if(indicatorId === 'highway'){
            switch(layer.feature.properties.type){
                case 'way':
                    subIndicators = [{id: 'highway', label: 'Jalan', type: 'text'},
                                     {id: 'name', label: 'Name', type: 'text'},
                                     {id: 'lanes', label: 'Jalur', type: 'text'},
                                     {id: 'lit', label: 'Lit', type: 'boolean'},
                                     {id: 'surface', label: 'Permukaan', type: 'text'},
                                     {id: 'incline', label: 'Incline', type: 'text'},
                                     {id: 'width', label: 'Panjang', type: 'text'},
                                     {id: 'one_way', label: 'Satu Jalur', type: 'boolean'}];
                    break;
                case 'bridge':
                    subIndicators = [{id: 'name', label: 'Nama', type: 'text'}];
                    break;
            }
        }

        return subIndicators;
    }
}
