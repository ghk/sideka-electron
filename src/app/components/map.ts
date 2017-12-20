import { Component, ApplicationRef, EventEmitter, Input, Output, Injector, ComponentRef, ComponentFactoryResolver } from "@angular/core";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as $ from 'jquery';

import MapUtils from '../helpers/mapUtils';

var jetpack = require("fs-jetpack");

const geoJSONArea = require('@mapbox/geojson-area');
const geoJSONLength = require('geojson-length');
const geoJSONExtent = require('@mapbox/geojson-extent');
const DATA_SOURCES = 'data';
const LAYERS = {
    "OpenStreetMap": new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    "OpenTopoMap": new L.TileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
    "ESRIImagery": new L.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
    'MapboxSatellite': new L.TileLayer('https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZ2hrIiwiYSI6ImUxYmUxZDU3MTllY2ZkMGQ3OTAwNTg1MmNlMWUyYWIyIn0.qZKc1XfW236NeD0qAKBf9A')
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

    div = null;
    surfaces = null;

    constructor() {
        super();
        this.onAdd = (map: L.Map) => {
            this.div = L.DomUtil.create('div', 'info legend');
            this.updateFromData();
            return this.div;
        };
    }

    updateFromData(){
    }
}

class LanduseLegendControl extends LegendControl {

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
            if(element.values && landuseAreas[element.values.landuse]){
                let area = roundNumber((landuseAreas[element.values.landuse] / 10000), 2) + " ha";
                this.div.innerHTML += '<i style="background:' + MapUtils.getStyleColor(element["style"]) + '"></i>' + element.label +" (" + area + ')<br/><br/>';
            }
        });
    }
}

class TransportationLegendControl extends LegendControl {

    updateFromData(){
        let highwayLengths = {};
        this.features.filter(f => f.properties && Object.keys(f.properties).length).forEach(f => {
            let surface = f.properties.surface;
            if(surface && f.geometry){
                let highway = f.properties.highway ? f.properties.highway : '';

                if(!highwayLengths[highway])
                    highwayLengths[highway] = {};
                let surfaceLengths = highwayLengths[highway];

                let length = geoJSONLength(f.geometry);
                if(!surfaceLengths[surface])
                    surfaceLengths[surface] = 0;
                surfaceLengths[surface] += length;
            }
        });
        if(!this.surfaces){
            this.surfaces = this.indicator.attributeSets.highway.filter(e => e.key == "surface")[0].options;
        }
        this.div.innerHTML = "";
        this.indicator.elements.forEach(indicatorElement => {
            let highway = indicatorElement.values.highway;
            let surfaceLengths = highwayLengths[highway];
            if(surfaceLengths){
                let highwayLength = Object.keys(surfaceLengths).reduce((memo, key) => memo + surfaceLengths[key],0);
                if(highwayLength){
                    let length = roundNumber(highwayLength, 2) + " m";
                    this.div.innerHTML += '<i style="background:' + MapUtils.getStyleColor(indicatorElement["style"]) + '"></i>' + indicatorElement.label +" (" + length + ')<br/>';
                    this.surfaces.forEach(element => {
                        if(surfaceLengths && surfaceLengths[element.value]){
                            let length = roundNumber(surfaceLengths[element.value], 2) + " m";
                            this.div.innerHTML += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  "+element.label +" (" + length + ')<br/>';
                        }
                    });
                }
                this.div.innerHTML += "<br/>";
            }
        });
    }
}

class BoundaryLegendControl extends LegendControl {

    updateFromData(){
        let area = 0;
        let definitiveLength = 0;
        let indicativeLength = 0;

        this.features.filter(f => f.properties && Object.keys(f.properties).length).forEach(f => {
            let admin_level = f.properties.admin_level;
            if(admin_level == 7 && f.geometry){
                window["f"] = f;
                window["geoJSONLength"] = geoJSONLength;
                area += geoJSONArea.geometry(f.geometry);
                definitiveLength += geoJSONLength(f.geometry);
            }
        });
        let areaString = roundNumber((area / 10000), 2) + " ha";
        let lengthString = roundNumber((definitiveLength / 100), 2) + " km";
        this.div.innerHTML = "";
        this.div.innerHTML += "Luas Desa: " + areaString + '<br/><br/>';
        this.div.innerHTML += "Keliling Desa: " + lengthString + '<br/><br/>';
    }
}

class InfrastructureLegendControl extends LegendControl {
      updateFromData(){
          let infrastructures = {};
      }
}

@Component({
    selector: 'map',
    templateUrl: '../templates/map.html'
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
    layers: L.Layer[] = [];
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

    setMap(recenter=true): void {
        this.clearMap();
        this.loadGeoJson();

        try {
           if(recenter) 
            this.map.setView(this.geoJSONLayer.getBounds().getCenter(), 14);
        }
        catch(error) {
            console.log('Something wrong with this geojson either the structure is error or null');
        }
       
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

        switch(this.indicator.id){
            case 'landuse':
                controlType = LanduseLegendControl;
                break;
            case 'network_transportation':
                controlType = TransportationLegendControl;
                break;
            case 'boundary':
                controlType = BoundaryLegendControl;
                break;
            case 'facilities_infrastructures':
                controlType = InfrastructureLegendControl;
                break;
        }
        
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
     
        this.layers = [];

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
                
                let center = null;

                if(layer.feature['geometry'].type === 'Point'){
                    center = layer.feature['geometry'].coordinates;
                }
                else {
                    let bounds = layer.getBounds();
                    center = bounds.getCenter();
                }
                
                let element = null;

                for (let i = 0; i < this.indicator.elements.length; i++) {
                    let current = this.indicator.elements[i];

                    if(current.values){
                        let valueKeys = Object.keys(current.values);
                        if(valueKeys.every(valueKey => feature["properties"][valueKey] === current.values[valueKey])){
                            element = current;
                            break;
                        }
                    }
                }

                if (!element)
                    return;

                if (element['style']) {
                    let style = MapUtils.setupStyle(element['style']);
                    layer.setStyle(style);
                }
           
                if(feature.properties['boundary_sign']) {
                    let style = MapUtils.setupStyle({ dashArray: feature.properties['boundary_sign'] });
                    layer.setStyle(style);
                }

                if(feature.properties['icon']){
                    let icon = L.icon({
                        iconUrl: 'assets/markers/' + feature.properties['icon'],
                        iconSize:     [15, 15],
                        shadowSize:   [50, 64],
                        iconAnchor:   [22, 24],
                        shadowAnchor: [4, 62],
                        popupAnchor:  [-3, -76]
                    });

                    let marker = L.marker(center, {icon: icon}).addTo(this.map);
                    
                    this.addMarker(marker);
                    this.selectFeature['marker'] = marker;
                }
            }
        };

        this.geoJSONLayer = MapUtils.setGeoJsonLayer(geoJson, geoJsonOptions).addTo(this.map);
        this.layers = this.geoJSONLayer.getLayers();
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
        //RESIZE ICON
        this.map.on('zoomend', () => {
            this.map.eachLayer(layer => {
               
            });
        });
    }
}
