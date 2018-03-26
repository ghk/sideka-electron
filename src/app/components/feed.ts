import { Component, NgZone } from '@angular/core';
import { Progress } from 'angular-progress-http';
import { DomSanitizer } from '@angular/platform-browser';

import feedApi from '../stores/feedApi';
import SharedService from '../stores/sharedService';
import DataApiService from '../stores/dataApiService';

import * as $ from 'jquery';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import * as moment from 'moment';
import FeedApiService from '../stores/feedApiService';

@Component({
    selector: 'feed',
    templateUrl: '../templates/feed.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FeedComponent {    
    feed: any;
    desas: any;
    progress: Progress;
    progressMessage: string;
    activeCategory: any;
    selectedFeed: any;
    categories: any[] = [];

    constructor(
        private sanitizer: DomSanitizer,
        private zone: NgZone,
        private dataApiService: DataApiService,
        private sharedService: SharedService,
        private feedApiSerivice: FeedApiService
    ) {}
    
    ngOnInit() {
        this.progress = {
            event: null,
            percentage: 0,
            lengthComputable: true,
            loaded: 0,
            total: 0
        };

        this.categories = [{id: 'kabardesa', name: 'Kabar Desa'}, 
            {id: 'produkdesa', name: 'Produk Desa'}, 
            {id: 'potensidesa', name: 'Potensi Desa'}, 
            {id: 'danadesa', name: 'Penggunaan Dana Desa'}, 
            {id: 'senibudaya', name: 'Seni dan Kebudayaan'}, 
            {id: 'tokoh', name: 'Tokoh Masyarakat'}, 
            {id: 'lingkungan', name: 'Lingkungan'}];

        this.activeCategory = this.categories[0];
        
        this.feedApiSerivice.getFeed().subscribe(
            result => {
               afterFetchingFeeds(result);
            },
            error => {
                this.feedApiSerivice.getOfflineFeed(afterFetchingFeeds);
            }
        )

        let afterFetchingFeeds = (data) => {
            this.feed = this.convertFeed(data);
            this.sharedService.setDesas(this.dataApiService.getLocalDesas());
            this.loadImages();
            this.getFeedByCategory(this.categories[0]);
        }
      
        this.dataApiService.getDesas(null).subscribe(
            desas => {
                this.sharedService.setDesas(desas);
                let dataDir = this.sharedService.getDataDirectory();
                jetpack.write(path.join(dataDir, 'desa.json'), JSON.stringify(desas), {
                    atomic: true
                });
                this.progress.percentage = 100;
            },
            error => {
                this.progress.percentage = 100;
            }
        );

        this.progressMessage = 'Memuat Data';
    }

    getDate(item) {
        let date = moment(new Date(item.pubDate));
        let dateString = date.fromNow();
        if (date.isBefore(moment().startOf('day').subtract(3, 'day')))
            dateString = date.format('LL');
        return dateString;
    }

    getFeedByCategory(category) {
        this.activeCategory = category;
        this.selectedFeed = this.feed.filter(e => e.category.split(', ')
            .filter(e => e.toLowerCase().indexOf(this.activeCategory.name.toLowerCase()) > -1).length > 0);
    }

    extractDomain(url) {
        let domain;
        if (url.indexOf('://') > -1)
            domain = url.split('/')[2];
        else
            domain = url.split('/')[0];
        domain = domain.split(':')[0];
        return domain;
    }

    getDesa(item) {
        var itemDomain = this.extractDomain(item.link);
        var desa = this.sharedService.getDesas().filter(d => d.domain == itemDomain)[0];
        return desa && desa.desa ? desa.desa + ' - ' + desa.kabupaten : desa.domain;
    }

    loadImages() {
        var searchDiv = document.createElement('div');
        this.feed.forEach(item => {
            feedApi.getImage(searchDiv, item.link, image => {
                this.zone.run(() => {
                    if (image)
                        image = this.sanitizer.bypassSecurityTrustStyle("url('" + image + "')");
                    item.image = image;
                });
            })
        });
    }
    
    convertFeed(data) {
        var $xml = $(data);
        var items = [];
        $xml.find('item').each(function (i) {
            if (i === 30) return false;
            var $this = $(this);
            var $categories = $this.find('category');
            var categories = [];
            
            for (let i=0; i<$categories.length; i++)
                categories.push($categories[i].textContent);
       
            items.push({
                title: $this.find('title').text(),
                link: $this.find('link').text(),
                description: $this.find('description').text(),
                category: categories.join(', '),
                pubDate: $this.find('pubDate').text(),
            });
        });
        return items;
    }
}