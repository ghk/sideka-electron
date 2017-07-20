import schemas from '../schemas';
enum rab {}

export default class SumCounterSPP {
    hot: any;
    sums: any;
    sumsPAK: any;
    type: string;
    updateData:any;
    dataBundles: any;

    constructor(hot, type) {
        this.hot = hot;
        this.type = type;
        this.sums = {};
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        this.sums = {};
        
        let that = this;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if (row.code && !this.sums[row.code]){
                let result = this.getValue(row, i, rows)
                this.updateData.push(result);
            } 
        }        
    }

    getValue(row, index, rows): any {
        let sum = 0;
        let Kode_Rekening = (row.Kode_Rekening.slice(-1) == '.') ? row.Kode_Rekening.slice(0, -1) : row.Kode_Rekening;
        let property = (!row.Kd_Keg || row.Kd_Keg =='') ? row.Kode_Rekening : row.Kd_Keg+'_'+row.Kode_Rekening;
        let dotCount = Kode_Rekening.split(".").length;        
        let i = index + 1;
        let bundle = Object.assign({}, row)
        
        for (;i < rows.length;i++) {
            if(!rows[i].Kode_Rekening){
                if(row.Kode_Rekening == '5.')
                    continue;
                else
                    break;
            }            
                
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

            if (nextDotCount == dotCountCompare) {
                if (Number.isFinite(nextRow.HrgSatuan) && Number.isFinite(nextRow.JmlSatuan)){
                    let anggaran = nextRow.JmlSatuan * nextRow.HrgSatuan;
                    let anggaranPAK = nextRow.JmlSatuanPAK * nextRow.HrgSatuanPAK;

                    sum += anggaran;         
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

    }

    
    calculateBottomUp(index) { }
}
