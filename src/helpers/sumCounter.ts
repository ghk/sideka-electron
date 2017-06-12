import schemas from '../schemas';
enum rab {}

export default class SumCounter {
    hot: any;
    sums: any;
    sumsPAK: any;
    type: string;
    updateData:any;

    constructor(hot, type) {
        this.hot = hot;
        this.type = type;
        this.sums = {};
        this.sumsPAK = {};
        this.updateData = [];
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas[this.type]));
        this.sums = {};
        this.updateData = [];
        let that = this;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let kodeBidOrKeg = (!row.kd_bid_or_keg || row.kd_bid_or_keg == '') ? null : row.kd_bid_or_keg;
            let property = (!row.flag || row.flag =='') ? row.kode_rekening : row.flag+'_'+row.kode_rekening;

            if (row.kode_rekening && !this.sums[property]){
                let result = this.getValue(row, i, rows)
                this.updateData.push(result);
            }

            if (kodeBidOrKeg != null){
                let result = this.getSumsBidAndKeg(kodeBidOrKeg, i, rows);
                this.updateData.push(result);  
            }       
        }

        this.hot.populateFromArray(0, 11, this.updateData, rows.length-1, 13, null, 'overwrite','right');
        setTimeout(function() {
            that.hot.render();            
        }, 200);
    }

    getValue(row, index, rows): any {
        let sum = 0;
        let sumPAK = 0;
        let kode_rekening = (row.kode_rekening.slice(-1) == '.') ? row.kode_rekening.slice(0, -1) : row.kode_rekening;
        let property = (!row.flag || row.flag =='') ? row.kode_rekening : row.flag+'_'+row.kode_rekening;
        let dotCount = kode_rekening.split(".").length;        
        let i = index + 1;
        
        for (;i < rows.length;i++) {
            let nextRow = rows[i];
            
            if(!nextRow.kode_rekening || nextRow.kode_rekening == '') continue;

            let nextCode = (nextRow.kode_rekening.slice(-1) == '.') ? nextRow.kode_rekening.slice(0,-1) : nextRow.kode_rekening;            
            let nextDotCount = nextRow.kode_rekening ? nextCode.split(".").length : 0;
            let dotCountCompare = nextCode.startsWith('5.1.3') ? 6 : 5;
            
            if(nextCode == '') continue;

            if (!nextCode.startsWith(kode_rekening))
                break;
            
            if(row.flag != nextRow.flag)
                if(row.kode_rekening !== '5.')
                    break;

            if (nextDotCount == dotCountCompare  || this.type == 'spp' && nextDotCount !== 3) {
                if (Number.isFinite(nextRow.hrg_satuan) && Number.isFinite(nextRow.jml_satuan)){
                    let anggaran = nextRow.jml_satuan * nextRow.hrg_satuan;
                    let anggaranPAK = nextRow.jml_satuan_PAK * nextRow.hrg_satuan_PAK;

                    sum += anggaran;                    
                    sumPAK += anggaranPAK;
                }
            }
        }
        
        this.sums[property] = sum;
        this.sumsPAK[property] = sumPAK;

        if (Number.isFinite(row.hrg_satuan) && Number.isFinite(row.jml_satuan)) {
            /*if(sum == 0 && row.kode_rekening){
               this.sums[row.kode_rekening] = row.anggaran;
            }*/
            let anggaran = row.jml_satuan * row.hrg_satuan;
            let anggaranPAK = row.jml_satuan_PAK * row.hrg_satuan_PAK;
            
            this.sums[property] = row.jml_satuan * row.hrg_satuan;
            this.sumsPAK[property] = row.jml_satuan_PAK * row.hrg_satuan_PAK;
            
            return [anggaran, anggaranPAK, anggaranPAK - anggaran]
        }      

        return [sum,sumPAK,0];
    }

    getSumsBidAndKeg(kodeBidOrKeg, index, rows){
        let dotCountBidOrKeg = (kodeBidOrKeg.slice(-1) == '.') ? kodeBidOrKeg.split('.').length -1 : kodeBidOrKeg.split('.').length;
        let i = index + 1;
        let sum = 0;
        let sumPAK = 0;

        for (;i < rows.length; i++) {
            let row = rows[i];
            let code = row.kode_rekening.slice(-1) == '.' ? row.kode_rekening.slice(0,-1) : row.kode_rekening;            
            let dotCount = code ? code.split(".").length : 0;
            let dotCountCompare = (row.kode_rekening.startsWith('5.1.3')) ? 6 : 5;            

            if (dotCount != dotCountCompare)
                continue;

            if (dotCountBidOrKeg == 3){
                if(row.flag.startsWith(kodeBidOrKeg)){
                    let anggaran = row.jml_satuan * row.hrg_satuan;
                    let anggaranPAK = row.jml_satuan_PAK * row.hrg_satuan_PAK;

                    sum += anggaran;                    
                    sumPAK += anggaranPAK;
                }
                else
                    break;
            }

            else if (dotCountBidOrKeg == 4) {
                if(row.flag == kodeBidOrKeg){
                    let anggaran = row.jml_satuan * row.hrg_satuan;
                    let anggaranPAK = row.jml_satuan_PAK * row.hrg_satuan_PAK;

                    sum += anggaran;                    
                    sumPAK += anggaranPAK;
                }
                else
                    break;
            }
        }

        this.sums[kodeBidOrKeg] = sum;
        this.sumsPAK[kodeBidOrKeg] = sumPAK;

        return [sum,sumPAK,0]
    }

    calculateBottomUp(index) { }
}
