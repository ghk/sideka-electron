import { Component, ApplicationRef, Input } from "@angular/core";
import { Progress } from 'angular-progress-http';

@Component({
    selector: 'progress-bar',
    templateUrl: 'templates/progressBar.html'
})
export default class PendudukStatistic {
    private _progress: Progress;
    private _done: boolean = false;

    @Input()
    set progress(value) {
        this._progress = value;
    }
    get progress() {
        return this._progress;
    }

    @Input()
    set done(value) {
        this._done = value;
    }
    get done() {
        return this._done;
    }

    constructor() { }

    ngOnInit(): void {
    }
}
