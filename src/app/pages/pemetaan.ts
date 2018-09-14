import {
    Component,
    ApplicationRef,
    ViewChild,
    ComponentRef,
    ViewContainerRef,
    ComponentFactoryResolver,
    Injector, OnInit, OnDestroy
} from "@angular/core";

import { remote, clipboard, shell } from "electron";
import { DiffItem } from '../stores/bundle';
import { SchemaDict } from '../schemas/schema';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PersistablePage } from './persistablePage'
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { MapComponent } from '../components/map';
import { PopupPaneComponent } from '../components/popupPane';
import { LogPembangunanHotComponent } from '../components/handsontables/logPembangunan';
import { PembangunanComponent } from '../components/pembangunan';
import { MapPrintComponent } from '../components/mapPrint';

import schemas from '../schemas';
import { titleBar } from '../helpers/titleBar';
import { DataApiService } from '../stores/dataApiService';
import { SharedService } from '../stores/sharedService';
import { SettingsService } from '../stores/settingsService';
import { PageSaver } from '../helpers/pageSaver';
import { MapUtils } from "../helpers/mapUtils";

import * as jetpack from 'fs-jetpack';
import * as rrose from '../lib/leaflet-rrose/leaflet.rrose-src.js';
import * as L from 'leaflet';
import * as base64 from 'uuid-base64';
import * as uuid from 'uuid';
import * as lineToPolygon from 'turf-line-to-polygon';
import * as contains from 'string-contains';
import { CLIENT_RENEG_LIMIT } from 'tls';

const BIG_CONFIG = jetpack.cwd(__dirname).read('assets/bigConfig.json', 'json');

var shp = require('shpjs/dist/shp.js');

@Component({
    selector: 'pemetaan',
    templateUrl: '../templates/pemetaan.html'
})
export class PemetaanComponent implements OnInit, OnDestroy, PersistablePage {
    type: string = 'pemetaan';
    subType: string = null;
    modalSaveId: string = 'modal-save-diff';
    viewMode: string = 'map';
    activePageMenu: string = null;
    activeLayerKey: string = null;
    activeLayerLabel: string = 'Kosong';

    isDataEmpty: boolean = false;

    activeLayer: L.Layer = null;
    bundleSchemas: SchemaDict = schemas.pemetaanBundle;
    pageSaver: PageSaver = new PageSaver(this);
    progress: Progress = { percentage: 0, event: null, lengthComputable: true, total: 0, loaded: 0 };
    pemetaanSubscription: Subscription;

    selectedIndicator: any = {};
    selectedUploadedIndicator: any = {};
    selectedUploadedIndicatorPath: string = null;
    selectedFeature: any = {};
    selectedProperties: any = {};
    selectedEditorType: string = null;
    selectedRab: any = null;

    importErrorMessage: string = null;

    bigConfig: any[] = [];

    @ViewChild(MapComponent)
    private map: MapComponent;

    @ViewChild(LogPembangunanHotComponent)
    private logPembangunanHot: LogPembangunanHotComponent;

    @ViewChild(PembangunanComponent)
    private pembangunan: PembangunanComponent;

    @ViewChild(MapPrintComponent)
    private mapPrint: MapPrintComponent;

    popupPaneComponent: ComponentRef<PopupPaneComponent>;

    constructor(
        public toastr: ToastrService,
        public router: Router,
        public sharedService: SharedService,
        public settingsService: SettingsService,
        public dataApiService: DataApiService,
        private resolver: ComponentFactoryResolver,
        private injector: Injector,
        private appRef: ApplicationRef,
    ) {
    }

    ngOnInit(): void {
        titleBar.title("Data Pemetaan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        setTimeout(function () {
            $("pemetaan > #flex-container").addClass("slidein");
        }, 1000);

        this.pageSaver.subscription = this.pemetaanSubscription;

        for (let i = 0; i < this.bigConfig.length; i++)
            this.pageSaver.bundleData[this.bigConfig[i].id] = [];

