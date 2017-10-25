import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx';

import { remote, shell } from "electron";
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";

import { DiffItem } from '../stores/bundle';
import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';

import titleBar from '../helpers/titleBar';
import { ActivatedRoute } from '@angular/router';

var $ = require('jquery');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
var base64 = require("uuid-base64");

@Component({
    selector: 'post',
    templateUrl: '../templates/post.html'
})
export default class PostComponent {

    activePageMenu = null;
    post = null;
    content = null;

    constructor(
        private appRef: ApplicationRef,
        private vcr: ViewContainerRef,
        private ngZone: NgZone,
        private route: ActivatedRoute,
        private dataApiService: DataApiService,
        private sharedService: SharedService
    ) {

    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(
            param => {
                this.dataApiService.wordpressGet("/posts/"+param["id"]+"?context=edit").subscribe(post => {
                    console.log(post);
                    this.post = post;
                    this.content = post.content.raw;
                    titleBar.blue(post.title.rendered);
                });
            }
        );
    }

    ngOnDestroy(): void {
        titleBar.removeTitle();
    }

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
        } else {
            titleBar.blue();
        }
    }

}
