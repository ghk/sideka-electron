import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, ChangeDetectionStrategy } from "@angular/core";
import { Subject } from 'rxjs';

@Component({
    selector: 'prodeskel-viewer',
    templateUrl: '../../templates/prodeskel/viewer.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProdeskelViewer implements OnInit, OnDestroy, OnChanges {
    destroyed$: Subject<void> = new Subject();

    @Input() schemaGroups: string[];
    @Input() schemas: { [key:string] : any }[];
    @Input() values: { [key:string]: any };

    constructor(
    ) {
    }

    ngOnInit(): void {

    }

    ngOnDestroy(): void {

    }

    ngOnChanges(changes: SimpleChanges): void {

    }
}
