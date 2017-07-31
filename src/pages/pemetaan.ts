import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector } from "@angular/core";
import { remote, shell } from "electron";
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Diff, DiffTracker } from "../helpers/diffTracker";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as path from 'path';

import dataApi from '../stores/dataApi';
import DataApiService from '../stores/dataApiService';
import titleBar from '../helpers/titleBar';
import MapComponent from '../components/map';
import PopupPaneComponent from '../components/popupPane';
import MapUtils from '../helpers/mapUtils';

var $ = require('jquery');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const MAP_DIR = path.join(CONTENT_DIR, 'map.json');

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent {
    progress: Progress;
    progressMessage: string;
    indicators: any;
    selectedIndicator: any;
    bundleData: any;
    bundleSchemas: any;
    latitude: number;
    longitude: number;
    currentDiffs: any;
    selectedDiff: any;
    selectedFeature: any;
    afterSaveAction: string;
    activeLayer: string;
    compRef: ComponentRef<PopupPaneComponent>;

    @ViewChild(MapComponent)
    private map: MapComponent;

    constructor(private resolver: ComponentFactoryResolver, 
                private injector: Injector, 
                private appRef: ApplicationRef,
                private vcr: ViewContainerRef, 
                public toastr: ToastsManager,
                private dataApiService: DataApiService){
                    this.toastr.setRootViewContainerRef(vcr);
                }
    
    ngOnInit(): void {
        titleBar.title("Pemetaan - " +dataApi.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        this.progressMessage = '';
        this.bundleData = {};
        this.bundleSchemas = {};
        this.latitude = 0;
        this.longitude = 0;
        this.indicators = [
            { id: 'center', name: null, path: null },
            { id: 'landuse', name: 'Tutupan Lahan', path: null },
            { id: 'building', name: 'Bangunan', path: null  },
            { id: 'boundary', name: 'Batas', path: null  },
            { id: 'electricity', name: 'Listrik', path: null  },
            { id: 'highway', name: 'Jalan', path: null  }
        ];

        this.selectedIndicator = this.indicators[1]
        
        for(let i=0; i<this.indicators.length; i++){
            let id = this.indicators[i].id;

            this.bundleData[id] = [];
            this.bundleSchemas[id] = [];
        }   

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

    onIndicatorChange(indicator): void {
        this.selectedIndicator = indicator;
        this.map.clearMap();
        this.map.indicator = indicator;
        this.map.loadGeoJson();
        this.map.setLegend();     
    }

    onFeatureSelected(feature: any): void {
        this.selectedFeature = feature;
    
        let popup = L.popup();

        if(this.compRef)
            this.compRef.destroy();
        
        const compFactory = this.resolver.resolveComponentFactory(PopupPaneComponent);
        this.compRef = compFactory.create(this.injector);

        this.compRef.instance['indicators'] = this.indicators;
        this.compRef.instance['selectedFeature'] = this.selectedFeature;
        this.compRef.instance['selectedIndicator'] = this.selectedIndicator;

        if(this.selectedFeature.feature.properties.type)
            this.compRef.instance['loadSubIndicators'](this.selectedIndicator.id, this.selectedFeature);

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
        feature.bindPopup(popup);
    }

    getContent(): void {
        let localBundle = this.dataApiService.getLocalContent('map', this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';

        this.dataApiService.getContent('map', null, changeId, this.progressListener.bind(this))
            .subscribe(
                result => {
                    if(result['change_id'] === localBundle.changeId){
                        mergedResult = this.mergeContent(localBundle, localBundle);
                        this.synchronizeDiffs(mergedResult);
                        this.map.setMapData(mergedResult['data']);
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
                    this.map.setMapData(mergedResult['data']);
                    this.map.setMap();
                    this.toastr.error('Data tidak ditemukan');
                }
            )
    }

    saveContent(isTrackingDiff: boolean): void {
        $('#modal-save-diff').modal('hide');
        $('#modal-upload-map')['modal']('hide');

        this.bundleData = this.map.mappingData;
        
        let localBundle = this.dataApiService.getLocalContent('map', this.bundleSchemas);

        if(isTrackingDiff){
            let diffs = this.trackDiffs(localBundle["data"], this.bundleData);

            for(let i=0; i<this.indicators.length; i++){
                let indicator = this.indicators[i];
                let diff = diffs[indicator.id];

                if(diff && diff.total > 0)
                    localBundle['diffs'][indicator.id] = localBundle['diffs'][indicator.id].concat(diff);
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
                      this.map.setMap();
                },
                error => {
                    this.toastr.error('Data gagal disimpan ke server');
                }
            )
    }

    openUploadDialog(): void {
        $('#modal-upload-map')['modal']('show');
    }

    onFileUploadChange(event, id): void {
        let indicator = this.indicators.filter(e => e.id === id)[0];

        if(!indicator){
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        indicator.path = event.target.files[0].path;
    }

    uploadContent(id): void {
        let indicator = this.indicators.filter(e => e.id === id)[0];
       
        if(!indicator){
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        if(!indicator.path){
            this.toastr.error('File geojson indikator ' + indicator.name + ' tidak ditemukan');
            return;
        }
        
        this.dataApiService.uploadContentMap(id, indicator.path, this.bundleData, this.progressListener.bind(this))
            .subscribe(
                result => {
                    this.bundleData[id] = result.data; 
                    this.map.setMapData(this.bundleData);
                    this.toastr.success('Upload data ' + indicator.name + ' berhasil');
                },
                error => {
                    this.toastr.error('Tidak dapat melakukan upload data');
                }
        );
    }

    saveAfterUpload(): void {
        this.bundleData['center'].push([this.latitude, this.longitude]);
        this.saveContent(true);
    }

    progressListener(progress: Progress){
        this.progress = progress;
    }

    mergeContent(newBundle, oldBundle): void {
        let oldDiffs = {};
        let newDiffs = {};

        if(newBundle['diffs']){
             for(let i=0; i<this.indicators.length; i++){
                let indicator = this.indicators[i];
                oldDiffs[indicator.id] = oldBundle.diffs[indicator.id];
                newDiffs[indicator.id] = newBundle.diffs[indicator.id];

                oldBundle['data'][indicator.id] = this.dataApiService.mergeDiffsMap(newDiffs[indicator.id], oldBundle['data'][indicator.id]);
            }
        }
        else {
            oldBundle['data'] = newBundle['data'];
        }

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    checkAndNotifyDiffs(serverData): void {
        if(serverData["diffs"]){
            for(let i=0; i<this.indicators.length; i++){
                let indicator = this.indicators[i];

                if (serverData["diffs"][indicator.id].length > 0)
                    this.toastr.info("Terdapat " + serverData["diffs"][indicator.id].length + " perubahan pada data " + indicator.name);
            }
        }
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
            this.map.setMap();
            return;
        }

        this.saveContent(false);
    }

    trackDiffs(localData, realTimeData): any {
        let result = {};

        for(let i=0; i<this.indicators.length; i++){
            if(i === 0)
              continue;
            
            let indicator = this.indicators[i];

            if(!localData[indicator.id] || !realTimeData[indicator.id])
                continue;

            result[indicator.id] = 
                this.dataApiService.diffTracker.trackDiffMapping(localData[indicator.id], realTimeData[indicator.id]);    
        }

        return result;
    }

    redirectMain(): void {
        let bundleData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, "map.json")));
        let currentData = this.map.mappingData;
        let diffExits = false;
        
        this.currentDiffs = this.trackDiffs(bundleData["data"], this.map.mappingData);
        this.selectedDiff = this.indicators[1];
        
        for(let i=0; i<this.indicators.length; i++){
            if(i === 0)
                continue;
            
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
            document.location.hash = "";
        }
    }

    forceQuit(): void {
        document.location.hash="app.html";
    }

    openSaveDialog(): void {
        let bundleData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, "map.json")));
        let currentData = this.map.mappingData;
        let diffExits = false;
        let index = 1;

        this.currentDiffs = this.trackDiffs(bundleData["data"], this.map.mappingData);
        
        for(let i=0; i<this.indicators.length; i++){
            if(i === 0)
                continue;
            
            let indicator = this.indicators[i];

            if(this.currentDiffs[indicator.id] && this.currentDiffs[indicator.id].total > 0){
                diffExits = true;
                break;
            }
        }
        
        if (diffExits) {
            this.selectedDiff = this.indicators[1];
            this.afterSaveAction = null;
            $('#modal-save-diff')['modal']('show');
        }
        else {
            this.toastr.custom('<span style="color: red">Tidak ada data yang berubah.</span>', null, { enableHTML: true });
        }
    }

     switchDiff(indicator): boolean {
        if(this.currentDiffs[indicator.id])
              this.selectedDiff = indicator;

        return false;
    }

}
