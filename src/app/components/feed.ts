import { Component, OnInit, OnDestroy } from '@angular/core';
import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import { Progress } from 'angular-progress-http';

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

    constructor(private dataApiService: DataApiService, private sharedService: SharedService) {}

    ngOnInit(): void {
        this.progress = {
            event: null,
            percentage: 100,
            lengthComputable: true,
            loaded: 0,
            total: 0
        };

        this.categories = [{id: 6, label: 'Kabar Desa'}, 
            {id: 7,  label: 'Potensi Desa'}, 
            {id: 8,  label: 'Produk Desa'}, 
            {id: 11, label: 'Dana Desa'},
            {id: 12, label: 'Seni Budaya'}, 
            {id: 13, label: 'Tokoh'}, 
            {id: 14, label: 'Lingkungan'}];

       this.setActiveFeed(this.categories[0]);
    }

    setActiveFeed(category): boolean {
        this.activeCategory = category;

        this.dataApiService.wordpressFeeds(this.activeCategory.id, this.progressListener.bind(this)).subscribe(
            result => {
                this.feeds = [];

                result.forEach(item => {
                    let image = this.getImage(item);

                    this.feeds.push({
                        title: item.title.rendered,
                        content: item.excerpt.rendered,
                        image: image,
                        date: new Date(item.date)
                    });
                })
            },
            error => {}
        )

        return false;
    }

    getDesa(item) {
        return  null;
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

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    ngOnDestroy(): void {}
}