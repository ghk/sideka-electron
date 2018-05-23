export default [
    {
        header: 'Id',
        field: 'id', 
        type: 'text',
        width: 500,
        readOnly: true
    },
    {
        header: 'Format',
        field: 'format', 
        type: 'text',
        width: 400,
        readOnly: true
    },
    {
        header: 'Counter',
        field: 'counter', 
        type: 'numeric',
        width: 100,
        readOnly: true
    },
    {
        header: 'Jenis Counter',
        field: 'counter_type', 
        type: 'text',
        width: 400,
        readOnly: true
    },
    {
        header: 'Counter Terakhir',
        field: 'last_counter', 
        type: 'text',
        readOnly: true,
        width: 120
    },
    {
        header: 'Penomoran Automatis',
        field: 'is_auto_number', 
        type: 'text',
        readOnly: true,
        width: 120
    }
]