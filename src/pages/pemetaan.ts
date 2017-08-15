import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector } from "@angular/core";
import { remote, shell } from "electron";
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Diff, DiffTracker } from "../helpers/diffTracker";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as path from 'path';
import * as uuid from 'uuid';

import DataApiService from '../stores/dataApiService';
import titleBar from '../helpers/titleBar';
import MapComponent from '../components/map';
import PopupPaneComponent from '../components/popupPane';
import MapUtils from '../helpers/mapUtils';

var $ = require('jquery');
var base64 = require("uuid-base64");
var rrose = require('./lib/leaflet-rrose/leaflet.rrose-src.js');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const MAP_DIR = path.join(CONTENT_DIR, 'map.json');

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent{
    progress: Progress;
    progressMessage: string;
    perkabig: any;
    bundleData: any;
    bundleSchemas: any;
    latitude: number;
    longitude: number;
    indicators: any;
    selectedIndicator: any;
    selectedUploadedIndicator: any;
    selectedFeature: any;
    activeLayer: any;
    currentDiffs: any;
    selectedDiff: any;
    afterSaveAction: any;
    center: any;

    popupPaneComponent: ComponentRef<PopupPaneComponent>;
    
    @ViewChild(MapComponent)
    private map: MapComponent

    constructor(private resolver: ComponentFactoryResolver, 
                private injector: Injector, 
                private appRef: ApplicationRef,
                private vcr: ViewContainerRef, 
                public toastr: ToastsManager,
                private dataApiService: DataApiService){
                    this.toastr.setRootViewContainerRef(vcr);
                }

    ngOnInit(): void {
        titleBar.title("Data Penduduk - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
    
        this.perkabig = jetpack.cwd(__dirname).read('perkabig.json', 'json');
        this.map.perkabig = this.perkabig;
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        this.progressMessage = '';
        this.bundleData = {};
        this.bundleSchemas = {};
        this.center = [0, 0];

        this.indicators = this.perkabig;
        this.selectedIndicator = this.indicators[0];
        this.setLegend();
        
        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];
            this.bundleData[indicator.id] = [];
            this.bundleSchemas[indicator.id] = [];
        }

        this.selectedDiff = this.indicators[0];

        document.addEventListener('keyup', (e) => {
            if (e.ctrlKey && e.keyCode === 83) {
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.ctrlKey && e.keyCode === 80) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);

        setTimeout(() => {
            this.getContent();
        }, 100);
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

    getContent(): void {
        let localBundle = this.dataApiService.getLocalContent('map', this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.center = localBundle['center'];

        this.progressMessage = 'Memuat data';

        this.dataApiService.getContent('map', null, changeId, this.progressListener.bind(this)).subscribe(
            result => {
                if(result['change_id'] === localBundle.changeId){
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    this.synchronizeDiffs(mergedResult);
                    this.map.setMapData(mergedResult['data']);
                    this.map.center = localBundle['center'];
                    this.map.setMap();
                    return;
                }

                mergedResult = this.mergeContent(result, localBundle);
                
                this.checkAndNotifyDiffs(result);
                this.dataApiService.writeFile(mergedResult, MAP_DIR, null);
                this.synchronizeDiffs(mergedResult);
            },
            error => {
                mergedResult = this.mergeContent(localBundle, localBundle);

                this.toastr.error('Data tidak ditemukan');
                this.map.setMapData(mergedResult['data']);
                this.map.center = localBundle['center'];
                this.map.setMap();
            }
        )
    }

    saveContent(isTrackingDiff: boolean): void {
        $('#modal-save-diff').modal('hide');
        $('#modal-upload-map')['modal']('hide');
        
        this.bundleData = this.map.mapData;
        
        let localBundle = this.dataApiService.getLocalContent('map', this.bundleSchemas);
        
        localBundle['center'] = [parseFloat(this.center[0]), parseFloat(this.center[1])];

        if(isTrackingDiff){
            let diffs = this.trackDiffs(localBundle["data"], this.bundleData);
            let keys = Object.keys(diffs);

            for(let i=0; i<keys.length; i++){
                let diff = diffs[keys[i]];

                if(diff && diff.total > 0)
                   localBundle['diffs'][keys[i]] = localBundle['diffs'][keys[i]].concat(diff);
            }
        }

        this.progressMessage = 'Menyimpan Data';

        this.dataApiService.saveContent('map', null, localBundle, this.bundleSchemas, this.progressListener.bind(this))
            .finally(() => {
                this.dataApiService.writeFile(localBundle, MAP_DIR, this.toastr);
            })
            .subscribe(
                result => {
                      let mergedResult = this.mergeContent(result, localBundle);
                      mergedResult = this.mergeContent(localBundle, mergedResult);

                      for(let i=0; i<this.indicators.length; i++){
                          localBundle['diffs'][this.indicators[i].id] = [];
                          localBundle['data'][this.indicators[i].id] = mergedResult['data'][this.indicators[i].id];
                      }

                      this.map.setMapData(localBundle['data']);
                      this.map.center = localBundle['center'];
                      this.map.setMap();
                },
                error => {
                    this.toastr.error('Data gagal disimpan ke server');
                }
            )
    }

    synchronizeDiffs(bundle): void {
        let diffExists = false;

        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];  
            if(bundle['diffs'][indicator.id] && bundle['diffs'][indicator.id].length > 0){
                diffExists = true;
                break;
            }   
        }
      
        if(!diffExists){
            this.map.setMapData(bundle['data']);
            this.map.center = bundle['center'];
            this.map.setMap();
            return;
        }

        this.saveContent(false);
    }

    checkAndNotifyDiffs(serverData): void {
        if(serverData["diffs"]){
            for(let i=0; i<this.indicators.length; i++){
                let indicator = this.indicators[i];

                if (serverData["diffs"][indicator.id].length > 0){
                    this.toastr.info("Terdapat " + serverData["diffs"][indicator.id].length 
                        + " perubahan pada data " + indicator.name);
                } 
            }
        }
    }

    trackDiffs(localData, realTimeData): any {
        let result = {};

        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];

            if(!localData[indicator.id] || !realTimeData[indicator.id])
                continue;

            result[indicator.id] = 
                this.dataApiService.diffTracker.trackDiffMapping(localData[indicator.id], realTimeData[indicator.id]);    
        }

        return result;
    }

    mergeContent(newBundle, oldBundle): void {
        let oldDiffs = {};
        let newDiffs = {};
        let keys = this.indicators.map(e => e.id);

        if(newBundle['diffs']){
            for(let i=0; i<keys.length; i++){
                let key = keys[i];
                
                if(newBundle.diffs[key]){
                    oldDiffs[key] = oldBundle.diffs[key];
                    newDiffs[key] = newBundle.diffs[key];
                    oldBundle['data'][key] = this.dataApiService.mergeDiffsMap(newDiffs[key], oldBundle['data'][key]);
                }
            }
        }
        else {
            oldBundle['data'] = newBundle['data'];
        }

        if(newBundle['center'][0] > 0 && newBundle['center'][0] > 0)
            oldBundle['center'] = newBundle['center'];
            
        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    openSaveDialog(): void {
         let bundleData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, "map.json")));
        let currentData = this.map.mapData;
        let diffExits = false;
        let index = 1;

        this.currentDiffs = this.trackDiffs(bundleData["data"], this.map.mapData);
        
        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];

            if(this.currentDiffs[indicator.id] && this.currentDiffs[indicator.id].total > 0){
                diffExits = true;
                break;
            }
        }
        
        if (diffExits) {
            this.afterSaveAction = null;
            $('#modal-save-diff')['modal']('show');
        }
        else {
            this.toastr.custom('<span style="color: red">Tidak ada data yang berubah.</span>', null, { enableHTML: true });
        }
    }

    openUploadDialog(): void {
        $('#modal-upload-map')['modal']('show');
    }

    changeIndicator(indicator): void {
        this.selectedIndicator = indicator;
        this.map.indicator = indicator;
        this.map.clearMap();
        this.map.loadGeoJson();
        this.setLegend();
    }

    setLegend(): void {
        
    }

    selectFeature(feature): void {
        this.selectedFeature = feature;
        this.configurePopupPane(feature);
    }

    configurePopupPane(feature): void {
        let popup: L.Popup = new rrose({ offset: new L.Point(0, 10), closeButton: false, autoPan: false });
        popup.setLatLng(feature);
        //let popup: L.Popup = new L.Popup();
        
        if(this.popupPaneComponent)
            this.popupPaneComponent.destroy();
        
        const compFactory = this.resolver.resolveComponentFactory(PopupPaneComponent);

        this.popupPaneComponent = compFactory.create(this.injector);
        this.popupPaneComponent.instance['selectedIndicator'] = this.selectedIndicator;
        this.popupPaneComponent.instance['selectedFeature'] = this.selectedFeature;

        if (this.appRef['attachView']) {
            this.appRef['attachView'](this.popupPaneComponent.hostView);
            
            this.popupPaneComponent.onDestroy(() => {
                this.appRef['detachView'](this.popupPaneComponent.hostView);
            });
        }
        
        else {
            this.appRef['registerChangeDetector'](this.popupPaneComponent.changeDetectorRef);
            
            this.popupPaneComponent.onDestroy(() => {
                this.appRef['unregisterChangeDetector'](this.popupPaneComponent.changeDetectorRef);
            });
        }

        let div = document.createElement('div');
        div.appendChild(this.popupPaneComponent.location.nativeElement);
        popup.setContent(div);
        
        this.selectedFeature.bindPopup(popup);
    }

    onFileUploadChange(event): void {
        if(!this.selectedUploadedIndicator){
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        if(event.target.files.length === 0)
            return;

        this.selectedUploadedIndicator['path'] = event.target.files[0].path;
    }

    uploadContent(): void {
        if(!this.selectedUploadedIndicator){
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        if(!this.selectedUploadedIndicator.path){
            this.toastr.error('File geojson indikator ' + this.selectedUploadedIndicator.label + ' tidak ditemukan');
            return;
        }
        
        this.dataApiService.uploadContentMap(this.selectedUploadedIndicator.id, this.selectedUploadedIndicator.path, this.bundleData, this.progressListener.bind(this))
            .subscribe(
                result => {
                    this.bundleData[this.selectedUploadedIndicator.id] = this.bundleData[this.selectedUploadedIndicator.id].concat(result.data); 
                    this.map.setMapData(this.bundleData);
                    this.toastr.success('Upload data ' + this.selectedUploadedIndicator.label + ' berhasil');
                },
                error => {
                    this.toastr.error('Tidak dapat melakukan upload data');
                }
        );
    }

    redirectMain(): void {
        let bundleData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, "map.json")));
        let currentData = this.map.mapData;
        let diffExits = false;
        this.currentDiffs = this.trackDiffs(bundleData["data"], this.map.mapData);
       
        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];

            if(this.currentDiffs[indicator.id] && this.currentDiffs[indicator.id].total > 0){
                diffExits = true;
                break;
            }
        }
        
        if (diffExits) {
            this.openSaveDialog();
        }
        else {
            document.location.href = "app.html";
        }
    }

    forceQuit(): void {
        document.location.href="app.html";
    }

    switchDiff(indicator): boolean {
        if(this.currentDiffs[indicator.id])
              this.selectedDiff = indicator;

        return false;
    }

    progressListener(progress: Progress){
        this.progress = progress;
    }
}
