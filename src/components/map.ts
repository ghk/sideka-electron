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

function roundNumber(num, scale) {
    if(!("" + num).includes("e")) {
        return +(Math.round(parseFloat(num + "e+" + scale))  + "e-" + scale);
    } else {
        var arr = ("" + num).split("e");
        var sig = ""
        if(+arr[1] + scale > 0) {
        sig = "+";
        }
        return +(Math.round(parseFloat(+arr[0] + "e" + sig + (+arr[1] + scale))) + "e-" + scale);
    }
}

class LegendControl extends L.Control {
    public features = null;
    public indicator = null;

    updateFromData(){
    }
}

class LanduseLegendControl extends LegendControl {

    div = null;

    constructor() {
        super();
        let legendAttributes = MapUtils.BUILDING_COLORS;
        this.onAdd = (map: L.Map) => {
            this.div = L.DomUtil.create('div', 'info legend');
            this.updateFromData();
            return this.div;
        };
    }

    updateFromData(){
        let landuseAreas = {};
        this.features.filter(f => f.properties && Object.keys(f.properties).length).forEach(f => {
            let landuse = f.properties.landuse;
            if(landuse && f.geometry){
                let area = geoJSONArea.geometry(f.geometry);
                if(!landuseAreas[landuse])
                    landuseAreas[landuse] = 0;
                landuseAreas[landuse] += area;
            }
        });
        this.div.innerHTML = "";
        this.indicator.elements.forEach(element => {
            if(landuseAreas[element.value]){
                let area = roundNumber((landuseAreas[element.value] / 10000), 2) + " ha";
                this.div.innerHTML += '<i style="background:' + MapUtils.getStyleColor(element["style"]) + '"></i>' + element.label +" (" + area + ')<br/><br/>';
            }
        });
    }
}

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
    smallSizeLayers: L.LayerGroup = L.layerGroup([]);
    mediumSizeLayers: L.LayerGroup = L.layerGroup([]);
    bigSizeLayers: L.LayerGroup = L.layerGroup([]);
    mapData: any;
    perkabigConfig: any;
    markers = [];
    isExportingMap: boolean;

    legendControl: LegendControl;

    constructor() { }

    ngOnInit(): void {
        this.isExportingMap = false;
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
        this.setupLegend();
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

    
    setupLegend(): void {
        this.legendControl ? this.legendControl.remove() : null;
        this.legendControl = null;

        let controlType = null;

        if(this.indicator.id === 'landuse')
            controlType = LanduseLegendControl

        if(!controlType)
            return;
            
        this.legendControl = new controlType();
        this.legendControl.features = this.mapData[this.indicator.id];
        this.legendControl.indicator = this.indicator;
        this.legendControl.setPosition('topright');
        this.legendControl.addTo(this.map);
    }

    updateLegend(): void {
        if(this.legendControl){
            this.legendControl.updateFromData();
        }
    }

    loadGeoJson(): void {
        let geoJson = MapUtils.createGeoJson();

        if (!this.mapData || !this.mapData[this.indicator.id])
            return;

        geoJson.features = this.mapData[this.indicator.id];

        let geoJsonOptions = {
            style: (feature) => {
                return { color: '#000', weight: feature.geometry.type === 'LineString' ? 3 : 1 }
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
                    let style = MapUtils.setupStyle(element['style']);
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
        this.legendControl ? this.legendControl.remove() : null;

        for(let i = 0; i<this.markers.length; i++)
            this.map.removeLayer(this.markers[i]);

        this.markers = [];
    }
    
    onMapReady(map: L.Map): void {
        this.map = map;
    }
}
