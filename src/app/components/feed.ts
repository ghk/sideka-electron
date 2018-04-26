import { Component, OnInit, OnDestroy, Sanitizer } from '@angular/core';
import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import { Progress } from 'angular-progress-http';

import * as $ from 'jquery';

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

    constructor(private dataApiService: DataApiService, private sharedService: SharedService, private sanitizer: Sanitizer) {}

    ngOnInit(): void {
        this.progress = {
            event: null,
            percentage: 100,
            lengthComputable: true,
            loaded: 0,
            total: 0
        };

        this.categories = [{id: 0, label: 'Kabar Desa'}, 
            {id: 4,  label: 'Potensi Desa'}, 
            {id: 3,  label: 'Produk Desa'}, 
            {id: 161, label: 'Penggunaan Dana Desa'},
            {id: 142, label: 'Seni dan Kebudayaan'}, 
            {id: 649, label: 'Tokoh'}, 
            {id: 120, label: 'Lingkungan'}];

       this.setActiveFeed(this.categories[0]);
    }

    setActiveFeed(category): boolean {
        this.activeCategory = category;

        this.dataApiService.wordpressFeeds(this.activeCategory.id, this.progressListener.bind(this)).subscribe(
            result => {
                this.feeds = [];

                result.forEach(item => {
                    let image = this.getParsedImage(item);
                    
                    this.feeds.push({
                        title: item.title.rendered,
                        content: item.excerpt.rendered,
                        image: image,
                        link: item.guid.rendered,
                        date: new Date(item.date)
                    });
                });

                console.log(this.feeds);
            },
            error => {}
        )

        return false;
    }

    getDesa(item) {
        let urls = item.link.split('/')[2].split('.');
        let desa = urls[0];

        return desa;
    }

    getImage(item) {
        let embedded = item['_embedded'] ? item['_embedded'] : null;

        if (!embedded)
            return null;

        let featureMedia = embedded['wp:featuredmedia'] ? embedded['wp:featuredmedia'] : null;;

        if (!featureMedia)
            return null;

        return featureMedia[0]['source_url'];
    }

    getParsedImage(item): any {
        let paragraphs = item.excerpt.rendered.trim().split('<p>');
        let image = paragraphs.length > 1 ? paragraphs[1] : null;

        if (!image)
            return null;
        
        if (image.indexOf('<img') === 0) {
            let imgTag = item.excerpt.rendered.match(/<img[^>]+>/g)[0];
            item.excerpt.rendered = item.excerpt.rendered.replace(imgTag, '');
            return $(image)[0]['src'];
        }

        return null;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    ngOnDestroy(): void {}
}