        this.bigConfig = BIG_CONFIG;
        this.selectedIndicator = this.bigConfig[0];
        this.pageSaver.bundleData['log_pembangunan'] = [];
        this.setListeners();
    }

    getContent(): void {
        this.pageSaver.getContent(result => {
            this.setActiveLayer('empty');
            this.map.data = result['data'];
            this.pageSaver.bundleData = this.map.data;
            this.logPembangunanHot.load(result['data']['log_pembangunan'] ? result['data']['log_pembangunan'] : []);
            this.checkMapData();

            if (!this.isDataEmpty && this.map.data[this.selectedIndicator.id].length > 0)
                this.map.load(true);
        });
    }

    saveContent(): void {
        $('#modal-save-diff')['modal']('hide');

        this.pageSaver.bundleData = this.map.data;
        this.pageSaver.bundleData['log_pembangunan'] = this.logPembangunanHot.instance.getSourceData();

        this.pageSaver.saveContent(true, result => {
            this.map.data = result['data'];
            this.pageSaver.bundleData = this.map.data;
            this.checkMapData();

            if (!this.isDataEmpty)
                this.map.load(true);
        });
    }

    setActiveLayer(key: string): boolean {
        if (this.activeLayerKey === key)
            return false;

        let prevLayer = this.map.getLayer(this.activeLayerKey);
        let nextLayer = this.map.getLayer(key);

        if (key === 'empty') {
            if (this.activeLayerKey && this.activeLayerKey !== 'empty')
                this.map.unsetLayer(prevLayer);
        }
        else {
            if (this.activeLayerKey !== 'empty')
                this.map.unsetLayer(prevLayer);

            this.map.setLayer(nextLayer);
        }

        this.activeLayerKey = key;

        this.activeLayerLabel = key === 'osm' ? 'Open Street Map' : key === 'otm' ? 'Open Topo Map'
            : key === 'esri' ? 'ESRI Imagery' : key === 'satellite' ? 'Satellite' : key === "googleSatellite" ? 'Google Satellite' : 'Kosong';

        return false;
    }

    setActivePageMenu(activePageMenu) {
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
        } else {
            titleBar.blue();
        }
    }

    setListeners(): void {
        document.addEventListener('keyup', this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);
    }

    setLogPembangunan(): void {
        this.selectedIndicator = null;
        this.viewMode = 'logPembangunan';
    }

    selectFeature(feature): void {
        this.selectedFeature = feature;
        this.configurePopupPane(feature);
    }

    changeIndicator(indicatorId): boolean {
        let indicator = BIG_CONFIG.filter(e => e.id === indicatorId)[0];

        if (!indicator) {
            this.toastr.error('Indikator Tidak Ditemukan');
            return false;
        }

        this.viewMode = 'map';
        this.selectedIndicator = indicator;
        this.selectedUploadedIndicator = indicator;
        this.map.indicator = indicator;

        this.map.load(false);

        let currentCenter = this.map.map.getCenter();

        if (currentCenter.lat === 0 && currentCenter.lng === 0)
            this.map.recenter();

        if (this.map.data[indicator.id].length === 0)
            this.toastr.warning('Data tidak tersedia, silahkan upload data');

        return false;
    }

    configurePopupPane(feature): void {
        let popup: L.Popup =
            new rrose({ offset: new L.Point(0, 10), closeButton: false, autoPan: false }).setLatLng(feature);

        if (this.popupPaneComponent)
            this.popupPaneComponent.destroy();

        let compFactory = this.resolver.resolveComponentFactory(PopupPaneComponent);

        this.popupPaneComponent = compFactory.create(this.injector);
        this.popupPaneComponent.instance['indicator'] = this.selectedIndicator;
        this.popupPaneComponent.instance['feature'] = this.selectedFeature;

        this.popupPaneComponent.instance.onAddMarker.subscribe(
            v => { this.map.addMarker(v) }
        );

        this.popupPaneComponent.instance.onEditFeature.subscribe(
            v => { this.map.updateLegend(); }
        );

        this.popupPaneComponent.instance.onDevelopFeature.subscribe(
            v => { this.onDevelopFeature(v); }
        )

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

    viewLogPembangunanData(data): void {
        if (data.type === 'properties') {
            let properties = data.atCurrentRow[data.col];
            let old = properties;
            let keys = Object.keys(old);

            this.selectedProperties = [];

            for (let i = 0; i < keys.length; i++) {
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

    addPembangunan(data): void {
        let pembangunanData = data.pembangunan;
        let newFeature = data.feature;

        this.selectedFeature.feature.properties = newFeature.properties;
        this.logPembangunanHot.data.push(pembangunanData);
        this.logPembangunanHot.load(this.logPembangunanHot.data);

        this.toastr.success('Feature berhasil dibangun');
        $('#modal-pembangunan')['modal']('hide');
    }

    onDevelopFeature(feature): void {
        this.pembangunan.feature = feature;
        this.pembangunan.pembangunanData = this.logPembangunanHot.getDataByFeatureId(feature.feature.id);
        this.pembangunan.initialize();

        $('#modal-pembangunan')['modal']('show');
    }

    openImportDialog(): void {
        $('#file-upload')[0]['value'] = "";

        $('#modal-import-map')['modal']('show');
    }

    onFileUploadChange(event): void {
        if (!this.selectedUploadedIndicator) {
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        if (event.target.files.length === 0)
            return;

        this.selectedUploadedIndicatorPath = event.target.files[0].path;
    }

    async import() {
        if (!this.selectedUploadedIndicator || Object.keys(this.selectedUploadedIndicator).length == 0) {
            this.toastr.error('Tidak ada indikator yang dipilih');
            return;
        }

        if (!this.selectedUploadedIndicatorPath) {
            this.toastr.error('Tidak ada file yang dipilih');
            return;
        }

        let me = this;

        let paths = this.selectedUploadedIndicatorPath.split("\\");
        let extension = paths[paths.length - 1].split('.')[1];

        if (extension !== 'zip' && extension !== 'json' && extension !== 'geojson') {
            this.importErrorMessage = 'File is not supported';

            setTimeout(() => {
                this.importErrorMessage = null;
            }, 3000);

            return;
        }

        let data = null;

        try {
            if (extension === 'zip')
                data = await shp(this.selectedUploadedIndicatorPath);

            else if (extension === 'json' || extension === 'geojson')
                data = JSON.parse(jetpack.read(this.selectedUploadedIndicatorPath));

            this.doImport(data);
        }
        catch (exception) {
            this.toastr.error('Data Tidak Dapat Diimport');
        }
    }

    doImport(data): void {
        for (let i = 0; i < data.features.length; i++) {
            let feature = this.createFeature(data.features[i]);
            this.map.data[this.selectedUploadedIndicator.id] = this.map.data[this.selectedUploadedIndicator.id].concat(feature);
        }

        this.pageSaver.bundleData[this.selectedUploadedIndicator.id] = this.map.data[this.selectedUploadedIndicator.id];
        this.changeIndicator(this.selectedUploadedIndicator.id);
        this.checkMapData();
        this.selectedUploadedIndicatorPath = null;
        $('#modal-import-map')['modal']('hide');
        setTimeout(() => {
            this.map.load(true);
        }, 0);
    }

    createFeature(shpFeature: any): any {
        let feature = Object.assign({}, shpFeature);

        feature['properties'] = {};
        feature['id'] = base64.encode(uuid.v4());
        feature['indicator'] = this.selectedUploadedIndicator.id;
        feature['properties'] = {};

        if (this.selectedUploadedIndicator.id === 'boundary') {
            if (feature.geometry.type === 'LineString') {
                feature = lineToPolygon(feature);
                feature.properties['admin_level'] = 7;
            }

            return feature;
        }

        let propertyKeys = Object.keys(shpFeature['properties']);

        if (propertyKeys.length > 0) {

            let property = null;

            for (let i = 0; i < propertyKeys.length; i++) {
                let key = propertyKeys[i].trim().toLowerCase();

                if (!shpFeature.properties[propertyKeys[i]])
                    continue;

                if (key === 'keterangan') {
                    property = shpFeature.properties[propertyKeys[i]].trim().toLowerCase();
                    break;
                }
                else if (key === 'ket') {
                    property = shpFeature.properties[propertyKeys[i]].trim().toLowerCase();
                    break;
                }
                else if (key === 'nama_unsur') {
                    property = shpFeature.properties[propertyKeys[i]].trim().toLowerCase();
                    break;
                }
                else if (key === 'landuse') {
                    property = shpFeature.properties[propertyKeys[i]].trim().toLowerCase();
                    break;
                }
                else if (key === 'string') {
                    property = shpFeature.properties[propertyKeys[i]].trim().toLowerCase();
                    break;
                }
                else if (key === 'kelas') {
                    property = shpFeature.properties[propertyKeys[i]].trim().toLowerCase();
                    break;
                }
                else if (key === 'kode_unsur') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'nama') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'sapras') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'z') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'place') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'new_name') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'ident') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'lu') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'f3') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'penutupan_') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
                else if (key === 'lahan') {
                    property = shpFeature.properties[propertyKeys[i]].toString().trim().toLowerCase();
                    break;
                }
            }

            if (property === null)
                return feature;

            switch (true) {
                case contains('hutan', property) || contains(property, 'hutan'):
                    feature.properties['landuse'] = 'forest';
                    break;
                case contains('sawah', property) || contains(property, 'sawah') || contains(property, 'pertanian') || contains(property, 'persawahan') || contains(property, 'lahan pertanian'):
                    feature.properties['landuse'] = 'farmland';
                    break;
                case contains('perkebunan', property) || contains(property, 'perkebunan') || contains(property, 'kebun'):
                    feature.properties['landuse'] = 'orchard';
                    break;
                case contains('rawa', property) || contains(property, 'rawa'):
                    feature.properties['landuse'] = 'wetland';
                    break;
                case contains('semak belukar', property) || contains(property, 'semak belukar'):
                    feature.properties['landuse'] = 'meadow';
                    break;
                case contains('tk', property) || contains(property, 'tk') || contains('paud', property) || contains(property, 'paud'):
                    feature.properties['amenity'] = 'school';
                    feature.properties['isced'] = 0
                    feature.properties['icon'] = '0ic_tk.png'
                    break;
                case contains('sd', property) || contains(property, 'sd') || contains('madrasah aliyah', property) || contains(property, 'madrasah aliyah'):
                    feature.properties['amenity'] = 'school';
                    feature.properties['isced'] = 1
                    feature.properties['icon'] = 'ic_pendidikandasar.png'
                    break;
                case contains('smp', property) || contains(property, 'smp') || contains('mts', property) || contains(property, 'mts') || contains('sltp', property) || contains(property, 'sltp'):
                    feature.properties['amenity'] = 'school';
                    feature.properties['isced'] = 2
                    feature.properties['icon'] = 'ic_pendidikanmenengahpertama.png'
                    break;
                case contains('sma', property) || contains(property, 'sma') || contains('slta', property) || contains(property, 'smk') || contains(property, 'slta'):
                    feature.properties['amenity'] = 'school';
                    feature.properties['isced'] = 3
                    feature.properties['icon'] = 'ic_pendidikanmenengahumum.png'
                    break;
                case contains('univesitas', property) || contains(property, 'st'):
                    feature.properties['amenity'] = 'school';
                    feature.properties['isced'] = 4
                    feature.properties['icon'] = 'ic_universitas.png'
                    break;
            }
        }

        console.log(feature.properties);
        return feature;
    }

    printMap(): void {
        this.setActivePageMenu("print");

        let printedGeoJson = MapUtils.createGeoJson();

        for (let i = 0; i < this.map.data['waters'].length; i++) {
            this.map.data['waters'][i]['indicator'] = 'waters';
        }
        for (let i = 0; i < this.map.data['boundary'].length; i++) {
            this.map.data['boundary'][i]['indicator'] = 'boundary';
        }
        for (let i = 0; i < this.map.data['landuse'].length; i++) {
            this.map.data['landuse'][i]['indicator'] = 'landuse';
        }
        for (let i = 0; i < this.map.data['network_transportation'].length; i++) {
            this.map.data['network_transportation'][i]['indicator'] = 'network_transportation';
        }
        for (let i = 0; i < this.map.data['facilities_infrastructures'].length; i++) {
            this.map.data['facilities_infrastructures'][i]['indicator'] = 'facilities_infrastructures';
        }

        printedGeoJson.features = printedGeoJson.features.concat(this.map.data['waters']);
        printedGeoJson.features = printedGeoJson.features.concat(this.map.data['boundary']);
        printedGeoJson.features = printedGeoJson.features.concat(this.map.data['landuse']);
        printedGeoJson.features = printedGeoJson.features.concat(this.map.data['network_transportation']);
        printedGeoJson.features = printedGeoJson.features.concat(this.map.data['facilities_infrastructures']);

        this.mapPrint.initialize(printedGeoJson);
    }

    cut(): void {
        if (this.selectedFeature) {
            clipboard.writeText(JSON.stringify(this.selectedFeature.toGeoJSON(), null, 4));

            let index = this.map.data[this.selectedIndicator.id].indexOf(this.selectedFeature.feature);
            this.map.data[this.selectedIndicator.id].splice(index, 1);
            this.map.load(true);
            this.selectedFeature = null;
        }
    }

    copy(): void {
        if (this.selectedFeature) {
            clipboard.writeText(JSON.stringify(this.selectedFeature.toGeoJSON(), null, 4));
        }
    }

    paste(): void {
        var json = clipboard.readText();
        try {
            var data = JSON.parse(json);

            this.map.data[this.selectedIndicator.id] = this.map.data[this.selectedIndicator.id].concat(data);
            this.map.load(true);

        } catch (ex) {
            console.log(ex);
        }
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

        if (!this.selectedIndicator) {
            this.toastr.error('Tidak ada indikator yang dipilih');
            return;
        }

        this.map.data[this.selectedIndicator.id] = [];
        this.checkMapData();

        if (!this.isDataEmpty)
            this.map.load(true);
    }

    getCurrentUnsavedData() {
        let currentData = this.map.data;

        if (this.pageSaver.bundleData['log_pembangunan'])
            currentData['log_pembangunan'] = this.pageSaver.bundleData['log_pembangunan'];

        return currentData;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    checkMapData(): void {
        this.isDataEmpty = true;

        for (let i = 0; i < BIG_CONFIG.length; i++) {
            let indicator = BIG_CONFIG[i];

            if (!this.map.data || !this.map.data[indicator.id])
                continue;

            if (this.map.data[indicator.id].length > 0) {
                this.isDataEmpty = false;
                break;
            }
        }
    }

    keyupListener = (e) => {
        let handled = false;
        if (e.ctrlKey && e.keyCode === 83) {
            if (this.dataApiService.auth.isAllowedToEdit("pemetaan")) {
                this.pageSaver.onBeforeSave();
                handled = true;
            }
        }
        else if (e.ctrlKey && e.keyCode === 80) {
            this.printMap();
            handled = true;
        }
        else if (e.ctrlKey && e.target && e.target.className == "copyPaste") {
            if (e.keyCode == 88 || e.keyCode == 67 || e.keyCode == 86)
                handled = true;
            if (e.keyCode == 88)
                this.cut();
            else if (e.keyCode == 67)
                this.copy();
            else if (e.keyCode == 86)
                this.paste();
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    async openGeojsonIo() {
        let center = null;
        try {
            center = this.map.geoJson.getBounds().getCenter();
            if (!center || (!center[0] && !center[1])) {
                let desa = await this.dataApiService.getDesa(false).first().toPromise();
                center = [desa.longitude, desa.latitude];
            }
        } catch (e) { }

        if (!center)
            center = [0, 0];

        shell.openExternal(`http://geojson.io/#map=17/${center[1]}/${center[0]}`);
    }

    ngOnDestroy(): void {
        if (this.pageSaver.subscription)
            this.pageSaver.subscription.unsubscribe();

        document.removeEventListener('keyup', this.keyupListener, false);
        window.removeEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);

        this.logPembangunanHot.ngOnDestroy();
        this.logPembangunanHot.instance.destroy();

        titleBar.removeTitle();

        $("pemetaan > #flex-container").removeClass("slidein");
    }
}