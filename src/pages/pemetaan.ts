import { Component, ApplicationRef } from "@angular/core";
import * as L from 'leaflet';

@Component({
    selector: 'pemetaan',
    templateUrl: 'templates/pemetaan.html'
})
export default class PemetaanComponent {
    map: L.Map;

    constructor(private appRef: ApplicationRef){
        
    }

    ngOnInit(): void {

    }
}
