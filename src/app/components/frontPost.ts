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
        this.dataApiService.wordpressGet("/posts", null).subscribe(posts => { 
            console.log(posts);
            this.posts = posts;
        }, error => {
            this.hasInternetConnection = false;
        });        
    }

    open(post){
        this.router.navigate(['/post'], { queryParams: { 
            id: post.id
        }});
    }
}
