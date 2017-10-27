import { Component, ApplicationRef, Input, Output, EventEmitter } from "@angular/core";
import PendudukChart from "../helpers/pendudukChart";
import penduduk from "../schemas/penduduk";

@Component({
    selector: 'penduduk-statistic',
    templateUrl: '../templates/pendudukStatistic.html'
})
export default class PendudukStatisticComponent {
    private _hot;

    @Input()
    set hot(value) {
        this._hot = value;
    }
    get hot() {
        return this._hot;
    }

    totalKeluarga: number;
    totalFemale: number;
    totalMale: number;
    totalUnknown: number;

    constructor() { }

    ngOnInit(): void {
        let chart = new PendudukChart();
        let sourceData = this.hot.getSourceData();

        let pekerjaanRaw = chart.transformRaw(sourceData, 'pekerjaan', 24).filter(e => e.jumlah > 0);
        let pekerjaanData = chart.transformDataStacked(pekerjaanRaw, 'pekerjaan');
        let pekerjaanChart = chart.renderMultiBarHorizontalChart('pekerjaan', pekerjaanData);

        let pendidikanRaw = chart.transformRaw(sourceData, 'pendidikan', 23).filter(e => e.jumlah > 0);
        let pendidikanData = chart.transformDataStacked(pendidikanRaw, 'pendidikan');
        let pendidikanChart = chart.renderMultiBarHorizontalChart('pendidikan', pendidikanData);

        let ageGroupRaw = chart.transformAgeGroup(sourceData).filter(e => e.jumlah > 0);
        let ageGroupData = chart.transformDataPyramid(ageGroupRaw);
        let ageGroupChart = chart.renderMultiBarHorizontalChart('ageGroup', ageGroupData);

        let agamaRaw = chart.transformRaw(sourceData, 'agama', 7).filter(e => e.jumlah > 0);
        let agamaData = chart.transformData(agamaRaw, 'agama');
        let agamaChart = chart.renderPieChart('agama', agamaData);

        let statusKawinRaw = chart.transformRaw(sourceData, 'statusKawin', 6).filter(e => e.jumlah > 0);
        let statusKawinData = chart.transformData(statusKawinRaw, 'statusKawin');
        let statusKawinChart = chart.renderPieChart('statusKawin', statusKawinData);

        this.loadTotalStatistics();

        setTimeout(() => {
            pekerjaanChart.update();
            pendidikanChart.update();
            agamaChart.update();
            statusKawinChart.update();
            ageGroupChart.update();
        }, 3000);
    }

    loadTotalStatistics(): void {
        let data = this.hot.getSourceData();
        let currentKK = null;
        let kks = {};
        
        let no_kk = penduduk.findIndex(f => f.field == "no_kk");
        data.forEach(item => {
            kks[item[no_kk]] = true;
        });

        console.log(kks);
        this.totalKeluarga = Object.keys(kks).length;
        this.totalFemale = data.filter(e => e[3] === 'Perempuan').length;
        this.totalMale = data.filter(e => e[3] === 'Laki-Laki').length;
        this.totalUnknown = data.filter(e => e[3] === 'Tidak Diketahui').length;
    }
}
