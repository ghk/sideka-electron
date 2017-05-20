import { Component, ApplicationRef } from "@angular/core";
import * as L from 'leaflet';

@Component({
    selector: 'map',
    templateUrl: 'templates/map.html'
})
export default class MapComponent {
    map: L.Map;
    options: any;
    zoom: number;
    center: L.LatLng;
    smallSizeLayers: L.LayerGroup = L.layerGroup([]);
    mediumSizeLayers: L.LayerGroup = L.layerGroup([]);
    bigSizeLayers: L.LayerGroup = L.layerGroup([]);

    constructor(){
        this.center = L.latLng(-6.174668, 106.827126);
        this.zoom = 14;
        this.options = {
            layers: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        };
    }

    ngOnInit(): void {

    }

    setHideOnZoom(map: L.Map): void {
        
    }

    onMapReady(map: L.Map): void {
        this.map = map;
        this.smallSizeLayers.addTo(this.map);
        this.mediumSizeLayers.addTo(this.map);
        this.bigSizeLayers.addTo(this.map);
        this.setHideOnZoom(map);
    }
}
