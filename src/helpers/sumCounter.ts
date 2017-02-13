import schemas from '../schemas';

export default class SumCounter{
    hot: any;
    sums: any;

    constructor(hot){
        this.hot = hot;
        this.sums = {};
    }

    calculateAll(): void{
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.apbdes));
        this.sums = {};

        for(let i=0; i<rows.length; i++){
            let row = rows[i];

            if(row.kode_rekening && !this.sums[row.kode_rekening])
                this.getValue(row, i, rows);
        }
    }

    getValue(row, index, rows): any{
        let sum = 0;
        let dotCount = row.kode_rekening.split(".").length;
        let i = index + 1;
        let allowDetail = true;

        while(i < rows.length){
            let nextRow = rows[i];
            let nextDotCount = nextRow.kode_rekening ? nextRow.kode_rekening.split(".").length : 0 ;
            
            if(nextRow.kode_rekening && !nextRow.kode_rekening.startsWith(row.kode_rekening))
                break;

            if(!nextRow.kode_rekening && allowDetail){
                if(Number.isFinite(nextRow.anggaran))
                    sum += nextRow.anggaran;
            }

            i++;
        }
        
        this.sums[row.kode_rekening] = sum;

        if(Number.isFinite(row.anggaran)){
            /*if(sum == 0 && row.kode_rekening){
               this.sums[row.kode_rekening] = row.anggaran;
            }*/
             return row.anggaran;
        }

        return sum;
    }

    calculateBottomUp(index){}
}
