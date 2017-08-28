import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastsManager } from 'ng2-toastr';

import CreateSiskeudesDbComponent from '../components/createSiskeudesDb';
import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';

import * as jetpack from 'fs-jetpack';

var base64Img = require('base64-img');

@Component({
    selector: 'sideka-configuration',
    templateUrl: 'templates/sidekaConfiguration.html',
})

export default class SidekaConfigurationComponent {
    settings: any;
    settingsSubscription: Subscription;
    siskeudesDesas: any;
    isCreateSiskeudesDbShown: boolean;

    constructor(
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService
    ) {
        this.toastr.setRootViewContainerRef(this.vcr);
    }

    ngOnInit(): void {
        this.settings = {};
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings; 
        });
    }
    
    ngOnDestroy():void {
        this.settingsSubscription.unsubscribe();
    }

    saveSettings() {
        this.settingsService.setAll(this.settings);
        this.readSiskeudesDesa();
        this.toastr.success('Penyimpanan Berhasil!', '');
    }

    readSiskeudesDesa() {
        if(!this.settings['siskeudes.path'])
            return;

        if (!jetpack.exists(this.settings['siskeudes.path']))
            return;

        this.siskeudesService.getAllDesa(this.settings['siskeudes.path'], data =>{
            this.zone.run(() => {
                this.siskeudesDesas = data;
            })            
        })
    }
    
    fileChangeEvent(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        if (extensionFile == 'mde' || extensionFile == 'mdb') {
            this.settings['siskeudes.path'] = file.path; 
            this.settings['kodeDesa'] = '';   
            this.readSiskeudesDesa();
        } else {
            this.settings['logo'] = base64Img.base64Sync(file.path);
        }
    }

    showCreateSiskeudesDb(show): void {
        this.isCreateSiskeudesDbShown = show;
    }

    afterCreateSiskeudesDb(result){
        if(result.status){
            this.settings['kodeDesa'] = result.kodeDesa;
            this.settings['siskeudes.path'] = result.path;
            this.saveSettings();
        }
    }
}