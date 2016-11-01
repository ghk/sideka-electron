import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { RouterModule, Router, Routes } from '@angular/router';
import { HttpModule } from '@angular/http';

import UndoRedoComponent from './components/undoRedo';
import OnlineStatusComponent from './components/onlineStatus';
import ApbdesComponent from './anggaran/apbdes';
import PendudukComponent from './kependudukan/penduduk';
import KeluargaComponent from './kependudukan/keluarga';

var SidekaModule = NgModule({
    imports: [ 
        BrowserModule,
        RouterModule.forRoot([
            { path: 'penduduk', component: PendudukComponent },
            { path: 'keluarga', component: KeluargaComponent },
            { path: 'apbdes', component: ApbdesComponent },
            { path: '', component: PendudukComponent },
        ]),
    ],
    declarations: [
        ApbdesComponent, 
        KeluargaComponent, 
        PendudukComponent, 
        UndoRedoComponent, 
        OnlineStatusComponent
    ],
    bootstrap: [ApbdesComponent]
})
.Class({
    constructor: function() {
        console.log("init module");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    platformBrowserDynamic().bootstrapModule(ApbdesModule);
});
