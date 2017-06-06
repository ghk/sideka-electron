import { Component, ApplicationRef, Input } from "@angular/core";

@Component({
    selector: 'pagination',
    templateUrl: 'templates/pagination.html'
})
export default class PaginationComponent{
    collection: any[] = [];

    constructor(){
        for (let i = 1; i <= 100; i++) {
            this.collection.push(`item ${i}`);
        }
    }
}
