import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastsManager } from 'ng2-toastr';

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
    users: any[];
    _activeUser: any = null;
    activeUserRoles = {};
    passwordRepeat: string;
    hasInternetConnection = true;
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
        public toastr: ToastsManager,
        private vcr: ViewContainerRef
    ) {
      this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        this.load();
    }

    ngOnDestroy(): void {
    }

    load(){
        this.users = null;
        this.hasInternetConnection = true;
        let desaId = this.dataApiService.getActiveAuth()["desa_id"];
        this.dataApiService.get("/user/"+desaId, null).subscribe(users => { 
            this.users = users;
        }, error => {
            this.hasInternetConnection = false;
        });        
    }


    getRoleNames(roles){
        return roles.map(r => this.roleNames[r]).join(", ");
    }

    addNewUser(): void {
       this.activeUser = {
           ID: null,
           display_name: null,
           roles: {},
           user_email: null,
           user_login: null,
           user_pass: null,
           user_registered: null
       };
    }

    saveUser(): void {
       if(this.activeUser.user_pass) {
          if(!this.passwordRepeat) {
              this.toastr.warning('Silahkan ulangi kata sandi');
              return;
          }

          else if(this.passwordRepeat !== this.activeUser.user_pass) {
              this.toastr.warning('Kata sandi tidak cocok');
              return;
          }
       }

       if(this.activeUser.user_pass === "") 
          this.activeUser.user_pass = null;
       
       if(!this.activeUser.ID)
          this.activeUser.user_registered = new Date();
        
       this.activeUser.roles = this.activeUserRoles;

       let desaId = this.dataApiService.getActiveAuth()["desa_id"];
       this.dataApiService.post("/user/"+desaId, this.activeUser, null).finally(() => { this.passwordRepeat = null })
         .subscribe(
           result => {
              this.toastr.success('Berhasil menyimpan user');

              this.dataApiService.get("/user/"+desaId, null).subscribe(users => { 
                  this.users = users;
              });
           },
           error => {
             this.toastr.error('Gagal menyimpan user');
           }
       )
    }
}
