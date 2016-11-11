import { enableProdMode, NgModule, Component, Inject, NgZone, LifeCycle } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { RouterModule, Router, Routes } from '@angular/router';
import { HttpModule } from '@angular/http';

import UndoRedoComponent from './components/undoRedo';
import CopyPasteComponent from './components/copyPaste';
import OnlineStatusComponent from './components/onlineStatus';
import ApbdesComponent from './pages/apbdes';
import PendudukComponent from './pages/penduduk';
import KeluargaComponent from './pages/keluarga';
import IndikatorComponent from './pages/indikator'

import os from 'os'; // native node.js module
import $ from 'jquery';
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import env from './env';
import dataapi from './stores/dataapi';
import feedapi from './stores/feedapi';
import request from 'request';
import moment from 'moment';

if(env.name == "production")
    enableProdMode();
    
var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var showPost = function(data,desas){
    var $xml = $(data);
    var items = [];
    $xml.find("item").each(function(i) {
        if (i === 30) return false;
        var $this = $(this);

        items.push({
            title: $this.find("title").text(), 
            link:$this.find("link").text(),
            description: $this.find("description").text(),
            pubDate: $this.find("pubDate").text()
        });                
    });
    var searchDiv = document.createElement("div");
    moment.locale("id");
    $.each(items, function(i, item){
        var item = items[i];
        var date = moment(new Date(item.pubDate));
        var dateString = date.fromNow();
        if(date.isBefore(moment().startOf("day").subtract(3, "day"))){
            dateString = date.format("LL");
        }
        var feedPost = $("#feed-post-template").clone().removeClass("hidden");
        $("a", feedPost).attr("href", item.link);
        $("h4", feedPost).html(item.title);
        $("p", feedPost).html(item.description);
        $("span.feed-date", feedPost).html(dateString);
        $(".panel-container").append(feedPost);
        feedapi.getImage(searchDiv, item.link, function(image){
            if(image){
                var style = 'background-image: url(\':image:\'); display: block; opacity: 1;'.replace(":image:", image);
                $(".entry-image", feedPost).attr("style", style);
            }
            var itemDomain = extractDomain(item.link);
            var desa = desas.filter(d => d.domain == itemDomain)[0];
            if(desa)
                $(".desa-name", feedPost).html(desa.desa);
        })
    });
}

function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

var init = function () {
    dataapi.getDesa(function(desas){
        feedapi.getFeed(function(data){
            showPost(data,desas);          
            
        });
    });
};

var FrontComponent = Component({
    selector: 'front',
    templateUrl: 'templates/front.html'
})
.Class({
    constructor: function(zone ) {
        this.zone = zone;
    },
    ngOnInit: function(){
        $("title").html("Sideka");
        this.auth = dataapi.getActiveAuth();
        var ctrl = this;
        if(this.auth){
            //Check whether the token is still valid
            dataapi.checkAuth( (err, response, body) => {
                if(!err){
                    var json = JSON.parse(body);
                    if(!json.user_id){
                        ctrl.zone.run(() => {
                            ctrl.auth = null;
                            dataapi.saveActiveAuth(null);
                        });
                    }
                }
            })
        }
        init();
    },
    login: function(){
        var user = $("#login-form input[name='user']").val();
        var password = $("#login-form input[name='password']").val();
        this.loginErrorMessage = null;
        var ctrl = this;
        dataapi.login(user, password, function(err, response, body){
            ctrl.zone.run(() => {
                console.log(err, response, body);
                if(!err && body.success){
                    ctrl.auth = body;
                    console.log(ctrl.auth);
                    dataapi.saveActiveAuth(ctrl.auth);
                } else {
                    var message = "Terjadi kesalahan";
                    if(body && !body.success)
                        message = "User atau password Anda salah";
                    ctrl.loginErrorMessage = message;
                }
            });
        });
        return false;
    },
    logout: function(){
        this.auth = null;
        dataapi.logout();
        return false;
    },
});
FrontComponent.parameters = [NgZone];
var AppComponent = Component({
    selector: 'app',
    template: '<router-outlet></router-outlet>'
})
.Class({
    constructor: function() {
    },
});

var SidekaModule = NgModule({
    imports: [ 
        BrowserModule,
        FormsModule,
        RouterModule.forRoot([
            { path: 'penduduk', component: PendudukComponent },
            { path: 'keluarga', component: KeluargaComponent },
            { path: 'apbdes', component: ApbdesComponent },
            { path: 'indikator', component: IndikatorComponent },
            { path: '', component: FrontComponent },
        ]),
    ],
    declarations: [
        AppComponent, 
        FrontComponent, 
        ApbdesComponent, 
        IndikatorComponent,
        KeluargaComponent, 
        PendudukComponent, 
        UndoRedoComponent, 
        CopyPasteComponent, 
        OnlineStatusComponent
    ],
    providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}],
    bootstrap: [AppComponent]
})
.Class({
    constructor: function() {
    }
});

document.addEventListener('DOMContentLoaded', function () {
    //platformBrowserDynamic().bootstrapModule(SidekaModule);
});
platformBrowserDynamic().bootstrapModule(SidekaModule);