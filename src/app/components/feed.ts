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

    constructor(
        private sanitizer: DomSanitizer,
        private zone: NgZone,
        private dataApiService: DataApiService,
        private sharedService: SharedService
    ) {}
    
    ngOnInit() {
        this.progress = {
            event: null,
            percentage: 0,
            lengthComputable: true,
            loaded: 0,
            total: 0
        };

        feedApi.getOfflineFeed(data => {
            this.zone.run(() => {
                this.feed = this.convertFeed(data);
                this.sharedService.setDesas(this.dataApiService.getLocalDesas());
                this.loadImages();
            });
        });

        this.dataApiService.getDesas(null).subscribe(
            desas => {
                feedApi.getFeed(data => {
                    this.zone.run(() => {
                        this.feed = this.convertFeed(data);
                        this.sharedService.setDesas(desas);
                        this.loadImages();
                    });
                });

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
        return desa && desa.desa ? desa.desa + ' - ' + desa.kabupaten : '-';
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
            items.push({
                title: $this.find('title').text(),
                link: $this.find('link').text(),
                description: $this.find('description').text(),
                pubDate: $this.find('pubDate').text(),
            });
        });
        return items;
    }
}