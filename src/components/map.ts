import { Component, ApplicationRef, EventEmitter, Input, Output, Injector, ComponentRef, ComponentFactoryResolver } from "@angular/core";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import MapUtils from '../helpers/mapUtils';
import dataApi from '../stores/dataApi';

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
export default class MapComponent{
    private _indicator: any;

    @Output() onLayerSelected = new EventEmitter<any>();
 
    @Input()
    set indicator(value: any) {
        this._indicator = value;
    };
    get indicator() {
        return this._indicator;
    }

    map: L.Map;
    options: any;
    drawOptions: any;
    center: L.LatLng;
    zoom: number;
    geoJSONLayer: L.GeoJSON;
    control: L.Control;
    smallSizeLayers: L.LayerGroup = L.layerGroup([]);
    mediumSizeLayers: L.LayerGroup = L.layerGroup([]);
    bigSizeLayers: L.LayerGroup = L.layerGroup([]);
    mappingData: any;

    constructor(){}

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
    
        setTimeout(() => {
            this.setMap();
        },1000)
    }

    setMap(): void {
        dataApi.getContentMap(result => {
            let zoom = 14   
            this.mappingData = result;
            this.map.setView([this.mappingData.center[0],  this.mappingData.center[1]], zoom);
            this.loadGeoJson();
            this.setLegend();
        });
    }

    setLayer(name): void {
        this.map.addLayer(LAYERS[name]);
    }

    setLegend(): void {
        let legendAttributes = null;

        if(this.indicator.id === 'building')
            legendAttributes = MapUtils.BUILDING_COLORS;
        else if(this.indicator.id === 'landuse')
            legendAttributes = MapUtils.LANDUSE_COLORS;
            
        if(!legendAttributes)
            return;
        
        this.control = new L.Control();
        this.control.onAdd = (map: L.Map) => {
            var div = L.DomUtil.create('div', 'info legend');
            legendAttributes.forEach(legendAttribute => {
                div.innerHTML += '<i style="background:' + legendAttribute.color + '"></i>' + legendAttribute.description + '<br/>';
            });
            return div;
        };
        this.control.setPosition('topright');
        this.control.addTo(this.map);
    }

    removeLayer(name): void {
        this.map.removeLayer(LAYERS[name]);
    }

    loadGeoJson(): void {
       
       /* let dataIndicator = [{ "indicator": 'landuse', "path": 'tutupan-lahan' },
                            {"indicator": 'highway', "path": 'as-jalan'}, 
                            {"indicator": 'building', "path": 'bangunan'},
                            {"indicator": 'boundary', "path": 'batas-dusun-aimalirin'},
                            {"indicator": 'boundary', "path": 'batas-dusun-fatuha'},
                            {"indicator": 'boundary', "path": 'batas-dusun-fatuleki'},
                            {"indicator": 'boundary', "path": 'batas-dusun-kotabot'},
                            {"indicator": 'boundary', "path": 'batas-dusun-kotadato'},
                            {"indicator": 'boundary', "path": 'batas-dusun-webora'}];*/
       
       let geoJson = this.createGeoJsonFormat();
       geoJson.features = this.mappingData.data.filter(e => e.indicator === this.indicator.id);
       this.setGeoJsonLayer(geoJson);
    }

    createGeoJsonFormat(): any{
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

    setGeoJsonLayer(geoJSON: any): void{
        this.geoJSONLayer = L.geoJSON(geoJSON, {
            style: (feature) => {        
                 return { color: '#333333', weight: 2 }
            },
            onEachFeature: (feature, layer: L.FeatureGroup) => {
                if(layer.feature['properties']['style'])
                   layer.setStyle(layer.feature['properties']['style']);
                   
                layer.on({
                    "click": (e) => {
                        this.onLayerSelected.emit(layer);
                    }
                });
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
        })
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
}
