import { Component, ApplicationRef, Input, Output, EventEmitter } from "@angular/core";
import PendudukChart from "../helpers/pendudukChart";

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

        let pekerjaanRaw = chart.transformRaw(sourceData, 'pekerjaan', 24);
        let pekerjaanData = chart.transformDataStacked(pekerjaanRaw, 'pekerjaan');
        let pekerjaanChart = chart.renderMultiBarHorizontalChart('pekerjaan', pekerjaanData);

        let pendidikanRaw = chart.transformRaw(sourceData, 'pendidikan', 23);
        let pendidikanData = chart.transformDataStacked(pendidikanRaw, 'pendidikan');
        let pendidikanChart = chart.renderMultiBarHorizontalChart('pendidikan', pendidikanData);

        let ageGroupRaw = chart.transformAgeGroup(sourceData);
        let ageGroupData = chart.transformDataPyramid(ageGroupRaw);
        let ageGroupChart = chart.renderMultiBarHorizontalChart('ageGroup', ageGroupData);

        let agamaRaw = chart.transformRaw(sourceData, 'agama', 7);
        let agamaData = chart.transformData(agamaRaw, 'agama');
        let agamaChart = chart.renderPieChart('agama', agamaData);

        let statusKawinRaw = chart.transformRaw(sourceData, 'statusKawin', 6);
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
        let kks = [];
        
        data.forEach(item => {
            let existingKK = kks.filter(e => e === item.no_kk)[0];

            if(!existingKK)
                kks.push(item.no_kk);
        });

        this.totalKeluarga = kks.length;
        this.totalFemale = data.filter(e => e[3] === 'Perempuan').length;
        this.totalMale = data.filter(e => e[3] === 'Laki-laki').length;
        this.totalUnknown = data.filter(e => e[3] === 'Tidak Diketahui').length;
    }
}
