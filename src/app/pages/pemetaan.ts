import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector, OnInit, OnDestroy } from "@angular/core";
import { Router } from '@angular/router';
import { remote, clipboard, shell } from "electron";
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { Subscription } from 'rxjs';
import { PersistablePage } from '../pages/persistablePage';

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as uuid from 'uuid';
import * as $ from 'jquery';

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';
import titleBar from '../helpers/titleBar';
import MapUtils from '../helpers/mapUtils';
import MapComponent from '../components/map';
import PopupPaneComponent from '../components/popupPane';
import MapPrintComponent from '../components/mapPrint';
import LogPembangunanComponent from '../components/logPembangunan';
import PembangunanComponent from '../components/pembangunan';
import PageSaver from '../helpers/pageSaver';

var base64 = require("uuid-base64");
var rrose = require('../lib/leaflet-rrose/leaflet.rrose-src.js');
var shapefile = require("shapefile");

@Component({
    selector: 'pemetaan',
    templateUrl: '../templates/pemetaan.html'
})
export default class PemetaanComponent implements OnInit, OnDestroy, PersistablePage {
    type = "pemetaan";
    subType = null;

    bundleSchemas = {};

    progress : Progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
    progressMessage = '';

    indicators  = jetpack.cwd(__dirname).read('bigConfig.json', 'json');

    activePageMenu = null;

    activeLayer = 'Kosong';
    modalSaveId = 'modal-save-diff';

    latitude: number;
    longitude: number;
    selectedIndicator: any;
    selectedUploadedIndicator: any;
    selectedFeature: any;
    selectedDiff: any;
    mapSubscription: Subscription;
    isDataEmpty: boolean;
    selectedFeatureToMove: any;
    oldIndicator: any;
    newIndicator: any;

    viewMode: string;
    selectedProperties: any;
    selectedEditorType: string;
    selectedRab: any[];

    pageSaver: PageSaver;
    popupPaneComponent: ComponentRef<PopupPaneComponent>;

    @ViewChild(MapComponent)
    private map: MapComponent

    @ViewChild(MapPrintComponent)
    private mapPrint: MapPrintComponent;

    @ViewChild(LogPembangunanComponent)
    private logPembangunan: LogPembangunanComponent;

