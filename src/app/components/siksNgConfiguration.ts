import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { remote } from 'electron';

import { SiksNgService } from '../stores/siksNgService';
import { SettingsService } from '../stores/settingsService';
import { toSiskeudes } from '../stores/siskeudesFieldTransformer';


import * as jetpack from 'fs-jetpack';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as moment from 'moment';

var base64Img = require('base64-img');

@Component({
    selector: 'siksng-configuration',
    templateUrl: '../templates/siksNgConfiguration.html',
})

export class SiksNgConfigurationComponent {
    settings: any;
    settingsSubscription: Subscription;
    errorMessage: string;
    model: any;
    regions = {};

    constructor(
        private toastr: ToastrService,
        private vcr: ViewContainerRef,
        private zone: NgZone,
        private siksNgService: SiksNgService,
        private settingsService: SettingsService,
    ) {
    }

    ngOnInit(): void {
        this.settings = {};
        this.model = {};
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings; 
        });
        this.readRegions();
    }
    
    ngOnDestroy():void {
        this.settingsSubscription.unsubscribe();
    }

    saveSettings() {
        this.settingsService.setAll(this.settings);
        this.readRegions();        
    }

    readRegions() {
        if(!this.settings['siksng.path'])
            return;

        if (!jetpack.exists(this.settings['siksng.path']))
            return;
        
        this.regions = {};
        this.errorMessage = null;
        this.siksNgService.getRegions(this.settings['siksng.path'], (err, regions) =>{
            this.errorMessage = err;
            if(!err){
                this.regions = regions;
                if(!this.settings['siksng.provinsi'] && regions["provinsi"].length == 1)
                    this.settings["siksng.provinsi"] = regions["provinsi"][0].kode_provinsi;
                if(!this.settings['siksng.kabupaten'] && regions["kabupaten"].length == 1)
                    this.settings["siksng.kabupaten"] = regions["kabupaten"][0].kode_kab;
                if(!this.settings['siksng.kecamatan'] && regions["kecamatan"].length == 1)
                    this.settings["siksng.kecamatan"] = regions["kecamatan"][0].kode_kecamatan;
                if(!this.settings['siksng.desa'] && regions["desa"].length == 1)
                    this.settings["siksng.desa"] = regions["desa"][0].kode_desa;
            }
        })
    }
    
    fileChangeEvent(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        this.settings['siksng.path'] = file.path; 
        this.reset();
        this.readRegions();
    }

    reset(){
        this.settings['siksng.desa'] = '';   
        this.settings['siksng.kecamatan'] = '';   
        this.settings['siksng.kabupaten'] = '';   
        this.settings['siksng.provinsi'] = '';   
    }

}