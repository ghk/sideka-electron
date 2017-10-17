import { Component, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';

import DataApiService from '../stores/dataApiService';

@Component({
    selector: 'front-pengguna',
    templateUrl: '../templates/frontPengguna.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontPenggunaComponent {
    users: any[] = [];
    _activeUser: any = null;
    activeUserRoles = {};
    availableRoles = ["administrator", "penduduk", "keuangan", "pemetaan", "editor", "author", "contributor"];
    roleNames = {
        "administrator": "Administrator",
        "penduduk": "Admin Kependudukan",
        "keuangan": "Admin Keuangan",
        "pemetaan": "Admin Pemetaan",
        "editor": "Penyunting Web",
        "author": "Penulis Web",
        "contributor": "Kontributor Web",
    }
    roleDescriptions = {
        "administrator": "dapat melakukan semua hal",
        "penduduk": "dapat mengedit dan memperbaharui data kependudukan dan kemiskinan",
        "keuangan": "dapat mengedit dan memperbaharui data perencanaan, penganggaran, dan penatausahaan",
        "pemetaan": "dapat  mengedit dan memperbaharui data pemetaan",
        "editor": "dapat menyunting dan menerbitkan semua artikel yang ditulis semua penulis",
        "author": "dapat menulis dan menerbitkan artikel",
        "contributor": "dapat menulis artikel baru tetapi tidak bisa menerbitkan",
    }

    set activeUser(value){
        this._activeUser = value;
        this.activeUserRoles = {};
        if(value){
            for (let role of value.roles){
                this.activeUserRoles[role] = true;
            }
        }
    }

    get activeUser(){
        return this._activeUser;
    }

    constructor(
        private dataApiService: DataApiService,
    ) {
    }

    ngOnInit(): void {
        let desaId = this.dataApiService.getActiveAuth()["desa_id"];
        this.dataApiService.get("/user/"+desaId, null).subscribe(users => { 
            this.users = users;
        });        
    }

    ngOnDestroy(): void {
    }

    getRoleNames(roles){
        return roles.map(r => this.roleNames[r]).join(", ");
    }

}