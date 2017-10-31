import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core'

@Component({
    selector: 'pagination',
    templateUrl: '../templates/pagination.html'
})
export default class PaginationComponent implements OnInit, OnDestroy {
    private _pageBegin;
    private _itemPerPage;
    private _currentPage;

    @Input()
    set itemPerPage(value) {
        this._itemPerPage = value;
    }
    get itemPerPage() {
        return this._itemPerPage;
    }

    @Input()
    set pageBegin(value) {
        this._pageBegin = value;
    }
    get pageBegin() {
        return this._pageBegin;
    }

    @Output() pagingData = new EventEmitter();

    pages: any[];
    displayedPages: any[];
    maximumPage: number = 5;
    totalPage: number;
    totalItems: number;
    range: number;
    iteration: number;

    ngOnInit(): void {
        this.pages = [];
        this.displayedPages = [];
        this.range = 0;
        this.iteration = 0;
    }

    ngOnDestroy(): void {}

    calculatePages(): void {
        this.pages = [];
        this.totalPage = Math.ceil(this.totalItems / this.itemPerPage);

        let currentIteration = Math.ceil((this._currentPage) / this.maximumPage) - 1;

        for (let i = 1; i <= this.totalPage; i++)
            this.pages.push(i);


        if (currentIteration === 0) {
            this.displayedPages = this.pages.splice(0, this.maximumPage);
        }

        else if (currentIteration !== this.iteration) {
            this.displayedPages = this.pages.splice(currentIteration * this.maximumPage, this.maximumPage);
        }

        this.iteration = currentIteration;
    }

    nextPage(): boolean {
        if ((this._currentPage + 1) > this.totalPage)
            return false;

        this._currentPage += 1;
        this.calculatePages();
        this.pagingData.emit(this._currentPage);
        return false;
    }

    prevPage(): boolean {
        if(this._currentPage === 1)
            return false;

        this._currentPage -= 1;
        this.calculatePages();
        this.pagingData.emit(this._currentPage);
        return false;
    }

    onPageSelected(page): boolean {
        this._currentPage = page;
        this.calculatePages();
        this.pagingData.emit(this._currentPage);
        return false;
    }

    goFirst(): boolean {
        this._currentPage = 1;
        this.calculatePages();
        this.pagingData.emit(this._currentPage);
        return false;
    }

    goLast(): boolean {
        this._currentPage = this.totalPage;
        this.calculatePages();
        this.pagingData.emit(this._currentPage);
        return false;
    }

    getCurrentPage(): number{
        return this._currentPage;
    }

    setCurrentPage(page): void {
        this._currentPage = page;
    }
}
