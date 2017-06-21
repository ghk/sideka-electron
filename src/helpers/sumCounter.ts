import schemas from '../schemas';
enum rab {}

export default class SumCounter {
    hot: any;
    sums: any;
    sumsPAK: any;
    type: string;
    updateData:any;
    dataBundles: any;

    constructor(hot, type) {
        this.hot = hot;
        this.type = type;
        this.sums = {awal:{},PAK:{},perubahan:{}};
        this.sumsPAK = {};
        this.updateData = [];
        this.dataBundles = [];
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas[this.type]));
        this.sums = {awal:{},PAK:{},perubahan:{}};
        this.updateData = [];
        this.dataBundles = [];
        
        let that = this;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let kodeBidOrKeg = (!row.Kd_Bid_Or_Keg || row.Kd_Bid_Or_Keg == '') ? null : row.Kd_Bid_Or_Keg;
            let property = (!row.Kd_Keg || row.Kd_Keg =='') ? row.Kode_Rekening : row.Kd_Keg+'_'+row.Kode_Rekening;

            if (row.Kode_Rekening && !this.sums.awal[property]){
                let result = this.getValue(row, i, rows)
                this.updateData.push(result);
            }

            if (kodeBidOrKeg != null){
                let result = this.getSumsBidAndKeg(row, i, rows);
                this.updateData.push(result);  
            }       
        }        
    }

    getValue(row, index, rows): any {
        let sum = 0;
        let sumPAK = 0;
        let Kode_Rekening = (row.Kode_Rekening.slice(-1) == '.') ? row.Kode_Rekening.slice(0, -1) : row.Kode_Rekening;
        let property = (!row.Kd_Keg || row.Kd_Keg =='') ? row.Kode_Rekening : row.Kd_Keg+'_'+row.Kode_Rekening;
        let dotCount = Kode_Rekening.split(".").length;        
        let i = index + 1;
        let bundle = Object.assign({}, row)
        
        for (;i < rows.length;i++) {
            let nextRow = rows[i];
            
            if(!nextRow.Kode_Rekening || nextRow.Kode_Rekening == '') continue;

            let nextCode = (nextRow.Kode_Rekening.slice(-1) == '.') ? nextRow.Kode_Rekening.slice(0,-1) : nextRow.Kode_Rekening;            
            let nextDotCount = nextRow.Kode_Rekening ? nextCode.split(".").length : 0;
            let dotCountCompare = nextCode.startsWith('5.1.3') ? 6 : 5;
            
            if(nextCode == '') continue;

            if (!nextCode.startsWith(Kode_Rekening))
                break;
            
            if(row.Kd_Keg != nextRow.Kd_Keg)
                if(row.Kode_Rekening !== '5.')
                    break;

            if (nextDotCount == dotCountCompare  || this.type == 'spp' && nextDotCount !== 3) {
                if (Number.isFinite(nextRow.HrgSatuan) && Number.isFinite(nextRow.JmlSatuan)){
                    let anggaran = nextRow.JmlSatuan * nextRow.HrgSatuan;
                    let anggaranPAK = nextRow.JmlSatuanPAK * nextRow.HrgSatuanPAK;

                    sum += anggaran;                    
                    sumPAK += anggaranPAK;
                }
            }
        }
        
        if (Number.isFinite(row.HrgSatuan) && Number.isFinite(row.JmlSatuan)) {
            /*if(sum == 0 && row.Kode_Rekening){
               this.sums[row.Kode_Rekening] = row.anggaran;
            }*/
            let anggaran = row.JmlSatuan * row.HrgSatuan;
            let anggaranPAK = row.JmlSatuanPAK * row.HrgSatuanPAK;
            let perubahan = anggaranPAK - anggaran;
            
            this.sums.awal[property] = anggaran;
            this.sums.PAK[property] = anggaranPAK;
            this.sums.perubahan[property] = perubahan;

            bundle.Anggaran = anggaran;
            bundle.AnggaranStlhPAK = anggaranPAK;
            bundle.AnggaranPAK = perubahan;
            this.dataBundles.push(bundle) 
            
            return [anggaran, anggaranPAK, anggaranPAK - anggaran]
        }      

        this.sums.awal[property] = sum;
        this.sums.PAK[property] = sumPAK;
        this.sums.perubahan[property] = sumPAK-sum;

        bundle.Anggaran = sum;
        bundle.AnggaranStlhPAK = sumPAK;
        bundle.AnggaranPAK = sumPAK - sum;
        this.dataBundles.push(bundle) 

        return [sum,sumPAK,sumPAK - sum];
    }

    getSumsBidAndKeg(row, index, rows){
        let dotCountBidOrKeg = (row.Kd_Bid_Or_Keg.slice(-1) == '.') ? row.Kd_Bid_Or_Keg.split('.').length -1 : row.Kd_Bid_Or_Keg.split('.').length;
        let i = index + 1;
        let sum = 0;
        let sumPAK = 0;

        for (;i < rows.length; i++) {
            let row = rows[i];
            let code = row.Kode_Rekening.slice(-1) == '.' ? row.Kode_Rekening.slice(0,-1) : row.Kode_Rekening;            
            let dotCount = code ? code.split(".").length : 0;
            let dotCountCompare = (row.Kode_Rekening.startsWith('5.1.3')) ? 6 : 5;            

            if (dotCount != dotCountCompare)
                continue;

            if (dotCountBidOrKeg == 3){
                if(row.Kd_Keg.startsWith(row.Kd_Bid_Or_Keg)){
                    if(Number.isFinite(row.HrgSatuan) && Number.isFinite(row.JmlSatuan)){
                        let anggaran = row.JmlSatuan * row.HrgSatuan;
                        let anggaranPAK = row.JmlSatuanPAK * row.HrgSatuanPAK;

                        sum += anggaran;                    
                        sumPAK += anggaranPAK;
                    }
                }
                else
                    break;
            }

            else if (dotCountBidOrKeg == 4) {
                if(row.Kd_Keg == row.Kd_Bid_Or_Keg){
                    if(Number.isFinite(row.HrgSatuan) && Number.isFinite(row.JmlSatuan)){
                        let anggaran = row.JmlSatuan * row.HrgSatuan;
                        let anggaranPAK = row.JmlSatuanPAK * row.HrgSatuanPAK;

                        sum += anggaran;                    
                        sumPAK += anggaranPAK;
                    }
                }
                else
                    break;
            }
        }

        this.sums.awal[row.Kd_Bid_Or_Keg] = sum;
        this.sums.PAK[row.Kd_Bid_Or_Keg] = sumPAK;
        this.sums.perubahan[row.Kd_Bid_Or_Keg] = sumPAK - sum;

        let bundle = Object.assign({}, row)
        
        bundle.Anggaran = sum;
        bundle.AnggaranStlhPAK = sumPAK;
        bundle.AnggaranPAK = sumPAK - sum;
        this.dataBundles.push(bundle)        

        return [sum,sumPAK,sumPAK - sum]
    }

    calculateBottomUp(index) { }
}
