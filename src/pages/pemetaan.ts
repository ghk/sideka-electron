import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector, OnInit, OnDestroy } from "@angular/core";
import { Router } from '@angular/router';
import { remote } from "electron";
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { Subscription } from 'rxjs';
import { PersistablePage } from '../pages/persistablePage';

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
import MapPrintComponent from '../components/mapPrint';
import PageSaver from '../helpers/pageSaver';

var base64 = require("uuid-base64");
var rrose = require('./lib/leaflet-rrose/leaflet.rrose-src.js');
var shapefile = require("shapefile");

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent implements OnInit, OnDestroy, PersistablePage {
    progress: Progress;
    progressMessage: string;
    bigConfig: any;
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
    uploadMessage: string;
    isDataEmpty: boolean;
    isPrintingMap: boolean;
    selectedFeatureToMove: any;
    oldIndicator: any;
    newIndicator: any;
    pageSaver: PageSaver;
    popupPaneComponent: ComponentRef<PopupPaneComponent>;
    modalSaveId;

    @ViewChild(MapComponent)
    private map: MapComponent

    @ViewChild(MapPrintComponent)
    private mapPrint: MapPrintComponent;

    constructor(
        private router: Router,
        private resolver: ComponentFactoryResolver,
        private injector: Injector,
        private appRef: ApplicationRef,
        private vcr: ViewContainerRef,
        private toastr: ToastsManager,
        public dataApiService: DataApiService,
        private sharedService: SharedService
    ) {
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this, sharedService, null, this.router, this.toastr);
    }

    ngOnInit(): void {
        titleBar.title("Data Pemetaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.isPrintingMap = false;
        this.bigConfig = jetpack.cwd(__dirname).read('bigConfig.json', 'json');
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        this.progressMessage = '';
        this.pageSaver.bundleData = {};
        this.pageSaver.bundleSchemas = {};
        this.indicators = this.bigConfig;
        this.selectedIndicator = this.indicators[0];
        this.activeLayer = 'Kosong';
        this.modalSaveId = 'modal-save-diff';

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];
            this.pageSaver.bundleData[indicator.id] = [];
            this.pageSaver.bundleSchemas[indicator.id] = [];
        }

        this.selectedDiff = this.indicators[0];

        document.addEventListener('keyup', this.keyupListener, false);

        setTimeout(() => {
            this.pageSaver.getContent('pemetaan', null, this.progressListener.bind(this), 
            (err, notifications, isSyncDiffs, result) => {
                if(err){
                    this.toastr.error(err);
                    this.map.setMapData(result['data']);
                    this.setCenter(result['data']);
                    this.map.setMap();
                    return;
                }

                notifications.forEach(notification => {
                    this.toastr.info(notification);
                });

                this.map.setMapData(result['data']);
                this.pageSaver.bundleData = result['data'];
                
                this.setCenter(result['data']);
                this.map.setMap();
                this.checkMapData();

                this.dataApiService.writeFile(result, this.sharedService.getPemetaanFile(), null);

                if(isSyncDiffs)
                   this.saveContent(false);
            });
        }, 100);
    }

    ngOnDestroy(): void {
        if(this.mapSubscription)
            this.mapSubscription.unsubscribe();

        document.removeEventListener('keyup', this.keyupListener, false);
        titleBar.removeTitle();
    }

    setActiveLayer(layer): boolean {
        if(this.activeLayer === layer)
            return;
    
        if(layer === 'Kosong'){
            if(this.activeLayer && this.activeLayer !== 'Kosong')
                this.map.removeLayer(this.activeLayer);
        }
        else {
            if(this.activeLayer !== 'Kosong')
                this.map.removeLayer(this.activeLayer);

            this.map.setLayer(layer);
        }

        this.activeLayer = layer;
        return false;
    }

    recenter(): void {
        let centroid = MapUtils.getCentroid(this.map.mapData[this.selectedIndicator.id]);
        this.map.map.setView([centroid[1], centroid[0]], 14);
    }

    openMoveFeatureModal(feature): void {
        this.selectedFeatureToMove = feature;
        this.oldIndicator = this.selectedIndicator;

        $('#modal-move-feature')['modal']('show');
    }

    moveFeatureToIndicator(): void {
        if(this.oldIndicator.id === this.newIndicator.id){
            this.toastr.error('Tidak dapat menambahkan feature ke indikator saat ini');
            return;
        }

        let featureInIndicator = this.map.mapData[this.oldIndicator.id].filter(e => e.id === this.selectedFeatureToMove.id)[0];

        if(!featureInIndicator){
            this.toastr.error('Feature tidak ditemukan');
            return;
        }

        let featureInIndicatorIdx = this.map.mapData[this.oldIndicator.id].indexOf(featureInIndicator);

        if(featureInIndicatorIdx > -1){
            this.map.mapData[this.oldIndicator.id].splice(featureInIndicatorIdx, 1);
            this.map.mapData[this.newIndicator.id].push(this.selectedFeatureToMove);
            this.map.setMap();
        }

        this.newIndicator = null;
        $('#modal-move-feature')['modal']('hide');
    }

    saveContent(isTrackingDiff: boolean): void {
        $('#modal-save-diff')['modal']('hide');
       
        this.pageSaver.bundleData = this.map.mapData;
        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent('pemetaan', null, isTrackingDiff, this.progressListener.bind(this), 
            (err, result) => {
            
            this.dataApiService.writeFile(result, this.sharedService.getPemetaanFile(), null);
            this.pageSaver.onAfterSave();

            if(this.pageSaver.afterSaveAction === 'home')
                return

            if(err){
                this.toastr.error(err);
            }
            else{
                this.map.setMapData(result['data']);
                this.map.center = MapUtils.getCentroid(result['data'][this.selectedIndicator.id]);
                this.setCenter(result['data']);
                this.map.setMap();
                this.toastr.success('Data berhasil disimpan ke server');
            }
        });
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

    getCurrentDiffs(): any {
        let localBundle = this.dataApiService.getLocalContent('pemetaan', this.pageSaver.bundleSchemas);
        let currentData = this.map.mapData;
        return this.trackDiffs(localBundle['data'], this.map.mapData);
    }

    openImportDialog(): void {
        $('#file-upload')[0]['value'] = "";

        $('#modal-import-map')['modal']('show');
    }

    changeIndicator(indicator): void {
        this.selectedIndicator = indicator;
        this.selectedUploadedIndicator = indicator;
        this.map.indicator = indicator;
        this.map.clearMap();
        this.map.loadGeoJson();
        this.map.setupLegend();
        
        let currentCenter = this.map.map.getCenter();

        if(currentCenter.lat === 0 && currentCenter.lng === 0)
            this.setCenter(this.pageSaver.bundleData);

        if(this.map.mapData[indicator.id].length === 0)
           this.toastr.warning('Data tidak tersedia, silahkan upload data');
    }

    setCenter(bundleData): void {
        if(bundleData[this.selectedIndicator.id]){
            let center = MapUtils.getCentroid(bundleData[this.selectedIndicator.id]);

            if(!isNaN(center[0]) && !isNaN(center[1]))
                this.map.center = [center[1], center[0]];

            return;
        }

        this.toastr.error('Center tidak ditemukan');
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

        this.popupPaneComponent.instance.onEditFeature.subscribe(
            v => { this.map.updateLegend() }
        );

        this.popupPaneComponent.instance.onFeatureMove.subscribe(
            v => { this.openMoveFeatureModal(v); }
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
    
    importContent() {
         this.isDataEmpty = false;

         if(!this.selectedUploadedIndicator){
             this.toastr.error('Tidak ada indikator yang dipilih');
             return;
         }
         
         if(!this.selectedUploadedIndicator['path']){
             this.toastr.error('Tidak ada file yang dipilih');
             return;
         }

         let me = this;

         setTimeout(function() {
             let path = me.selectedUploadedIndicator['path'];
             let segementedPath = path.split('.');
             let extension = segementedPath[segementedPath.length - 1];
             let file = null;

             if(extension === 'shp'){
                 shapefile.open(path)
                    .then(source => source.read())
                    .then(result => {
                         me.convertData(result.value);
                    });
             }
             else{
                file = jetpack.read(me.selectedUploadedIndicator['path']);

                if(!file){
                    me.toastr.error('File tidak ditemukan');
                    delete me.selectedUploadedIndicator['path'];
                    return;
                }

                let jsonData = JSON.parse(file);
                me.convertData(jsonData);
             }

             delete me.selectedUploadedIndicator['path'];
         }, 200);
    }

    convertData(jsonData): void {
        let result = [];

        if(jsonData.type === 'FeatureCollection'){
            for(let i=0; i<jsonData.features.length; i++){
                let feature = jsonData.features[i];
                feature['id'] = base64.encode(uuid.v4());
                feature['indicator'] = this.selectedUploadedIndicator.id;
                feature['properties'] = {};
                result.push(feature);
            }
        }
        else {
            let feature = jsonData;
            feature['id'] = base64.encode(uuid.v4());
            feature['indicator'] = this.selectedUploadedIndicator.id;
            feature['properties'] = {};
            result.push(feature);
        }

        this.pageSaver.bundleData[this.selectedUploadedIndicator.id] = this.pageSaver.bundleData[this.selectedUploadedIndicator.id].concat(result)
        this.map.bigConfig = this.bigConfig;
        this.map.setMapData(this.pageSaver.bundleData);
        this.changeIndicator(this.selectedUploadedIndicator);
        $('#modal-import-map')['modal']('hide');
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

    printMap(): void {
       this.isPrintingMap = true;

       titleBar.normal();
       titleBar.title(null);

       let printedGeoJson = MapUtils.createGeoJson();
 
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['waters']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['boundary']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['landuse']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['network_transportation']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['facilities_infrastructures']);

       this.mapPrint.initialize(printedGeoJson);
    }

    doPrint(): boolean {
        this.mapPrint.print();
        return false;
    }

    showPemetaan(): void {
        this.isPrintingMap = false;
        titleBar.title("Data Pemetaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    keyupListener = (e) => {
        // Ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            this.pageSaver.onBeforeSave();
            e.preventDefault();
            e.stopPropagation();
        }
        // Ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            this.printMap();
            e.preventDefault();
            e.stopPropagation();
        }
    }
}
