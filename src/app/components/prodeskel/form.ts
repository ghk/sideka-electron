import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, ChangeDetectionStrategy } from "@angular/core";
import { FormGroup, FormBuilder, FormControl, Validators } from "@angular/forms";
import { Subject } from 'rxjs';
import { validateAllFormFields } from '../../helpers/form';

@Component({
    selector: 'prodeskel-form',
    templateUrl: '../../templates/prodeskel/form.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProdeskelForm implements OnInit, OnDestroy, OnChanges {
    destroyed$: Subject<void> = new Subject();

    @Input() title: string;
    @Input() disableSubmit: boolean = false;

    @Input() schemaGroups: string[];
    @Input() schemas: { [key:string] : any }[];
    @Input() computedFunction: (val: any, form: FormGroup) => void;

    @Input() existingValues: { [key:string]: any };
    @Input() overrideValues: { [key:string]: any };

    @Output() submit: EventEmitter<any> = new EventEmitter();

    form: FormGroup;

    constructor(
        private formBuilder: FormBuilder
    ) {
    }

    ngOnInit(): void {

    }

    ngOnDestroy(): void {

    }

    get f() { return this.form.controls; }

    createFormGroup(formBuilder: FormBuilder, schemas: { [key:string] : any }[]): FormGroup {
        let form = formBuilder.group({});
        schemas.forEach(schema => {
            let control = new FormControl();

            if (schema.required)
                control.setValidators([Validators.required]);

            if (schema.type === 'number')
                control.valueChanges
                    .take(1)
                    .subscribe(val => control.patchValue(val.replace('.', ''), { emitEvent: false }));

            if (schema.valueChanges)
                control.valueChanges
                    .takeUntil(this.destroyed$)
                    .subscribe(val => schema.valueChanges(val, form));

            form.addControl(schema['field'], control);
        });

        return form;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.hasOwnProperty('schemas') && changes['schemas'].currentValue) {
            this.form = this.createFormGroup(this.formBuilder, changes['schemas'].currentValue);
        }

        if (changes.hasOwnProperty('existingValues') && changes['existingValues'].currentValue) {
            let existingValues = changes['existingValues'].currentValue;
            let option = changes['existingValues'].isFirstChange() ? { emitEvent: true } : { emitEvent: false};
            Object.keys(existingValues).forEach(key => {
                this.form.get(key).patchValue(existingValues[key], option);
            });
        }

        if (changes.hasOwnProperty('overrideValues') && changes['overrideValues'].currentValue) {
            let overrideValues = changes['overrideValues'].currentValue;
            Object.keys(overrideValues).forEach(key => {
                this.form.get(key).patchValue(overrideValues[key]);
            });
        }

        if (changes.hasOwnProperty('computedFunction') &&
            changes['computedFunction'].currentValue &&
            changes['computedFunction'].isFirstChange()) {
                let computedFunction: (val: any, form: FormGroup) => void = changes['computedFunction'].currentValue;
                this.form.valueChanges
                    .takeUntil(this.destroyed$)
                    .subscribe(val => computedFunction(val, this.form));
        }
    }

    onSubmit(): void {
        validateAllFormFields(this.form);
        if (!this.form.valid) { return; }

        this.submit.emit(this.form.value);
    }
}
