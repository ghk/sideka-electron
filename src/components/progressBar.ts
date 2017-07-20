import { Component, ApplicationRef, Input } from "@angular/core";
import { Progress } from 'angular-progress-http';

@Component({
    selector: 'progress-bar',
    templateUrl: 'templates/progressBar.html'
})
export default class PendudukStatistic {
    private _progress: Progress;
    @Input()
    set progress(value) {
        this._progress = value;
    }
    get progress() {
        return this._progress;
    }

    constructor() { }

    ngOnInit(): void {
    }
}
