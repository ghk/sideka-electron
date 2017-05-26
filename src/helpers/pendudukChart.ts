import penduduk from "../schemas/penduduk";

const d3 = require("d3");
const nv = require("nvd3");

export default class PendudukChart{
    sources: any = { "genders": [], "pekerjaan": [], "pendidikan": [], "agama": [], "statusKawin": [] }

    constructor(){
        this.sources.genders = penduduk.filter(e => e.field === 'jenis_kelamin')[0]["source"];
        this.sources.pekerjaan = penduduk.filter(e => e.field === 'pekerjaan')[0]["source"];
        this.sources.pendidikan = penduduk.filter(e => e.field === 'pendidikan')[0]["source"];
        this.sources.agama = penduduk.filter(e => e.field === 'agama')[0]['source'];
        this.sources.statusKawin = penduduk.filter(e => e.field === 'status_kawin')[0]['source'];
    }

    renderMultiBarHorizontalChart(id: string, data: any[]): any {
        let chart = nv.models.multiBarHorizontalChart().x(function(d) {  return d.label })
            .y(function(d) { return d.value }).margin({top: 10, right: 20, bottom: 50, left: 175})
            .stacked(true).showControls(false);
        
        chart.yAxis.tickFormat(d3.format('d'));
        d3.select('#' + id + ' svg').datum(data).call(chart);
        nv.utils.windowResize(chart.update);

        return chart;
    }

    renderPieChart(id: string, data: any[]) {
        let chart = nv.models.pieChart().x(function(d) { return d.label })
                .y(function(d) { return d.value }).labelThreshold(.25).showLabels(true);

            d3.select('#' + id + ' svg').datum(data).call(chart);
            return chart;
    }

