import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter } from "@angular/core";
import { DomSanitizer, SafeResourceUrl, SafeUrl} from '@angular/platform-browser';
import { remote, shell } from "electron";
import { Subscription } from 'rxjs';

import * as $ from 'jquery';
import * as fs from 'fs';
import * as jetpack from 'fs-jetpack';
import * as ospath from 'path';
import * as d3 from 'd3';
import * as dot from 'dot';
import * as base64Img from 'base64-img';
import * as fileUrl from 'file-url';
import * as os from 'os';

var temp = require('temp');
temp.dir = os.tmpdir();
temp.track();

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import { Settings } from 'http2';

export default class SiskeudesReportJson{
    hot: any;
    sheet: any;
    settings: any;

    constructor(){
    }
    
    ngOnInit(){
        
    }

    

    getJson(){

    }
}