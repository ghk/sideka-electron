import { Component, ApplicationRef, EventEmitter, Input, Output } from "@angular/core";
import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import MapUtils from '../helpers/mapUtils';
import dataApi from '../stores/dataApi';

@Component({
    selector: 'map',
    templateUrl: 'templates/map.html'
})
export default class MapComponent{
    private _indicator: any;
    private _village: any;

    @Output() onLayerSelected = new EventEmitter<any>();

    @Input()
    set indicator(value: any) {
        this._indicator = value;
    };
    get indicator() {
        return this._indicator;
    }

    @Input()
    set village(value: any) {
        this._village = value;
    };
    get village() {
        return this._village;
    }

    map: L.Map;
    options: any;
    center: L.LatLng;
    zoom: number;
    geoJSONLayer: L.GeoJSON;
    control: L.Control;
    smallSizeLayers: L.LayerGroup = L.layerGroup([]);
    mediumSizeLayers: L.LayerGroup = L.layerGroup([]);
    bigSizeLayers: L.LayerGroup = L.layerGroup([]);

    constructor(){}

    ngOnInit(): void {
        this.center = L.latLng(-6.174668, 106.827126);
        this.zoom = 14;
        this.options = {
            layers: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        };
        
        setTimeout(() => {
            let zoom = this.village.zoom ? this.village.zoom : 14
            this.map.setView([this.village.location[0], this.village.location[1]], zoom);
            this.clearMap();
            this.loadGeoJson();
        }, 3000)
    }

    loadGeoJson(): void {
        dataApi.getDesaFeatures(this.village.id, this.indicator.features, this.indicator.subFeature, (result) => {
           let geoJson = this.createGeoJsonFormat();

           for(let i=0; i<result.length; i++)
                geoJson.features = geoJson.features.concat(result[i]['features']);

            this.setGeoJsonLayer(geoJson);
        });
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
                return MapUtils.getGeoJsonStyle(feature, this.indicator.name);
            },
            onEachFeature: (feature, layer: L.FeatureGroup) => {
                let popup = L.popup().setContent(feature.properties['Keterangan']);
               
                layer.on({
                    "click": (e) => {
                        this.onLayerSelected.emit(layer);
                    }
                })
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
        //this.setHideOnZoom(this.map);
    }
}
