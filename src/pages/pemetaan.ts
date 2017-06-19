import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector } from "@angular/core";
import { remote, shell } from "electron";
import {NgProgressService} from "ng2-progressbar";
import { ToastsManager } from 'ng2-toastr';

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
    afterSaveAction: string;

    options = {
        minimum: 0.08,
        maximum: 1,
        ease: 'linear',
        positionUsing: 'translate3d',
        speed: 200,
        trickleSpeed: 300,
        showSpinner: true,
        direction: "leftToRightIncreased",
        color: '#CC181E',
        thick: true
    };

    @ViewChild(MapComponent)
    private map: MapComponent;

    constructor(private resolver: ComponentFactoryResolver, 
                private injector: Injector, 
                private appRef: ApplicationRef,
                vcr: ViewContainerRef, 
                public toastr: ToastsManager,
                private pService: NgProgressService){ 

        this.toastr.setRootViewContainerRef(vcr);
     }

    ngOnInit(): void {
       titleBar.title("Pemetaan - " +dataApi.getActiveAuth()['desa_name']);
       titleBar.blue();

       this.activeLayer = null;
       this.diffTracker = new DiffTracker();

       this.indicators = [
            {"id": 'landuse', "name": 'Tutupan Lahan'},
            {"id": 'boundary', "name": 'Batas'},
            {"id": 'building', "name": 'Bangunan'},
            {"id": 'electricity', "name": 'Listrik'},
            {"id": 'highway', "name": 'Jalan'}];
       
       this.indicator = this.indicators.filter(e => e.id === 'landuse')[0];

        document.addEventListener('keyup', (e) => {
            if (e.ctrlKey && e.keyCode === 83) {
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);
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
        this.map.setLegend();     
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
            $("#modal-save-diff")['modal']("hide");
           
            if(err){
                this.toastr.error('Peta gagal disimpan', '');  
                return;
            }

            this.toastr.success('Peta berhasil disimpan', '');
            
        });
    }

    redirectMain(): void {
        let bundleData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, "map.json")));
        let currentData = this.map.mappingData;
        this.currentDiff = this.diffTracker.trackDiffMapping(bundleData['data'], currentData['data']);

        this.afterSaveAction = 'home';

        if(this.currentDiff.total === 0)
            document.location.href = "app.html";
        else
            this.openSaveDialog();
    }

    forceQuit(): void {
        document.location.href="app.html";
    }
}
