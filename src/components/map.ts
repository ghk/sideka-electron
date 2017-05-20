import { Component, ApplicationRef, Input } from "@angular/core";
import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';

const geoJSONArea = require('@mapbox/geojson-area');

@Component({
    selector: 'map',
    templateUrl: 'templates/map.html'
})
export default class MapComponent {
    map: L.Map;
    options: any;
    zoom: number;
    center: L.LatLng;
    control: L.Control;
    smallSizeLayers: L.LayerGroup = L.layerGroup([]);
    mediumSizeLayers: L.LayerGroup = L.layerGroup([]);
    bigSizeLayers: L.LayerGroup = L.layerGroup([]);
    geoJSONLayer: L.GeoJSON;
    data: any;
    selectedLayer: string;

    private _layerPath: any;
    private _village: any;

    @Input()
    set layerPath(value: any) {
        this._layerPath = value;
    };
    get layerPath() {
        return this._layerPath;
    }

    @Input()
    set village(value: any) {
        this._village = value;
    };
    get village() {
        return this._village;
    }

    constructor(){}

    ngOnInit(): void {
        console.log(this._village);
        this.center = L.latLng(-6.174668, 106.827126);
        this.zoom = 14;
        this.options = {
            layers: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        };

        setTimeout(() => {
            let zoom = this._village.zoom ?  this._village.zoom : 14;
            this.map.setView([this._village.location[0], this._village.location[1]], zoom);
            this.loadGeojson();
        }, 2000);
    }

    loadGeojson(): void {
        this.clearMap();
        
        let geoJsonData = JSON.parse(jetpack.read(this._layerPath));
        this.geoJSONLayer = L.geoJSON(geoJsonData, {
            style: function (feature) {        
                return MapUtils.getGeoJsonStyle(feature, 'area');
            },

             onEachFeature: function (feature, layer: L.FeatureGroup) {
                var popup = L.popup().setContent(feature.properties['Keterangan']);
                layer.bindPopup(popup);
                layer.on({
                    'hover': function (e) {
                        this.geoJSONLayer.eachLayer((layer) => {
                            this.geoJSONLayer.resetStyle(layer);
                        });
                        layer.setStyle({
                            color: 'blue',
                            fillColor: 'blue'
                        });
                    }
                });
            }
        });

        this.geoJSONLayer.addTo(this.map);
    }

    setHideOnZoom(map: L.Map): void {
        map.on('zoomend', $event => {
            var zoom = map.getZoom();
            map.eachLayer(layer => {
            if (zoom < 15) {
                this.toggleMarker(this.smallSizeLayers, false);
                this.toggleMarker(this.mediumSizeLayers, false);
            } else if (zoom < 17) {
                this.toggleMarker(this.smallSizeLayers, false);
                this.toggleMarker(this.mediumSizeLayers, true);
            } else {
                this.toggleMarker(this.smallSizeLayers, true);
                this.toggleMarker(this.mediumSizeLayers, true);
            }
            });
        });
    }   

    toggleMarker(markers: L.LayerGroup, on: boolean) {
        markers.eachLayer(layer => {
        var marker = layer as L.Marker;
        if (on)
            marker.setOpacity(0.5);
        else
            marker.setOpacity(0);
        });
    }

    clearMap(): void {
        if (this.geoJSONLayer)
            this.map.removeLayer(this.geoJSONLayer);
        if (this.control)
            this.control.remove();

        this.smallSizeLayers.clearLayers();
        this.mediumSizeLayers.clearLayers();
        this.bigSizeLayers.clearLayers();
    }

    onMapReady(map: L.Map): void {
        this.map = map;
        this.smallSizeLayers.addTo(this.map);
        this.mediumSizeLayers.addTo(this.map);
        this.bigSizeLayers.addTo(this.map);
        this.setHideOnZoom(map);
    }
}

export class MapUtils {
    public static readonly POWER_COLORS = [{
        description: '>=30000 VA',
        color: '#800026',
        value: 30000,
    }, {
        description: '>=6600 VA',
        color: '#BD0026',
        value: 6600,
    }, {
        description: '>=5500 VA',
        color: '#E31A1C',
        value: 5500,
    }, {
        description: '>=3500 VA',
        color: '#FC4E2A',
        value: 3500,
    }, {
        description: '>=2200 VA',
        color: '#FD8D3C',
        value: 2200,
    }, {
        description: '>=1300 VA',
        color: '#FEB24C',
        value: 1300,
    }, {
        description: '>=900 VA',
        color: '#FED976',
        value: 900,
    }, {
        description: 'Tidak ada',
        color: 'white',
        value: 0,
    }];

