import schemas from '../schemas';
enum rab {}

export default class SumCounterRAB {
    hot: any;
    sums: any;
    sumsPAK: any;
    type: string;
    updateData:any;
    dataBundles: any;

    constructor(hot) {
        this.hot = hot;
        this.sums = { awal:{}, PAK:{}, perubahan:{} };
        this.sumsPAK = {};
        this.updateData = [];
        this.dataBundles = [];
    }

    calculateAll(): void {
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.rab));
        this.sums = { awal:{}, PAK:{}, perubahan:{}};
        this.updateData = [];
        this.dataBundles = [];
        
        let that = this;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let kode_kegiatan = (row.kode_rekening === '' || row.kode_kegiatan !== "") ? row.kode_kegiatan : null;

            if (row.kode_rekening && !this.sums.awal[row.id]){
                let result = this.getValue(row, i, rows)
                this.updateData.push(result);
            }

            if (kode_kegiatan){
                if(row.id.split('_').length == 2)
                    continue;
                let result = this.getSumsBidAndKeg(row, i, rows);
                this.updateData.push(result);  
            }       
        }        
    }

    getValue(row, index, rows): any {
        let sum = 0;
        let sumPAK = 0;
        let kode_rekening = (row.kode_rekening.slice(-1) == '.') ? row.kode_rekening.slice(0, -1) : row.kode_rekening;
        let dotCount = kode_rekening.split(".").length;        
        let i = index + 1;
        let bundle = Object.assign({}, row)
        
        for (;i < rows.length;i++) {
            if(!rows[i].kode_rekening){
                if(row.kode_rekening == '5.')
                    continue;
                else
                    break;
            }            
                
            let nextRow = rows[i];
            
            if(!nextRow.kode_rekening || nextRow.kode_rekening == '') continue;

            let nextCode = (nextRow.kode_rekening.slice(-1) == '.') ? nextRow.kode_rekening.slice(0,-1) : nextRow.kode_rekening;            
            let nextDotCount = nextRow.kode_rekening ? nextCode.split(".").length : 0;
            let dotCountCompare = nextCode.startsWith('5.1.3') ? 6 : 5;
            
            if(nextCode == '') continue;

            if (!nextCode.startsWith(kode_rekening))
                break;
            
            if(row.id.split('_').length == 2){
                let currentKodekegiatan = row.id.split('_')[0];
                let nextKodeKegiatan = nextRow.id.split('_')[0];

                if(currentKodekegiatan != nextKodeKegiatan)
                    if(row.kode_rekening !== '5.')
                        break;
            }

            if (nextDotCount == dotCountCompare) {
                if (Number.isFinite(nextRow.harga_satuan) && Number.isFinite(nextRow.jumlah_satuan)){
                    let anggaran = nextRow.jumlah_satuan * nextRow.harga_satuan;
                    let perubahan = nextRow.jumlah_satuan_pak * nextRow.harga_satuan_pak;

                    sum += anggaran;                    
                    sumPAK += perubahan;
                }
            }
        }
        
        if (Number.isFinite(row.harga_satuan) && Number.isFinite(row.jumlah_satuan)) {
            let anggaran = row.jumlah_satuan * row.harga_satuan;
            let perubahan = row.jumlah_satuan_pak * row.harga_satuan_pak;
            let selisih = perubahan - anggaran;
            
            this.sums.awal[row.id] = anggaran;
            this.sums.PAK[row.id] = perubahan;
            this.sums.perubahan[row.id] = selisih;

            bundle.anggaran = anggaran;
            bundle.anggaran_pak = perubahan;
            bundle.perubahan = selisih;
            this.dataBundles.push(bundle) 
            
            return [anggaran, perubahan, perubahan - anggaran]
        }      
        
        this.sums.awal[row.id] = sum;
        this.sums.PAK[row.id] = sumPAK;
        this.sums.perubahan[row.id] = sumPAK-sum;

        bundle.anggaran = sum;
        bundle.anggaran_pak = sumPAK;
        bundle.perubahan = sumPAK - sum;
        this.dataBundles.push(bundle) 

        return [sum,sumPAK,sumPAK - sum];
    }

    getSumsBidAndKeg(row, index, rows){
        let kode_kegiatan = row.kode_kegiatan;
        let i = index + 1;
        let sum = 0;
        let sumPAK = 0;
        let currentKode = '';

        for (;i < rows.length; i++) {
            let nextRow  = rows[i];
            if(!nextRow.kode_kegiatan.startsWith(kode_kegiatan))
                break;
            if(nextRow.kode_rekening == "")
                continue;

            if(Number.isFinite(nextRow.harga_satuan) && Number.isFinite(nextRow.jumlah_satuan)){
                let anggaran = nextRow.jumlah_satuan * nextRow.harga_satuan;
                sum += anggaran;                    
            }
            if(Number.isFinite(nextRow.harga_satuan_pak) && Number.isFinite(nextRow.jumlah_satuan_pak)){
                let perubahan = nextRow.jumlah_satuan_pak * nextRow.harga_satuan_pak;
                sumPAK += perubahan;
            }
        }
        if(sum == 0)
            console.log(row.kode_kegiatan)

        this.sums.awal[row.kode_kegiatan] = sum;
        this.sums.PAK[row.kode_kegiatan] = sumPAK;
        this.sums.perubahan[row.kode_kegiatan] = sumPAK - sum;

        let bundle = Object.assign({}, row)
        
        bundle.anggaran = sum;
        bundle.anggaran_pak = sumPAK;
        bundle.perubahan = sumPAK - sum;
        this.dataBundles.push(bundle)        

        return [sum,sumPAK,sumPAK - sum]
    }

    calculateBottomUp(index) { }
}
