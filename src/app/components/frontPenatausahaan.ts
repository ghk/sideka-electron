import { Component, NgZone, Input } from '@angular/core';
import { Subscription } from 'rxjs';

import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'front-penatausahaan',
    templateUrl: '../templates/frontPenatausahaan.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontPenatausahaanComponent {
    settingsSubscription: Subscription;    
    routeSubscription: Subscription;
    listSiskeudesDb: any[] = [];
    settings: any;
    activeUrl: string;
    _activeDatabase: any = null; 

    set activeDatabase(value){
        this._activeDatabase = value;       
    }

    get activeDatabase(){
        return this._activeDatabase;
    }

    constructor(
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
    }

    ngOnInit(): void {
        this.settings = {};
        this.listSiskeudesDb = [];
        this.routeSubscription = this.route.queryParams.subscribe(async (params) => {
            this.activeUrl = params['url'];
            this.settingsSubscription = this.settingsService.getAll().subscribe(settings => { 
                this.settings = settings;
                this.listSiskeudesDb = this.settingsService.getListSiskeudesDb();  
            });        
        })
    }

    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    selectDatabase(db){
        this.activeDatabase = db; 
        this.siskeudesService.setConnection(db.path);  
        this.router.navigate([`/${this.activeUrl}`], { queryParams: { 
            path: this.activeDatabase.path
        } });
    }
}