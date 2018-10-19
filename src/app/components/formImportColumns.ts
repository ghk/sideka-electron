import { Component, OnInit, Input, Output, ChangeDetectionStrategy, EventEmitter } from "@angular/core";
import { Importer } from "../helpers/importer";

@Component({
    selector: 'form-import-columns',
    templateUrl: '../templates/formImportColumns.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormImportColumnsComponent implements OnInit {
    @Input() importer: Importer;
    @Output() action: EventEmitter<any> = new EventEmitter<any>();

    constructor() {
    }

    ngOnInit(): void {
    }

    onSubmit(action: string) {
        this.action.emit(action);
    }
}