    transformAgeGroup(raw): any{
        let result: any[] = [];
        let range: any[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
        let currentYear = new Date().getFullYear();

        for(let i=0; i<range.length; i++){
            let min = range[i];
            let max = range[i + 1];
            
            if(!max)
               break;

            for(let j=0; j<this.sources['genders'].length; j++){
                let gender = this.sources['genders'][j];
                
                let total = raw.filter(e => 
                    (currentYear - new Date(e[4]).getFullYear()) >= min 
                    && (currentYear - new Date(e[4]).getFullYear()) <= max 
                    && e[5] == gender).length;

               let resultItem = {
                   "jenis_kelamin": gender,
                   "max_umur": max,
                   "min_umur": min,
                   "jumlah": total
               };

               result.push(resultItem);
            }
        }

        return result;
    }

    transformDataStacked(raw, label): any{
        var all = {};
        var allPerSex = {}
        var total = 0;
        for(var i = 0; i < raw.length; i++){
            var r = raw[i];
            var val = parseInt(r.jumlah);
            var p = r[label].toUpperCase();
            if(!all[p])
            {
                all[p] = 0;
            }
            all[p] += val;
            if(!allPerSex[p])
            {
                allPerSex[p] ={};
            }
            allPerSex[p][r.jenis_kelamin] = val;
            total += val;
        }

        //remove values lesser than 2% of total
        var min = Math.round(0.01 * total);
        var keys = Object.keys(all);
        var filteredKeys = [];
        var etcS = {"Perempuan": 0, "Laki - laki": 0, "Tidak Diketahui": 0};
        var etc = 0;
        for(var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if(all[key] < min){
                var sexes = Object.keys(etcS);
                for(var j = 0; j < sexes.length; j++)
                {
                    var sex = sexes[j];
                    if(allPerSex[key][sex]) {
                        etcS[sex] += allPerSex[key][sex];
                    }
                }
                etc += all[key];
            } else {
                filteredKeys.push(key);
            }
        }
        if(etc > 0) {
            var etcN = "LAIN - LAIN";
            all[etcN] = etc;
            allPerSex[etcN] = etcS;
            filteredKeys.push(etcN);
        }
        var sortedPekerjaan = filteredKeys.sort(function(a, b){
                var va = all[a];
                var vb = all[b];
                return vb - va;
        });
        return ["Perempuan", "Laki - laki", "Tidak Diketahui"].map(function(sex){
            return {
                key: sex,
                values: sortedPekerjaan
                    .map(function(p){
                        var val = allPerSex[p][sex];
                        if(!val)
                            val == 0;
                        return {"label": p, "value": val}
                    })
            }
        });
    }

    transformDataPendidikan(raw, label): any{
        //create aggregate dict
        var all = {};
        var allPerSex = {}
        var total = 0;
        for(var i = 0; i < raw.length; i++){
            var r = raw[i];
            var val = parseInt(r.jumlah);
            var p = this.findPendidikanGroup(r[label]);
            if(!all[p])
            {
                all[p] = 0;
            }
            all[p] += val;
            if(!allPerSex[p])
            {
                allPerSex[p] ={};
            }
            allPerSex[p][r.jenis_kelamin] = val;
            total += val;
        }
        //remove values lesser than 2% of total
        var min = Math.round(0.01 * total);
        var keys = Object.keys(all);
        var filteredKeys = [];
        var etcS = {"Perempuan": 0, "Laki - laki": 0, "Tidak Diketahui": 0};
        var etc = 0;
        for(var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if(all[key] < min){
                var sexes = Object.keys(etcS);
                for(var j = 0; j < sexes.length; j++)
                {
                    var sex = sexes[j];
                    if(allPerSex[key][sex]) {
                        etcS[sex] += allPerSex[key][sex];
                    }
                }
                etc += all[key];
            } else {
                filteredKeys.push(key);
            }
        }
        if(etc > 0) {
            var etcN = "LAIN - LAIN";
            all[etcN] = etc;
            allPerSex[etcN] = etcS;
            filteredKeys.push(etcN);
        }
        console.log(all);
        var me = this;
        var sortedPekerjaan = filteredKeys.sort(function(a, b){
            var va = me.sources.pendidikan.findIndex(function(i){return i[0] == a})
            var vb = me.sources.pendidikan.findIndex(function(i){return i[0] == b})
            return va - vb;
        });
        return ["Perempuan", "Laki - laki", "Tidak Diketahui"].map(function(sex){
            return {
                key: sex,
                values: sortedPekerjaan
                    .map(function(p){
                        var val = allPerSex[p][sex];
                        if(!val)
                            val == 0;
                        return {"label": p, "value": val}
                    })
            }
        });
    }
    
    transformDataPyramid(raw): any[]{
        //create aggregate dict
        var all = {};
        var allPerSex = {}
        var age = {}
        var total = 0;
        for(var i = 0; i < raw.length; i++){
            var r = raw[i];
            var val = parseInt(r.jumlah);
            var p = r.min_umur + " - " + r.max_umur;
            age[p] = r.min_umur;
            if(!all[p])
            {
                all[p] = 0;
            }
            all[p] += val;
            if(!allPerSex[p])
            {
                allPerSex[p] ={};
            }
            allPerSex[p][r.jenis_kelamin] = val;
            total += val;
        }
        var sorted = Object.keys(all).sort(function(a, b){
            return age[b] - age[a];
        });
        return ["Perempuan", "Laki - laki", "Tidak Diketahui"].map(function(sex){
            return {
                key: sex,
                values: sorted
                    .map(function(p){
                        var val = allPerSex[p][sex];
                        if(sex == "Perempuan")
                            val = -val;
                        if(!val)
                            val == 0;
                        return {"label": p, "value": val}
                    })
            }
        });
    }

    transformData(raw, label): any{
        var all = {};
        for(var i = 0; i < raw.length; i++){
            var r = raw[i];
            var val = parseInt(r.jumlah);
            var p = r[label].toUpperCase();
            if(!all[p])
            {
                all[p] = 0;
            }
            all[p] += val;
        }

        var sorted = Object.keys(all).sort(function(a, b){
            var va = all[a];
            var vb = all[b];
            return vb - va;
        });

        return sorted.map(function(p){
            var val = all[p];
            if(!val)
                val == 0;
            return {"label": p, "value": val}
        });
    }

    transformRaw(data: any[], key: string, keyIndex: number): any[]{
        let result: any[] = [];

        for(let i=0; i<this.sources[key].length; i++){
           let source = this.sources[key][i];

           for(let j=0; j<this.sources['genders'].length; j++){
               let gender = this.sources['genders'][j];
      
               let total = data.filter(e => e[5] == gender && e[keyIndex] == source).length;
               let resultItem = {
                   "jenis_kelamin": gender,
                   "jumlah": total
               };

               resultItem[key] = source;
               result.push(resultItem);
           } 
        }

        return result;
    }

    findPendidikanGroup(label): any{
        for(var i = 0; i < this.sources.pendidikan.length; i++){
            for(var j = 0; j < this.sources.pendidikan[i][1].length; j++){
                if(this.sources.pendidikan[i][1][j] == label)
                    return this.sources.pendidikan[i][0];
            }
        }
        return "Tidak Diketahui";
    }
}
