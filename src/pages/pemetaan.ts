import { Component, ApplicationRef, ViewChild, ComponentRef, ComponentFactoryResolver, Injector } from "@angular/core";
import { remote, shell } from "electron";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as path from 'path';

import dataApi from '../stores/dataApi';

import titleBar from '../helpers/titleBar';
import { Diff, DiffTracker } from "../helpers/diffTracker";

import MapComponent from '../components/map';
import PopupPaneComponent from '../components/popupPane';
import MapUtils from '../helpers/mapUtils';

var $ = require('jquery');

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
    currentDiff: Diff;
    diffTracker: DiffTracker;
    activeLayer: string;
    compRef: ComponentRef<PopupPaneComponent>;

    @ViewChild(MapComponent)
    private map: MapComponent;

    constructor(private resolver: ComponentFactoryResolver, 
                private injector: Injector, 
                private appRef: ApplicationRef){ }

    ngOnInit(): void {
       this.activeLayer = null;
       this.diffTracker = new DiffTracker();

       this.indicators = [
            {"id": 'landuse', "name": 'Tutupan Lahan'},
            {"id": 'boundary', "name": 'Batas'},
            {"id": 'building', "name": 'Bangunan'},
            {"id": 'electricity', "name": 'Listrik'},
            {"id": 'highway', "name": 'Jalan'}]

       this.indicator = this.indicators.filter(e => e.id === 'landuse')[0];
    }

    setActiveLayer(layer): void {
        if(this.activeLayer === layer){
            this.activeLayer = null;
            this.map.removeLayer(layer);
        }
        else{
            this.activeLayer = layer;
            this.map.setLayer(layer);
        }
    }

    onIndicatorChange(indicator): void {
        this.indicator = indicator;

        this.map.clearMap();
        this.map.indicator = indicator;
        this.map.loadGeoJson();
        
        let legendAttributes = null;

        if(this.indicator.id === 'building')
            legendAttributes = MapUtils.BUILDING_COLORS;
        else if(this.indicator.id === 'landuse')
            legendAttributes = MapUtils.LANDUSE_COLORS;
            
        if(!legendAttributes)
            return;
        
        this.map.control = new L.Control();
        this.map.control.onAdd = (map: L.Map) => {
            var div = L.DomUtil.create('div', 'info legend');
            legendAttributes.forEach(legendAttribute => {
                div.innerHTML += '<i style="background:' + legendAttribute.color + '"></i>' + legendAttribute.description + '<br/>';
            });
            return div;
        };
        this.map.control.setPosition('topright');
        this.map.control.addTo(this.map.map);
    }
    
    onLayerSelected(layer: any): void {
        this.selectedLayer = layer;
    
        let popup = L.popup();

        if(this.compRef)
            this.compRef.destroy();
        
        const compFactory = this.resolver.resolveComponentFactory(PopupPaneComponent);
        this.compRef = compFactory.create(this.injector);

        this.compRef.instance['indicators'] = this.indicators;
        this.compRef.instance['selectedLayer'] = this.selectedLayer;
        this.compRef.instance['selectedIndicator'] = this.indicator;

        if(this.selectedLayer.feature.properties.type)
            this.compRef.instance['loadSubIndicators'](this.indicator.id, this.selectedLayer);

        if (this.appRef['attachView']) {
            this.appRef['attachView'](this.compRef.hostView);
            
            this.compRef.onDestroy(() => {
                this.appRef['detachView'](this.compRef.hostView);
            });
        }
        else {
            this.appRef['registerChangeDetector'](this.compRef.changeDetectorRef);
            
            this.compRef.onDestroy(() => {
                this.appRef['unregisterChangeDetector'](this.compRef.changeDetectorRef);
            });
        }

        let div = document.createElement('div');
        div.appendChild(this.compRef.location.nativeElement);
        popup.setContent(div);
        layer.bindPopup(popup);
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
}