    public static readonly WATER_COLOR = [{
        description: 'Ada',
        color: 'blue',
        value: 1
    }, {
        description: 'Tidak Ada',
        color: 'white',
        value: 0
    }];

    public static getPowerColor(power: string) {
        var p = 0;
        if (power && power.length > 0)
            p = Number(power);
        var result = p >= 30000 ? '#800026' :
            p >= 6600 ? '#BD0026' :
                p >= 5500 ? '#E31A1C' :
                    p >= 3500 ? '#FC4E2A' :
                        p >= 2200 ? '#FD8D3C' :
                            p >= 1300 ? '#FEB24C' :
                                p >= 900 ? '#FED976' :
                                    'white';
        return result;
    }

    public static getWaterColor(water: string) {
        var w = 0;
        if (water && water.length > 0)
            w = Number(water);
        var result = w >= 1 ? 'blue' : 'white';
        return result;
    }

    public static countArea(geoJSON: GeoJSON.FeatureCollection<GeoJSONGeometryObject>): number {
        var area = 0;
        geoJSON.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon') {
                area += geoJSONArea.geometry(feature.geometry)
            }
        });
        return area / 1000000;
    }

    public static convertArea(area: number): string {
        var result = '';
        if (area / 10000 > 1)
            result = Math.round(area / 10000) + '&nbspHa';
        else
            result = Math.round(area) + '&nbspm2';
        return result;
    }

    public static getCenter(coords: number[]): number[] {
        var result = [];
        result.push((coords[1] + coords[3]) / 2);
        result.push((coords[0] + coords[2]) / 2);
        return result;
    }

    public static getGeoJsonStyle(feature: any, indicator: any): any {
        if (feature.properties['Nama_Jalan'] !== undefined) {
            return { color: 'red' };
        }
        else if (feature.properties['Keterangan'] !== undefined) {
            switch (feature.properties['Keterangan']) {
                case 'Bangunan':
                    if (indicator.id === 'electricity') {
                        return {
                            color: 'grey',
                            fillColor: MapUtils.getPowerColor(feature.properties['infrastructure.electricity.power']),
                            fillOpacity: 1,
                            opacity: 0.3,
                            weight: 1
                        }
                    }
                    if (indicator.id === 'water') {
                        return {
                            color: 'grey',
                            fillColor: MapUtils.getWaterColor(feature.properties['infrastructure.water.access']),
                            fillOpacity: 1,
                            opacity: 0.3,
                            weight: 1
                        }
                    }
                    return { color: 'rgb(189,56,26)', weight: 1 };

                case 'PLTD':
                case 'Pos TNI':
                case 'TPU':
                case 'Sarana Olahraga':
                case 'Taman Wisata Budaya':
                case 'Pelabuhan':
                case 'Lapangan Sepak Bola':
                case 'Lapangan Volley':
                case 'Bak Penampungan PDAM':
                    return { color: 'rgb(189,56,26)', weight: 1 };

                case 'Area Permukiman':
                case 'Area Gedung':
                case 'Area Industri Tidak Terpakai':
                    return { color: 'rgb(171, 180, 164)' };

                case 'Embung':
                case 'Sungai':
                case 'Sungai Kicak':
                    return { color: 'rgb(0,116,130)' };

                case 'Rawa':
                    return { color: '#9EDEE6' };

                case 'Jalan':
                case 'Koridor Jalan':
                    return { color: 'rgb(217, 221, 217)', weight: 1 };

                case 'Hutan':
                case 'Hutan Desa':
                case 'Hutan Manggrove':
                case 'Semak Belukar':
                    return { color: '#48712A' };

                case 'Rumput Rawa':
                case 'Lahan Tidur':
                case 'Tanah Terbuka':
                case 'Kebun Mahoni':
                case 'Kebun Campuran':
                case 'Kebun Kemiri':
                case 'Kebun Kumbili':
                case 'Kebun Kelapa':
                case 'Hutan Desa':
                case 'Kebun Sagu':
                case 'Kebun Karet':
                case 'Kebun Durian':
                case 'Kebun Manggis':
                    return { color: 'rgb(190,207,178)' };

                default:
                    return { color: 'rgb(190,207,178)' };
            }
        }
        else {
            return { color: '#333333', weight: 5 };
        }
    }
}
