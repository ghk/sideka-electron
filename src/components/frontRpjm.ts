import { Component, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';

import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';

@Component({
    selector: 'front-rpjm',
    templateUrl: 'templates/frontRpjm.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontRpjmComponent {
    settingsSubscription: Subscription;
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
        this.siskeudesMessage = this.siskeudesService.getSiskeudesMessage();
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => { 
            this.kodeDesa = settings.kodeDesa;
            this.getVisiRPJM();
        });        
    }

    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    getVisiRPJM(): void {
        if (this.siskeudesMessage)
            return;

        this.siskeudesService.getVisiRPJM(this.kodeDesa, data => {
            this.zone.run(() => {
                this.visiRPJM = data;
            });
        });
    }
}