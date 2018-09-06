import schemas from '../schemas';

export class SumCounterPenerimaan {
    hot: any;
    sums: any;
    type: string;
    dataBundles: any;

    constructor(hot, type) {
        this.hot = hot;
        this.type = type;
        this.sums = {};    
        this.dataBundles = [];    
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas[this.type]));
        this.sums = {};
        this.dataBundles = [];
        
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            
            if (row.Code && !this.sums[row.Code]){
                let result = this.getValue(row, i, rows);
            } 
        }        
    }

    getValue(row, index, rows): any {
        let sum = 0;     
        let i = index + 1;
        let bundle = Object.assign({}, row)

        for (;i < rows.length;i++) {
            let nextRow = rows[i];

            if(!nextRow.Id.startsWith(row.Code))
                break;

            if(nextRow.Id.startsWith(row.Code) && nextRow.Id.split('_').length == 2)
                sum += nextRow.Nilai;
        }
        if (Number.isFinite(row.Nilai)) {
            bundle.Nilai = row.Nilai;        
            this.dataBundles.push(bundle);
            return
        }

        this.sums[row.Code] = sum;
        bundle.Nilai = sum;        
        this.dataBundles.push(bundle);
        return


    }
    
    calculateBottomUp(index) { }
}
