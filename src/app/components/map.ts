import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from "@angular/core";
import { LegendControl, LanduseControl, BoundaryControl, TransportationControl, InfrastructureControl } from '../helpers/legendControl';

import * as L from 'leaflet';

import { MapUtils } from '../helpers/mapUtils';

const LAYERS = {
    empty: null,
    osm: new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    otm: new L.TileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
    esri: new L.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:17}),
    satellite: new L.TileLayer('https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZ2hrIiwiYSI6ImUxYmUxZDU3MTllY2ZkMGQ3OTAwNTg1MmNlMWUyYWIyIn0.qZKc1XfW236NeD0qAKBf9A'),
    googleSatellite: new L.TileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {subdomains: ['mt0','mt1','mt2','mt3']})
};

@Component({
    selector: 'sideka-map',
    templateUrl: '../templates/map.html'
})
export class MapComponent implements OnInit, OnDestroy {
    private _indicator: any;

    @Input()
    set indicator(value) {
        this._indicator = value;
    }
    get indicator() {
        return this._indicator;
    }

    @Output() selectFeature = new EventEmitter<any>();
    @Output() onLoadContent = new EventEmitter<any>();

    map: L.Map = null;
    mapOptions: L.MapOptions = null;
    markers: L.Marker[] = [];
    geoJson: L.GeoJSON = null;
    legendControl: LegendControl = null;

    data: any = {};

    constructor() {}

    ngOnInit(): void {
        this.mapOptions = {
            zoom: 14,
            center: L.latLng(-6.174668, 106.827126)
        }
    }

    onMapReady(map: L.Map) {
        this.map = map;
        this.onLoadContent.emit();
    }
    
    load(recenter?: boolean): void {
        this.clear();

        let geoJson = MapUtils.createGeoJson();

        geoJson.features = this.data && this.data[this.indicator.id] ? this.data[this.indicator.id] : [];
        
        this.geoJson = MapUtils.setGeoJsonLayer(geoJson, this.getGeojsonOptions()).addTo(this.map);

        if (recenter)
            this.recenter();
        
        this.setLegend();
        this.map.invalidateSize();
    }

    recenter(): void {
        try {
            this.map.setView(this.geoJson.getBounds().getCenter(), 14); 
        }
        catch(exception) {
            console.log(exception);
        }
    }

    getGeojsonOptions(): L.GeoJSONOptions {
        return {
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
    }

    addMarker(marker: L.Marker): void {
        this.markers.push(marker);
    }

    removeMarker(marker): void {
        this.map.removeLayer(marker);
    }

    bindMarker(marker): void {
        marker.addTo(this.map);
    }

    setLayer(layer: L.Layer) {
        this.map.addLayer(layer);
    }

    getLayer(key: string): L.Layer {
        return LAYERS[key];
    }

    setLegend(): void {
        this.legendControl ? this.legendControl.remove() : null;
        this.legendControl = null;

        let controlType = null;

        switch(this.indicator.id){
            case 'landuse':
                controlType = LanduseControl;
                break;
            case 'network_transportation':
                controlType = TransportationControl;
                break;
            case 'boundary':
                controlType = BoundaryControl;
                break;
            case 'facilities_infrastructures':
                controlType = InfrastructureControl;
                break;
        }
        
        if(!controlType)
            return;
            
        this.legendControl = new controlType();
        this.legendControl.features = this.data ? this.data[this.indicator.id] : [];
        this.legendControl.indicator = this.indicator;
        this.legendControl.setPosition('topright');
        this.legendControl.addTo(this.map);
    }

    unsetLayer(layer: L.Layer) {
        this.map.removeLayer(layer);
    }

    updateLegend(): void {
        if(this.legendControl)
            this.legendControl.updateFromData();
    }

    clear(): void {
        this.geoJson ? this.map.removeLayer(this.geoJson) : null;
        this.legendControl ? this.legendControl.remove() : null;

        for(let i = 0; i<this.markers.length; i++)
            this.map.removeLayer(this.markers[i]);

        this.markers = [];
    }

    ngOnDestroy(): void {}
}