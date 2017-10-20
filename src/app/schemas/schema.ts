export interface FieldSchemaColumn {
    field: string;
}
export interface SchemaColumn extends FieldSchemaColumn {
    header: string;
    type?: string;

    width?: number;
    readOnly?: boolean;
    renderer?: any;
    editor?: any;

    format?: string;
    defaultData?: any;
    source?: any;

    chosenOptions?: any;

    checkedTemplate?: any;
    uncheckedTemplate?: any;

    importHeaders?: any;

    dateFormat?: string;
    datePickerConfig?: any;
    correctFormat?: boolean;
    defaultDate?: string;

    hiddenColumn?:boolean,

    category?: any;
    originData?: any;
}
