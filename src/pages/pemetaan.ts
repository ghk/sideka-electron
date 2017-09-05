import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector, OnInit, OnDestroy } from "@angular/core";
import { Router } from '@angular/router';
import { remote } from "electron";
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { Subscription } from 'rxjs';

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as uuid from 'uuid';
import * as $ from 'jquery';

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

import titleBar from '../helpers/titleBar';
import MapUtils from '../helpers/mapUtils';
import MapComponent from '../components/map';
import PopupPaneComponent from '../components/popupPane';

var base64 = require("uuid-base64");
var rrose = require('./lib/leaflet-rrose/leaflet.rrose-src.js');
var html2canvas = require('html2canvas');

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent implements OnInit, OnDestroy {
    progress: Progress;
    progressMessage: string;
    bigConfig: any;
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
    mapSubscription: Subscription;
    documentKeyupListener: any;
    uploadMessage: string;
    isDataEmpty: boolean;
    popupPaneComponent: ComponentRef<PopupPaneComponent>;
 
    @ViewChild(MapComponent)
    private map: MapComponent

    constructor(
        private router: Router,
        private resolver: ComponentFactoryResolver,
        private injector: Injector,
        private appRef: ApplicationRef,
        private vcr: ViewContainerRef,
        private toastr: ToastsManager,
        private dataApiService: DataApiService,
        private sharedService: SharedService
    ) {
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Pemetaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.bigConfig = jetpack.cwd(__dirname).read('bigConfig.json', 'json');
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        this.progressMessage = '';
        this.bundleData = {};
        this.bundleSchemas = {};
        this.center = {};

        if(jetpack.exists(this.sharedService.getCenterFile()))
            this.center = JSON.parse(jetpack.read(this.sharedService.getCenterFile()));

        this.indicators = this.bigConfig;
        this.selectedIndicator = this.indicators[0];
        this.setLegend();

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];
            this.bundleData[indicator.id] = [];
            this.bundleSchemas[indicator.id] = [];
        }

        this.selectedDiff = this.indicators[0];

        this.documentKeyupListener = (e) => {
            // ctrl+s
            if (e.ctrlKey && e.keyCode === 83) {
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            // ctrl+p
            else if (e.ctrlKey && e.keyCode === 80) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        document.addEventListener('keyup', this.documentKeyupListener, false);

        setTimeout(() => {
            this.getContent();
        }, 100);
    }

    ngOnDestroy(): void {
        if(this.mapSubscription)
            this.mapSubscription.unsubscribe();

        document.removeEventListener('keyup', this.documentKeyupListener, false);
        titleBar.removeTitle();
    }

    setActiveLayer(layer): void {
        if (this.activeLayer === layer) {
            this.activeLayer = null;
            this.map.removeLayer(layer);
        }
        else {
            this.activeLayer = layer;
            this.map.setLayer(layer);
        }
    }

    getContent(): void {
        let localBundle = this.dataApiService.getLocalContent('pemetaan', this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;
       
        if(!jetpack.exists(this.sharedService.getCenterFile()))
            this.dataApiService.writeFile(this.center, this.sharedService.getCenterFile(), null);
        
        this.progressMessage = 'Memuat data';

        this.mapSubscription = this.dataApiService.getContent('pemetaan', null, changeId, this.progressListener.bind(this)).subscribe(
            result => {
                if (result['change_id'] === localBundle.changeId) {
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    this.map.setMapData(mergedResult['data']);
                    this.bundleData = mergedResult['data'];
                    this.synchronizeDiffs(mergedResult);
                    this.checkMapData();
                    return;
                }

                mergedResult = this.mergeContent(result, localBundle);

                this.checkAndNotifyDiffs(result);
                this.bundleData = mergedResult['data'];
                this.dataApiService.writeFile(mergedResult, this.sharedService.getPemetaanFile(), null);
                this.synchronizeDiffs(mergedResult);
            },
            error => {
                mergedResult = this.mergeContent(localBundle, localBundle);
                this.bundleData = mergedResult['data'];
                this.toastr.error('Data tidak ditemukan');
                this.map.setMapData(mergedResult['data']);
                this.setCenter(mergedResult['data'], false);
                this.map.setMap();
            }
        )
    }

    saveContent(isTrackingDiff: boolean): void {
        $('#modal-save-diff')['modal']('hide');
        $('#modal-upload-map')['modal']('hide');

        this.bundleData = this.map.mapData;

        let localBundle = this.dataApiService.getLocalContent('pemetaan', this.bundleSchemas);

        localBundle['center'] = [parseFloat(this.center[0]), parseFloat(this.center[1])];

        if (isTrackingDiff) {
            let diffs = this.trackDiffs(localBundle["data"], this.bundleData);
            let keys = Object.keys(diffs);

            for (let i = 0; i < keys.length; i++) {
                let diff = diffs[keys[i]];

                if (diff && diff.total > 0)
                    localBundle['diffs'][keys[i]] = localBundle['diffs'][keys[i]].concat(diff);
            }
        }

        this.progressMessage = 'Menyimpan Data';
        
        this.dataApiService.saveContent('pemetaan', null, localBundle, this.bundleSchemas, this.progressListener.bind(this))
            .finally(() => {
                this.dataApiService.writeFile(localBundle, this.sharedService.getPemetaanFile(), this.toastr);
            })
            .subscribe(
                result => {
                    let mergedResult = this.mergeContent(result, localBundle);
                    mergedResult = this.mergeContent(localBundle, mergedResult);

                    for (let i = 0; i < this.indicators.length; i++) {
                        localBundle['diffs'][this.indicators[i].id] = [];
                        localBundle['data'][this.indicators[i].id] = mergedResult['data'][this.indicators[i].id];
                    }

                    this.map.setMapData(mergedResult['data']);
                    this.map.center = localBundle['center'];
                    this.setCenter(mergedResult['data'], true);
                    this.map.setMap();
                },
                error => {
                    this.toastr.error('Data gagal disimpan ke server');
                }
            )
    }

    checkMapData(): void {
        this.isDataEmpty = true;

        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];

            if(!this.map.mapData || !this.map.mapData[indicator.id])
                continue;

            if(this.map.mapData[indicator.id].length > 0){
                this.isDataEmpty = false;
                break;
            }
        }
    }

    synchronizeDiffs(bundle): void {
        let diffExists = false;

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];
            if (bundle['diffs'][indicator.id] && bundle['diffs'][indicator.id].length > 0) {
                diffExists = true;
                break;
            }
        }

        if (!diffExists) {
            this.setCenter(bundle['data'], false);
            this.map.setMap();
            return;
        }

        this.saveContent(false);
    }

    checkAndNotifyDiffs(serverData): void {
        if (serverData["diffs"]) {
            for (let i = 0; i < this.indicators.length; i++) {
                let indicator = this.indicators[i];

                if (serverData["diffs"][indicator.id].length > 0) {
                    this.toastr.info("Terdapat " + serverData["diffs"][indicator.id].length
                        + " perubahan pada data " + indicator.name);
                }
            }
        }
    }

    trackDiffs(localData, realTimeData): any {
        let result = {};

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];

            if (!localData[indicator.id] || !realTimeData[indicator.id])
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

        if (newBundle['diffs']) {
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];

                if (newBundle.diffs[key]) {
                    oldDiffs[key] = oldBundle.diffs[key];
                    newDiffs[key] = newBundle.diffs[key];
                    oldBundle['data'][key] = this.dataApiService.mergeDiffsMap(newDiffs[key], oldBundle['data'][key]);
                }
            }
        }
        else {
            oldBundle['data'] = newBundle['data'];
        }

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    openSaveDialog(): void {
        let localBundle = this.dataApiService.getLocalContent('pemetaan', this.bundleSchemas);
        let currentData = this.map.mapData;
        let diffExits = false;
        let index = 1;

        this.currentDiffs = this.trackDiffs(localBundle["data"], this.map.mapData);

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];

            if (this.currentDiffs[indicator.id] && this.currentDiffs[indicator.id].total > 0) {
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

    openImportDialog(): void {
        $('#modal-import-map')['modal']('show');
    }

    changeIndicator(indicator): void {
       

        let center = JSON.parse(jetpack.read(this.sharedService.getCenterFile()));

        this.selectedIndicator = indicator;
        this.map.indicator = indicator;
        this.map.clearMap();
        this.map.loadGeoJson();
        this.setCenter(this.bundleData, false);
        this.setLegend();

        if(this.map.mapData[indicator.id].length === 0)
           this.toastr.warning('Data tidak tersedia, silahkan upload data');
    }

    showAll(): void {
        let data = this.map.mapData;
        let center = JSON.parse(jetpack.read(this.sharedService.getCenterFile()));
        let selectedCenter = center[this.indicators[0].id];

        this.map.clearMap();
        this.map.loadAllGeoJson();
        this.map.center = [selectedCenter[1], selectedCenter[0]];
    }

    setLegend(): void {
    }

    setCenter(bundleData, recalculate): void {
        if(!recalculate){
            if(jetpack.exists(this.sharedService.getCenterFile())){
                let file = JSON.parse(jetpack.read(this.sharedService.getCenterFile()));
                this.center[this.selectedIndicator.id] = file[this.selectedIndicator.id];
            }
        }
        else{
            if(bundleData[this.selectedIndicator.id]){
                this.center[this.selectedIndicator.id] = this.getCentroid(bundleData[this.selectedIndicator.id]);
                this.dataApiService.writeFile(this.center, this.sharedService.getCenterFile(), null);
            }
        } 

        if(!this.center[this.selectedIndicator.id])
            this.center[this.selectedIndicator.id] = [0, 0];

        this.map.center = [this.center[this.selectedIndicator.id][1], this.center[this.selectedIndicator.id][0]];
    }

    selectFeature(feature): void {
        this.selectedFeature = feature;
        this.configurePopupPane(feature);
    }

    configurePopupPane(feature): void {
        let popup: L.Popup = new rrose({ offset: new L.Point(0, 10), closeButton: false, autoPan: false });
        popup.setLatLng(feature);

        if(this.popupPaneComponent)
            this.popupPaneComponent.destroy();

        const compFactory = this.resolver.resolveComponentFactory(PopupPaneComponent);

        this.popupPaneComponent = compFactory.create(this.injector);

        this.popupPaneComponent.instance['selectedIndicator'] = this.selectedIndicator;
        this.popupPaneComponent.instance['selectedFeature'] = this.selectedFeature;
        this.popupPaneComponent.instance['map'] = this.map.map;
        
        this.popupPaneComponent.instance.onDeleteFeature.subscribe(
            v => { this.deleteFeature(v) }
        );

        this.popupPaneComponent.instance.addMarker.subscribe(
            marker => { this.map.addMarker(marker) }
        );

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
        if (!this.selectedUploadedIndicator) {
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        if (event.target.files.length === 0)
            return;

        this.selectedUploadedIndicator['path'] = event.target.files[0].path;
    }

    importContent(): void {
         this.isDataEmpty = false;

         let me = this;

         setTimeout(function() {
             let file = jetpack.read(me.selectedUploadedIndicator['path']);

             if(!file){
                 me.toastr.error('File tidak ditemukan');
                 return;
             }
        
             let jsonData = JSON.parse(file);
             let result = [];

             for(let i=0; i<jsonData.features.length; i++){
                 let feature = jsonData.features[i];
                 feature['id'] = base64.encode(uuid.v4());
                 feature['indicator'] = me.selectedUploadedIndicator.id;
                 feature['properties'] = {};
                 result.push(feature);
             }

             me.bundleData[me.selectedUploadedIndicator.id] = me.bundleData[me.selectedUploadedIndicator.id].concat(result)
             me.map.bigConfig = me.bigConfig;
            
             me.map.setMapData(me.bundleData);
             me.selectedIndicator = me.selectedUploadedIndicator;
             me.setCenter(me.bundleData, true);
             me.map.setMap();
            
             $('#modal-import-map')['modal']('hide');
         }, 200);
    }

    getCentroid(data): any[] {
        let result = [0, 0];

        if(data.length === 0)
            return result;

        let xCoordinates = [];
        let yCoordinates = [];
        let geometries = data.map(e => e.geometry);
        let coordinates = geometries.map(e => e.coordinates);

        for(let i=0; i<coordinates.length; i++){
            let coordinate = coordinates[i];

            for(let j=0; j<coordinate.length; j++){
                if(coordinate[j][0] instanceof Array){
                    for(let k=0; k<coordinate[j].length; k++){
                        xCoordinates.push(coordinate[j][k][0]);
                        yCoordinates.push(coordinate[j][k][1]);
                    }
                }
                else{
                    xCoordinates.push(coordinate[j][0]);
                    yCoordinates.push(coordinate[j][1]);
                }
            }
        }

        let xLength = xCoordinates.length;
        let yLength = yCoordinates.length;

        let sumX = xCoordinates.reduce((a, b) => { return a + b; });
        let sumY = yCoordinates.reduce((a, b) => { return a + b; });
        
        result[0] = sumX /xLength;
        result[1] = sumY /yLength;

        return result;
    }
    
    exportToImage(): void { 
       this.showAll();

       let me = this;

       setTimeout(() => {
            html2canvas($('#desaMap')[0], {
            allowTaint : true,
            useCORS: true
        }).then(canvas => {
            let dataURL = canvas.toDataURL("image/png");       
            window.open(dataURL);
            me.selectedIndicator = null;
        });
       }, 200);
    }

    delete(): void {
        let dialog = remote.dialog;
        let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'question',
            buttons: ['Batal', 'Hapus'],
            title: 'Hapus Feature',
            message: 'Semua feature pada indikator ' + this.selectedIndicator.label + ' ini akan dihapus, anda yakin?'
        });

        if (choice == 0)
            return;

        if(!this.selectedIndicator){
            this.toastr.error('Tidak ada indikator yang dipilih');
            return;
        }

        this.map.mapData[this.selectedIndicator.id] = [];
        this.map.setMap();
    }

    deleteFeature(id): void {
        let dialog = remote.dialog;
        let choice = dialog.showMessageBox(remote.getCurrentWindow(),
            {
                type: 'question',
                buttons: ['Batal', 'Hapus'],
                title: 'Hapus Feature',
                message: 'Feature ini akan dihapus, anda yakin?'
            });

        if (choice == 0)
            return;
        
        let feature = this.map.mapData[this.selectedIndicator.id].filter(e => e.id === id)[0];

        if(!feature){
            this.toastr.error("Feature tidak ditemukan");
            return;
        }

        let index = this.map.mapData[this.selectedIndicator.id].indexOf(feature);
        this.map.mapData[this.selectedIndicator.id].splice(index, 1);
        this.map.setMap();
    }

    redirectMain(): void {
        if(!jetpack.exists(this.sharedService.getPemetaanFile())){
            this.router.navigateByUrl('/');
            return;
        }
          
        let bundleData = JSON.parse(jetpack.read(this.sharedService.getPemetaanFile()));
        let currentData = this.map.mapData;
        let diffExits = false;
        this.currentDiffs = this.trackDiffs(bundleData["data"], this.map.mapData);

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];

            if (this.currentDiffs[indicator.id] && this.currentDiffs[indicator.id].total > 0) {
                diffExits = true;
                break;
            }
        }

        if (diffExits)
            this.openSaveDialog();
        else
           this.router.navigateByUrl('/');
    }

    forceQuit(): void {
        document.location.href = "app.html";
    }

    switchDiff(indicator): boolean {
        if (this.currentDiffs[indicator.id])
            this.selectedDiff = indicator;

        return false;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }
}
