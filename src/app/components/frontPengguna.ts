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
        this.dataApiService.wordpressGet("/users?context=edit", null).subscribe(users => { 
            console.log(users);
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
           id: null,
           name: null,
           roles: [],
           email: null,
           username: null,
           password: null,
       };
    }

    saveUser(): void {
       if(this.activeUser.password) {
          if(!this.passwordRepeat) {
              this.toastr.warning('Silahkan ulangi kata sandi');
              return;
          }

          else if(this.passwordRepeat !== this.activeUser.password) {
              this.toastr.warning('Kata sandi tidak cocok');
              return;
          }
       }

       if(this.activeUser.password === "") 
          this.activeUser.password = null;
       
       this.activeUser.roles = Object.keys(this.activeUserRoles).filter(r => this.activeUserRoles[r]);

       let url = this.activeUser.id ? "/users/"+this.activeUser.id : "/users";
       this.dataApiService.wordpressPost(url, this.activeUser, null)
         .finally(() => { this.passwordRepeat = null })
         .subscribe(
           result => {
              this.toastr.success('Berhasil menyimpan user');
              this.load();
              this.activeUser = null;
           },
           error => {
             this.toastr.error('Gagal menyimpan user');
           }
       )
    }
}
