var $ = require('jquery');
var { remote, ipcRenderer} = require('electron');
var jetpack = require('fs-jetpack');
var moment = require('moment');
var path = require('path');

import { LocationStrategy, HashLocationStrategy } from "@angular/common";
import { BrowserModule, DomSanitizer } from "@angular/platform-browser";
import { enableProdMode, NgModule, Component, Inject, NgZone } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { RouterModule, Router, Routes } from "@angular/router";
import { HttpModule } from "@angular/http";
import UndoRedoComponent from './components/undoRedo';
import CopyPasteComponent from './components/copyPaste';
import OnlineStatusComponent from './components/onlineStatus';
import PrintSuratComponent from "./components/printSurat";

import ApbdesComponent from './pages/apbdes';
import PendudukComponent from './pages/penduduk';
import KeluargaComponent from './pages/keluarga';
import IndikatorComponent from './pages/indikator'

import * as fs from 'fs';
import * as os from 'os'; // native node.js module
import env from './env';
import dataapi from './stores/dataapi';
import feedapi from './stores/feedapi';
import * as request from 'request';

var pjson = require("./package.json");
if(env.name == "production")
    enableProdMode();

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");

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
                $(".desa-name", feedPost).html(desa.desa + " - " + desa.kabupaten);
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
    dataapi.saveNextOfflineContent();
    
    feedapi.getOfflineFeed(function(data){
        var desas = dataapi.getOfflineDesa();
        showPost(data,desas);          
    });
    dataapi.getDesa(function(desas){
        feedapi.getFeed(function(data){
            showPost(data,desas);          
        });
    });
    ipcRenderer.on("updater", (event, type, arg) => {
        if(type == "update-downloaded"){
            $("#updater-version").html(arg);
            $("#updater").removeClass("hidden");
        }
    });
    $("#updater-btn").click(function(){
        ipcRenderer.send("updater", "quitAndInstall");
    });
};



@Component({
    selector: 'front',
    templateUrl: 'templates/front.html'
})
class FrontComponent{
    zone: any;
    auth: any;
    package: any;
    loginErrorMessage: string;
    file: any;
    logo: string;
    sanitizer: any;
    
    constructor(sanitizer, zone) {
        this.zone = zone;
        this.sanitizer = sanitizer;
    }

    ngOnInit(){
        $("title").html("Sideka");
        this.auth = dataapi.getActiveAuth();
        this.loadSetting();
        this.package = pjson;
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
    }

    login(){
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
                    if(err) {
                        message += ": "+err.code;
                        if(err.code == "ENOTFOUND")
                            message = "Tidak bisa terkoneksi ke server";
                    }
                    if(body && !body.success)
                        message = "User atau password Anda salah";
                    ctrl.loginErrorMessage = message;
                }
            });
        });
        return false;
    }

    logout(){
        this.auth = null;
        dataapi.logout();
        return false;
    }

    loadSetting(): void{
        let dataFile = path.join(DATA_DIR, "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        this.logo = data.logo;
        $('#input-jabatan').val(data.jabatan);
        $('#input-sender').val(data.sender);
    }

    fileChangeEvent(fileInput: any){
        this.file = fs.readFileSync(fileInput.target.files[0].path).toString('base64');    
    }

    saveSetting(): void{
        let data = {
            "jabatan": $('#input-jabatan').val(),
            "sender": $('#input-sender').val(),
            "logo": this.file
        };
            
        let dataFile = path.join(DATA_DIR, "setting.json");
        
        if(this.auth)
            jetpack.write(dataFile, JSON.stringify(data));
            
        this.loadSetting();
    }
}

FrontComponent['parameters'] = [DomSanitizer, NgZone];

@Component({
    selector: 'app',
    template: '<router-outlet></router-outlet>'
})
class AppComponent{
    constructor(){}
}

@NgModule({
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
        OnlineStatusComponent,
        PrintSuratComponent
    ],
    providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}],
    bootstrap: [AppComponent]
})
class SidekaModule{
    constructor(){}
}

document.addEventListener('DOMContentLoaded', function () {
    //platformBrowserDynamic().bootstrapModule(SidekaModule);
});
platformBrowserDynamic().bootstrapModule(SidekaModule);
