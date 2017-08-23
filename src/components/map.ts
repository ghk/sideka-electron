import { Component, ApplicationRef, EventEmitter, Input, Output, Injector, ComponentRef, ComponentFactoryResolver } from "@angular/core";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import MapUtils from '../helpers/mapUtils';

var jetpack = require("fs-jetpack");

const geoJSONArea = require('@mapbox/geojson-area');
const geoJSONExtent = require('@mapbox/geojson-extent');
const DATA_SOURCES = 'data';
const LAYERS = {
    OSM: new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    Satellite: new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
};

@Component({
    selector: 'map',
    templateUrl: 'templates/map.html'
})
export default class MapComponent {
    private _indicator: any;
    private _bigConfig: any;

    @Output() selectFeature = new EventEmitter<any>();

    @Input()
    set indicator(value: any) {
        this._indicator = value;
    }
    get indicator() {
        return this._indicator;
    }

    @Input()
    set bigConfig(value: any) {
        this._bigConfig = value;
    }
    get bigConfig() {
        return this._bigConfig;
    }

    map: L.Map;
    options: any;
    drawOptions: any;
    center: any;
    zoom: number;
    geoJSONLayer: L.GeoJSON;
    control: L.Control;
    smallSizeLayers: L.LayerGroup = L.layerGroup([]);
    mediumSizeLayers: L.LayerGroup = L.layerGroup([]);
    bigSizeLayers: L.LayerGroup = L.layerGroup([]);
    mapData: any;
    perkabigConfig: any;

    constructor() { }

    ngOnInit(): void {
        this.center = L.latLng(-6.174668, 106.827126);
        this.zoom = 14;
        this.options = {
            layers: null
        };

        this.drawOptions = {
            position: 'topright',
            draw: {
                marker: {
                    icon: L.icon({
                        iconUrl: '2273e3d8ad9264b7daa5bdbf8e6b47f8.png',
                        shadowUrl: '44a526eed258222515aa21eaffd14a96.png'
                    })
                },
                polyline: false,
                circle: {
                    shapeOptions: {
                        color: '#aaaaaa'
                    }
                }
            }
        };
    }

    setMap(): void {
        this.clearMap();
        this.map.setView(this.center, 14);
        this.loadGeoJson();
    }

    setMapData(data): void {
        this.mapData = data;
    }

    setLayer(name): void {
        this.map.addLayer(LAYERS[name]);
    }

    removeLayer(name): void {
        this.map.removeLayer(LAYERS[name]);
    }

    loadGeoJson(): void {
        let geoJson = this.createGeoJsonFormat();

        if (!this.mapData[this.indicator.id])
            return;

        geoJson.features = this.mapData[this.indicator.id];
        this.setGeoJsonLayer(geoJson);
    }

    createGeoJsonFormat(): any {
        return {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            },
            "features": []
        }
    }

    setGeoJsonLayer(geoJSON: any): void {
        this.geoJSONLayer = L.geoJSON(geoJSON, {
            style: (feature) => {
                return { color: '#333333', weight: 2 }
            },
            onEachFeature: (feature, layer: L.FeatureGroup) => {
                layer.on({
                    "click": (e) => {
                        this.selectFeature.emit(layer);
                    }
                });

                let keys = Object.keys(feature['properties']);
                let element = null;

                for (let i = 0; i < keys.length; i++) {
                    element = this.indicator.elements.filter(e => e.value === feature['properties'][keys[i]])[0];

                    if (element)
                        break;
                }

                if (!element)
                    return;

                if (element['style']) {
                    let style = Object.assign({}, element['style']);
                    style['color'] = this.cmykToRgb(element['style']['color']);
                    layer.setStyle(style);
                }
            }
        });

        this.geoJSONLayer.addTo(this.map);
    }

    clearMap() {
        if (this.geoJSONLayer)
            this.map.removeLayer(this.geoJSONLayer);

        if (this.control)
            this.control.remove();

        this.smallSizeLayers.clearLayers();
        this.mediumSizeLayers.clearLayers();
        this.bigSizeLayers.clearLayers();
    }

    setHideOnZoom(map: L.Map): void {
        map.on('zoomend', $event => {
            if (this.indicator && this.indicator.id === 'area') {
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
            }
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

    onMapReady(map: L.Map): void {
        this.map = map;
        this.smallSizeLayers.addTo(this.map);
        this.mediumSizeLayers.addTo(this.map);
        this.bigSizeLayers.addTo(this.map);
        this.setHideOnZoom(this.map);
    }

    cmykToRgb(cmyk): any {
        let c = cmyk[0], m = cmyk[1], y = cmyk[2], k = cmyk[3];
        let r, g, b;
        r = 255 - ((Math.min(1, c * (1 - k) + k)) * 255);
        g = 255 - ((Math.min(1, m * (1 - k) + k)) * 255);
        b = 255 - ((Math.min(1, y * (1 - k) + k)) * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    }
}
