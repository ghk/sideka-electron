import { Component, OnInit, OnDestroy } from '@angular/core';
import { Progress } from 'angular-progress-http';
import { DomSanitizer } from '@angular/platform-browser';
import { remote } from 'electron';

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import FeedApi from '../stores/feedApi';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as path from 'path';

import 'moment/locale/id'  // without this line it didn't work
moment.locale('id');

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");
const FEEDS_DIR = path.join(DATA_DIR, "feeds");
jetpack.dir(FEEDS_DIR);

@Component({
    selector: 'feed',
    templateUrl: '../templates/feed.html',
    styles: [`
        :host {
            display: flex;
        }
    `]
})
export class FeedComponent implements OnInit, OnDestroy {
    progress: Progress;
    activeCategory: any;
    categories: any[];
    feeds: any[];
    desas: any[];
    isLoadingFeed: boolean;
    feedApi: FeedApi;

    currentPage: number;
    offset: number;
    max: number;

    constructor(private dataApiService: DataApiService, 
                private sharedService: SharedService,
                private sanitizer: DomSanitizer) {}

    async ngOnInit() {
        this.feedApi = new FeedApi();
        this.currentPage = 1;
        this.offset = 0;
        this.max = 10;
        this.feeds = [];

        this.progress = {
            event: null,
            percentage: 100,
            lengthComputable: true,
            loaded: 0,
            total: 0
        };

        this.isLoadingFeed = false;

        this.categories = [{id: 0, label: 'Kabar Desa'}, 
            {id: 4,  label: 'Potensi Desa'}, 
            {id: 3,  label: 'Produk Desa'}, 
            {id: 161, label: 'Penggunaan Dana Desa'},
            {id: 142, label: 'Seni dan Kebudayaan'}, 
            {id: 649, label: 'Tokoh'}, 
            {id: 120, label: 'Lingkungan'}];
       
       this.activeCategory = this.categories[0];

       let dataDir = this.sharedService.getDataDirectory();
    
       try {
           this.desas = JSON.parse(jetpack.read(path.join(dataDir, 'desa.json')));
       }
       catch(error) {
          let desas = await this.dataApiService.getDesas(this.progressListener.bind(this)).toPromise();
            
          jetpack.write(path.join(dataDir, 'desa.json'), JSON.stringify(desas), {
             atomic: true
          });

          this.desas = desas;
       }
       finally {
           this.setActiveFeed(this.activeCategory);
       }


       $('.panel-container').scroll(() => {      
            let currentScroll = $('.panel-container').scrollTop() + $('.panel-container').height();
            if(Math.ceil(currentScroll) == $('.panel-container')[0].scrollHeight) {
                this.nextScroll();
            }
        });
    }

    setActiveFeed(category): boolean {
        this.activeCategory = category;
        this.isLoadingFeed = true;
        this.feeds = [];
        this.currentPage = 1;

        let dataDir = this.sharedService.getDataDirectory();

        try {
            this.feeds = JSON.parse(jetpack.read(path.join(FEEDS_DIR, this.activeCategory.id + '.json')));
            this.loadImages();
        }
        catch(error) {
            console.log(error);
        }

        this.setPage();
        
        return false;
    }

    setPage(): void {
        this.offset = (this.currentPage-1) * this.max;

        this.dataApiService.wordpressFeeds(this.activeCategory.id, this.max, this.offset, this.progressListener.bind(this))
            .finally (() => { this.isLoadingFeed = false; })
            .subscribe (
                result => {
                    let newFeeds = [];
                    result.forEach(item => {
                        newFeeds.push({
                            title: item.title.rendered,
                            content: item.excerpt.rendered,
                            image: null,
                            link: item.link,
                            date: new Date(item.date)
                        });
                    });

                    this.feeds = this.feeds.concat(newFeeds);

                    this.loadImages();

                    jetpack.write(path.join(FEEDS_DIR, this.activeCategory.id + '.json'), JSON.stringify(this.feeds), {
                        atomic: true
                    });
                },
                error => {}
        );
    }

    nextScroll(): void {
        this.currentPage += 1;
        this.setPage();
    }

    getDesa(item) {
        let link = item.link.split('/')[2];
        let desa = this.desas.filter(e => e.domain === link)[0];

        if (desa) {
            if (desa.desa && desa.kabupaten)
                return desa.desa + ' - ' + desa.kabupaten;
            else
                return link;
        }

        return link;
    }

    loadImages() {
        this.feeds.forEach(feed => {
            let searchDiv = document.createElement('div');
            let dataDir = this.sharedService.getDataDirectory();
            
            this.feedApi.getImage(searchDiv, feed.link, image => {
                if (image)
                        image = this.sanitizer.bypassSecurityTrustUrl(image);
                
                feed.image = image;
            });
        });
    }

    getDate(item) {
        let date = moment(new Date(item.date));
        let dateString = date.fromNow();

        if (date.isBefore(moment().startOf('day').subtract(3, 'day')))
            dateString = date.format('LL');

        return dateString;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    ngOnDestroy(): void {}
}