import { Component, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';

import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import { Router } from '@angular/router';

@Component({
    selector: 'front-perencanaan',
    templateUrl: '../templates/frontPerencanaan.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontPerencanaanComponent {
    settingsSubscription: Subscription;
    siskeudesMessage: string;
    kodeDesa: string;
    visiRPJM: any;    

    constructor(
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
        private router: Router
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
                if(data.length == 1){
                    let rpjm = data[0];
                    this.router.navigate(['/perencanaan'], { queryParams: { 
                        id_visi: rpjm.ID_Visi, 
                        first_year: rpjm.TahunA, 
                        last_year: rpjm.TahunN, 
                        kd_desa: rpjm.Kd_Desa, 
                    } });``
                }
                this.visiRPJM = data;
            });
        });
    }
}