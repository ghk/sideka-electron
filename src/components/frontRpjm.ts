import { Component, NgZone } from '@angular/core';

import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';

@Component({
    selector: 'front-rpjm',
    templateUrl: 'templates/frontRpjm.html',
})

export default class FrontRpjmComponent{
    siskeudesMessage: string;
    kodeDesa: string;
    visiRPJM: any;
    
    constructor(
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService
    ) {
    }

    ngOnInit(): void {
        this.kodeDesa = this.settingsService.get('kodeDesa');
        this.siskeudesMessage = this.siskeudesService.getSiskeudesMessage();
    }

    getVisiRPJM(): void {
        if (this.siskeudesMessage)
            return;

        this.zone.run(() => {
            this.siskeudesService.getVisiRPJM(this.kodeDesa, data => {
                this.visiRPJM = data;
            });
        });
    }
}