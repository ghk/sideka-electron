import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastsManager } from 'ng2-toastr';

import DataApiService from '../stores/dataApiService';
import { Router } from '@angular/router';

@Component({
    selector: 'front-post',
    templateUrl: '../templates/frontPost.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontPostComponent {
    users: any[] = [];
    categories: any[] = [];
    tags: any[] = [];

    posts: any[];
    hasInternetConnection = true;

    constructor(
        private dataApiService: DataApiService,
        private router: Router
    ) {
    }

    ngOnInit(): void {
        this.load();
    }

    ngOnDestroy(): void {
    }

    load(){
        this.posts = null;
        this.hasInternetConnection = true;
        this.dataApiService.wordpressGet("/posts").subscribe(posts => { 
            console.log(posts);
            this.posts = posts;
        }, error => {
            this.hasInternetConnection = false;
        });        
        this.dataApiService.wordpressGet("/users").subscribe(users => {
            this.users = users;
        });
        this.dataApiService.wordpressGet("/users").subscribe(users => {
            this.users = users;
        });
        this.dataApiService.wordpressGet("/categories").subscribe(categories => {
            this.categories = categories;
        });
        this.dataApiService.wordpressGet("/tags").subscribe(tags => {
            this.tags = tags;
        });
    }

    open(post){
        this.router.navigate(['/post'], { queryParams: { 
            id: post.id
        }});
    }

    find(sources: any[], id: number){
        return sources.filter(s => s.id == id)[0];
    }
}
