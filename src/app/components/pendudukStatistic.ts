import { Component, ApplicationRef, Input } from "@angular/core";
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

        let pekerjaanRaw = chart.transformRaw(sourceData, 'pekerjaan', 9);
        let pekerjaanData = chart.transformDataStacked(pekerjaanRaw, 'pekerjaan');
        let pekerjaanChart = chart.renderMultiBarHorizontalChart('pekerjaan', pekerjaanData);

        let pendidikanRaw = chart.transformRaw(sourceData, 'pendidikan', 6);
        let pendidikanData = chart.transformDataStacked(pendidikanRaw, 'pendidikan');
        let pendidikanChart = chart.renderMultiBarHorizontalChart('pendidikan', pendidikanData);

        let ageGroupRaw = chart.transformAgeGroup(sourceData);
        let ageGroupData = chart.transformDataPyramid(ageGroupRaw);
        let ageGroupChart = chart.renderMultiBarHorizontalChart('ageGroup', ageGroupData);

        let agamaRaw = chart.transformRaw(sourceData, 'agama', 7);
        let agamaData = chart.transformData(agamaRaw, 'agama');
        let agamaChart = chart.renderPieChart('agama', agamaData);

        let statusKawinRaw = chart.transformRaw(sourceData, 'statusKawin', 8);
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
        let keluargaTemp = [];
        let perempuanTemp = [];
        let initialValue = null;
        let total = 0;

        for(let i=0; i<data.length; i++){
            let item = data[i];
            let existingKeluarga = keluargaTemp.filter(e => e[22] === item[22])[0];

            if(!existingKeluarga)
                keluargaTemp.push(item);
        }

        this.totalKeluarga = keluargaTemp.length;
        this.totalFemale = data.filter(e => e[5] === 'Perempuan').length;
        this.totalMale = data.filter(e => e[5] === 'Laki - laki').length;
        this.totalUnknown = data.filter(e => e[5] === 'Tidak Diketahui').length;
    }
}
