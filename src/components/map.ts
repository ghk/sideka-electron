import { Component, ApplicationRef, EventEmitter, Input, Output, Injector, ComponentRef, ComponentFactoryResolver } from "@angular/core";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as $ from 'jquery';

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
    snapShotMap: L.Map;
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
    markers = [];
    isExportingMap: boolean;

    constructor() { }

    ngOnInit(): void {
        this.isExportingMap = false;
        this.center = L.latLng(-6.174668, 106.827126);
        this.zoom = 14;
        this.options = {
            layers: null,
            renderer: L.canvas()
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
        let geoJson = MapUtils.createGeoJson();

        if (!this.mapData || !this.mapData[this.indicator.id])
            return;

        geoJson.features = this.mapData[this.indicator.id];

        let geoJsonOptions = {
            style: (feature) => {
                return { color: '#000', weight: 3 }
            },
            pointToLayer: (feature, latlng) => {
                return new L.CircleMarker(latlng, {
                    radius: 8,
                    fillColor: "#ff7800",
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: (feature, layer: L.FeatureGroup) => {
                layer.on({
                    "click": (e) => {
                        this.selectFeature.emit(layer);
                    }
                });

                let bounds = layer.getBounds();
                let center = bounds.getCenter();
  
                if(feature.properties['icon']){
                    let icon = L.icon({
                        iconUrl: 'markers/' + feature.properties['icon'],
                        iconSize:     [38, 38],
                        shadowSize:   [50, 64],
                        iconAnchor:   [22, 24],
                        shadowAnchor: [4, 62],
                        popupAnchor:  [-3, -76]
                    });

                    let marker = L.marker(center, {icon: icon}).addTo(this.map);
                    
                    this.addMarker(marker);
                    this.selectFeature['marker'] = marker;
                }
            
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
                    style['color'] = MapUtils.cmykToRgb(element['style']['color']);
                    layer.setStyle(style);
                }
            }
        };

        this.geoJSONLayer = MapUtils.setGeoJsonLayer(geoJson, geoJsonOptions).addTo(this.map);
    }

    addMarker(marker): void {
        this.markers.push(marker);
    }

    clearMap() {
        this.geoJSONLayer ? this.map.removeLayer(this.geoJSONLayer) : null;
        this.control ? this.control.remove() : null;

        for(let i = 0; i<this.markers.length; i++)
            this.map.removeLayer(this.markers[i]);

        this.markers = [];
    }
    
    onMapReady(map: L.Map): void {
        this.map = map;
    }
}
