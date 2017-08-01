import schemas from '../schemas';

export default class SumCounterPenerimaan {
    hot: any;
    sums: any;
    type: string;

    constructor(hot, type) {
        this.hot = hot;
        this.type = type;
        this.sums = {};
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
        this.sums = {};
        
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if (row.Code && !this.sums[row.Code]){
                if(row.Code.split('.').length != 5){
                    let result = this.getValue(row, i, rows);
                }
            } 
        }        
    }

    getValue(row, index, rows): any {
        let sum = 0;     
        let i = index + 1;

        for (;i < rows.length;i++) {
            let nextRow = rows[i];

            if(!nextRow.Id.startsWith(row.Code))
                break;

            if(nextRow.Id.startsWith(row.Code) && nextRow.Code.split('.').length == 5)
                sum += nextRow.Nilai;
        }

        this.sums[row.Code] = sum;
    }
    
    calculateBottomUp(index) { }
}
