import { FormArray, FormControl, FormGroup } from '@angular/forms';

export function validateAllFormFields(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
        const control = formGroup.get(field);
        if (control instanceof FormControl) {
            control.markAsTouched({ onlySelf: true });
        } else if (control instanceof FormGroup) {
            this.validateAllFormFields(control);
        } else if (control instanceof FormArray) {
            control.markAsTouched({ onlySelf: true });
        }
    });
}

export function serializeFormData(model: object): FormData {
    let formData = new FormData();
    for (var key in model) {
        if (model.hasOwnProperty(key) && model[key] !== null && model[key] !== undefined) {
            formData.append(key, model[key])
        }
    }
    return formData;
}
