import { Component, ApplicationRef } from "@angular/core";
import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent {
    layerPath: string;
    village: any;

    constructor(private appRef: ApplicationRef){}

    ngOnInit(): void {
        this.village = JSON.parse(jetpack.read('data/desa.json')).filter(e => e.id === 'alas')[0];
        this.layerPath = 'data/desa-alas/tutupan-lahan.json';
    }
}
