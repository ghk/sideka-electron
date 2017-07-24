import schemas from '../schemas';

export default class SumCounterSPP {
    hot: any;
    sums: any;
    jenisSPP: any;

    constructor(hot, jenisSPP) {
        this.hot = hot;
        this.jenisSPP = jenisSPP;
        this.sums = {};
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        this.sums = {};
        
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if(this.jenisSPP == 'UM')
                continue;

            if (row.code && !this.sums[row.code]){
                if(row.code.startsWith('5.') && row.code.split('.').length == 5){
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

            if(!nextRow.id.startsWith(row.code))
                break;

            if(nextRow.id.startsWith(row.code) && !nextRow.code.startsWith('7.'))
                sum += nextRow.anggaran;
        }

        this.sums[row.code] = sum;
    }
    
    calculateBottomUp(index) { }
}