    @ViewChild(PembangunanComponent)
    private pembangunan: PembangunanComponent;
    
    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        public router: Router,
        public toastr: ToastsManager,
        private resolver: ComponentFactoryResolver,
        private injector: Injector,
        private appRef: ApplicationRef,
        private vcr: ViewContainerRef,
    ) {
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this);

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];
            this.pageSaver.bundleData[indicator.id] = [];
            this.bundleSchemas[indicator.id] = 'dict';
        }

        this.pageSaver.bundleData['log_pembangunan'] = [];
        this.bundleSchemas['log_pembangunan'] = schemas.logPembangunan;
    }

    ngOnInit(): void {
        titleBar.title("Data Pemetaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.selectedIndicator = this.indicators[0];

        this.activeLayer = 'Kosong';
        this.viewMode = 'map';



        this.selectedDiff = this.indicators[0];

        document.addEventListener('keyup', this.keyupListener, false);

        setTimeout(() => {
            this.pageSaver.getContent( result => {
                this.map.setMapData(result['data']);
                this.setCenter(result['data']);
                this.map.setMap();

                setTimeout(() => {
                    this.logPembangunan.setData(result['data']['log_pembangunan'] ? result['data']['log_pembangunan'] : []);
                }, 200);
                
                this.pageSaver.bundleData = result['data'];
                this.checkMapData();
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

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
        } else {
            titleBar.blue();
        }
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

    saveContent(): void {
        $('#modal-save-diff')['modal']('hide');
       
        this.pageSaver.bundleData = this.map.mapData;
        this.pageSaver.bundleData['log_pembangunan'] = this.logPembangunan.getData();

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(true, result => {
            this.map.setMapData(result['data']);
            this.map.center = MapUtils.getCentroid(result['data'][this.selectedIndicator.id]);
            this.setCenter(result['data']);
            this.map.setMap();
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

    getCurrentUnsavedData(): any {
        let currentData = this.map.mapData;

        if(this.pageSaver.bundleData['log_pembangunan'])
            currentData['log_pembangunan'] = this.pageSaver.bundleData['log_pembangunan'];

        return currentData;
    }

    openImportDialog(): void {
        $('#file-upload')[0]['value'] = "";

        $('#modal-import-map')['modal']('show');
    }

    changeIndicator(indicator): void {
        this.viewMode = 'map';
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

    changeLogPembangunan(): void {
        this.selectedIndicator = null;
        this.viewMode = 'logPembangunan';
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
            v => { this.map.updateLegend(); }
        );

        this.popupPaneComponent.instance.onDevelopFeature.subscribe(
            v => { this.onDevelopFeature(v); }
        )

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
        popup.on("remove", () => {
            this.selectedFeature = null;
        });

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
    onDevelopFeature(feature): void {
        this.pembangunan.feature = feature;
        this.pembangunan.pembangunanData = this.logPembangunan.getDataByFeatureId(feature.feature.id);
        this.pembangunan.initialize();

        $('#modal-pembangunan')['modal']('show');
    }

    onSavePembangunan(data): void {
        let pembangunanData = data.pembangunan;
        let newProperties = data.properties;

        this.selectedFeature.feature.properties = newProperties;
        this.logPembangunan.pushData(pembangunanData);

        this.toastr.success('Feature berhasil dibangun');
        $('#modal-pembangunan')['modal']('hide');
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
                         me.importData(result.value, this.selectedUploadedIndicator.id);
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
                me.importData(jsonData, this.selectedUploadedIndicator.id);
             }

             delete me.selectedUploadedIndicator['path'];
             this.changeIndicator(this.selectedUploadedIndicator);
             $('#modal-import-map')['modal']('hide');
         }, 200);
    }

    importData(jsonData, indicatorId): void {
        let result = [];

        if(jsonData.type === 'FeatureCollection'){
            for(let i=0; i<jsonData.features.length; i++){
                let feature = jsonData.features[i];
                feature['id'] = base64.encode(uuid.v4());
                //feature['properties'] = {};
                result.push(feature);
            }
        }
        else {
            let feature = jsonData;
            feature['id'] = base64.encode(uuid.v4());
            //feature['properties'] = {};
            result.push(feature);
        }

        Array.prototype.push.apply(this.pageSaver.bundleData[indicatorId], result);
        this.map.setMap(false);
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
        this.map.setMap(false);
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
        this.map.setMap(false);
    }

    printMap(): void {
       this.setActivePageMenu("print");

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
        titleBar.title("Data Pemetaan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    keyupListener = (e) => {
        let handled = false;
        // Ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            this.pageSaver.onBeforeSave();
            handled = true;
        }
        // Ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            this.printMap();
            handled = true;
        }
        else if(e.ctrlKey && e.target && e.target.className == "copyPaste"){
            if(e.keyCode == 88 || e.keyCode == 67 || e.keyCode == 86)
                handled = true;
            if(e.keyCode == 88)
                this.cut();
            else if(e.keyCode == 67)
                this.copy();
            else if(e.keyCode == 86)
                this.paste();
        }
        if(handled){
            e.preventDefault();
            e.stopPropagation();
        }
    }

    cut(): void {
        if(this.selectedFeature){
            clipboard.writeText(JSON.stringify(this.selectedFeature.toGeoJSON(), null, 4));

            let index = this.map.mapData[this.selectedIndicator.id].indexOf(this.selectedFeature.feature);
            this.map.mapData[this.selectedIndicator.id].splice(index, 1);
            this.map.setMap(false);

            this.selectedFeature = null;
        }
    }

    copy(): void {
        if(this.selectedFeature){
            clipboard.writeText(JSON.stringify(this.selectedFeature.toGeoJSON(), null, 4));
        }
    }

    paste(): void {
        var json = clipboard.readText();
        try {
            var data = JSON.parse(json);
            this.importData(data, this.selectedIndicator.id);
        } catch (ex){
            console.log(ex);
        }
        if(data){
        }
    }

    viewDataFromHotColumn(data): void {
        if(data.type === 'properties') {
            let properties = data.atCurrentRow[data.col];
            let old = JSON.parse(properties);
            let keys = Object.keys(old);

            this.selectedProperties = [];

            for(let i=0; i<keys.length; i++){
                let key = keys[i];
                let value = old[keys[i]];

                this.selectedProperties.push({ key: key, value: value });
            }
            
            this.selectedEditorType = data.col == 5 ? 'old' : 'new';

            $('#modal-view-properties')['modal']('show');
        }
        else {
            this.selectedRab = data.atCurrentRow[data.col];
            $('#modal-view-rab')['modal']('show');
        }
    }

    async openGeojsonIo(){
        var center = null;
        try {
            var desa = await this.dataApiService.getDesa(false).first().toPromise();
            center = [desa.latitude, desa.longitude];
        } catch(e){
        }
        if(center == null)
            center = [0,0];
        shell.openExternal(`http://geojson.io/#map=17/${center[0]}/${center[1]}`);
    }
}
