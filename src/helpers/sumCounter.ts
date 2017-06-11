import schemas from '../schemas';
enum rab {}

export default class SumCounter {
    hot: any;
    sums: any;
    type: string;

    constructor(hot, type) {
        this.hot = hot;
        this.type = type;
        this.sums = {};
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas[this.type]));
        this.sums = {};

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let kodeBidOrKeg = (!row.kd_bid_or_keg || row.kd_bid_or_keg == '') ? null : row.kd_bid_or_keg;

            if (row.kode_rekening && !this.sums[row.kode_rekening])
                this.getValue(row, i, rows);
            if (kodeBidOrKeg)
                this.getSumsBidAndKeg(kodeBidOrKeg, i, rows)
            
        }
    }

    getValue(row, index, rows): any {
        let sum = 0;
        let kode_rekening = (row.kode_rekening.slice(-1) == '.') ? row.kode_rekening.slice(0, -1) : row.kode_rekening;
        let dotCount = kode_rekening.split(".").length;
        
        let i = index + 1;
        let allowDetail = true;

        while (i < rows.length) {
            let nextRow = rows[i];
            let nextCode = nextRow.kode_rekening.slice(-1) == '.' ? nextRow.kode_rekening.slice(0,-1) : nextRow.kode_rekening;            
            let nextDotCount = nextRow.kode_rekening ? nextCode.split(".").length : 0;
            let dotCountCompare = nextCode.startsWith('5.1.3') ? 6 : 5;

            if (nextCode && !nextCode.startsWith(kode_rekening)){
                break;
            }

            if (nextDotCount == dotCountCompare  || this.type == 'spp' && nextDotCount !== 3) {
                if (Number.isFinite(nextRow.hrg_satuan) && Number.isFinite(nextRow.jml_satuan)){
                    let anggaran = nextRow.jml_satuan * nextRow.hrg_satuan;
                    sum += anggaran;
                }
            }

            i++;
        }
        
        this.sums[row.kode_rekening] = sum;

        if (Number.isFinite(row.hrg_satuan) && Number.isFinite(row.jml_satuan)) {
            /*if(sum == 0 && row.kode_rekening){
               this.sums[row.kode_rekening] = row.anggaran;
            }*/
            this.sums[row.kode_rekening] = row.jml_satuan * row.hrg_satuan;
        }

        return sum;
    }

    getSumsBidAndKeg(kodeBidOrKeg, index, rows){
        let dotCountBidOrKeg = (kodeBidOrKeg.slice(-1) == '.') ? kodeBidOrKeg.split('.').length -1 : kodeBidOrKeg.split('.').length;
        let i = index + 1;
        let sum = 0;

        while (i < rows.length) {
            let row = rows[i];
            let code = row.kode_rekening.slice(-1) == '.' ? row.kode_rekening.slice(0,-1) : row.kode_rekening;            
            let dotCount = row.kode_rekening ? row.split(".").length : 0;
            let dotCountCompare = (row.kode_rekening.startsWith('5.1.3')) ? 6 : 5;
            

            if(dotCountBidOrKeg == 3) {  
                if(row.kd_bid_or_keg != '' && row.kd_bid_or_ke && dotCount == dotCountCompare)
                    sum += row.anggaran;
                   
                
            }

            else {
                if(row.kd_bid_or_keg != '' && dotCount == dotCountCompare)
                    sum += row.anggaran;

            }

            i++;

        }
    }

    calculateBottomUp(index) { }
}
