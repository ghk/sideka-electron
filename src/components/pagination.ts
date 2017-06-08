import {Component, Input, Output, EventEmitter} from '@angular/core'

@Component({
    selector: 'pagination',
    templateUrl: 'templates/pagination.html'
})
export default class PaginationComponent {
    private _pageBegin;
    private _itemPerPage;

    @Input()
    set itemPerPage(value){
        this._itemPerPage = value;
    }
    get itemPerPage(){
        return this._itemPerPage;
    }

    @Input()
    set pageBegin(value){
        this._pageBegin = value;
    }
    get pageBegin(){
        return this._pageBegin;
    }

    @Output() next = new EventEmitter();
    @Output() prev = new EventEmitter();
    @Output() onPage = new EventEmitter<number>();
    @Output() goToFirst = new EventEmitter();
    @Output() goToLast = new EventEmitter();

    pages: any[];
    displayedPages: any[];
    maximumPage: number = 5;
    totalPage: number;
    totalItems: number;

    ngOnInit(): void {
        this.displayedPages = [];
    }

    calculatePages(): void {
        this.pages = [];
        this.totalPage = Math.ceil(this.totalItems/this.itemPerPage);

        for(let i=1; i<=this.totalPage; i++)
            this.pages.push(i);
        
        if((this.pageBegin - 1) % this.maximumPage === 0){
            if(this.pageBegin === 1)
                this.displayedPages = this.pages.splice(0, this.maximumPage);
            else
                this.displayedPages = this.pages.splice(this.pageBegin - 1, this.maximumPage);
        }
        else if((this.pageBegin - 1) % this.maximumPage === this.pageBegin - 1){
            this.displayedPages = this.pages.splice(this.pageBegin - 1, this.maximumPage);
        }
    }

    nextPage(): boolean {
        this.next.emit();
        return false;
    }

    prevPage(): boolean {
        this.prev.emit();
        return false;
    }

    onPageSelected(page): boolean {
        this.onPage.emit(page);
        return false;
    }

    goFirst(): boolean{
        this.goToFirst.emit();
        return false;
    }

    goLast(): boolean {
        this.goToLast.emit();
        return false;
    }
}
