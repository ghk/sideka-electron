import schemas from '../schemas';

export default class SumCounterSPP {
    hot: any;
    sums: any;
    jenisSPP: any;
    dataBundles: any;    

    constructor(hot, jenisSPP) {
        this.hot = hot;
        this.jenisSPP = jenisSPP;
        this.sums = {};
        this.dataBundles = [];
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.oldSpp));
        this.sums = {};
        this.dataBundles = [];

        if(this.jenisSPP == 'UM'){
            this.dataBundles = rows;  
            return; 
        } 
        
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if (row.code && !this.sums[row.code]){
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

            if(!nextRow.id || !nextRow.id.startsWith(row.code))
                break;

            if(nextRow.id.startsWith(row.code) && nextRow.id.split('_').length == 2)
                sum += nextRow.anggaran;
        }

        if (Number.isFinite(row.anggaran)) {
            bundle.anggaran = row.anggaran;        
            this.dataBundles.push(bundle);
            return
        }

        this.sums[row.code] = sum;
        bundle.anggaran = sum;        
        this.dataBundles.push(bundle);

    }
    
    calculateBottomUp(index) { }
}
