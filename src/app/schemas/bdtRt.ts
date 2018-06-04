import * as renderers from './renderers';
import { SchemaColumn } from "./schema";
import { chosenRenderer } from './renderers';

import editors from './editors';

let schema: SchemaColumn[] = [
     {
        header: 'No PBDT',
        field: 'id', 
        width: 130,
        type: 'text',
        readOnly: true
    },
    {
        header: 'Nama KRT',
        field: 'Nama_KRT',
        width: 200,
        type: 'text',
    },
    {
        header: 'Alamat',
        field: 'Alamat',
        width: 250,
        type: 'text',
        category: { id: 'rt', label: 'Rumah Tangga'}
    },
    {
        header: 'Jml ART',
        field: 'Jumlah_ART',
        type: 'text',
        width: 100,
        category: { id: 'rt', label: 'Rumah Tangga'}
    },
    {
        header: 'Jml Keluarga',
        field: 'Jumlah_Keluarga',
        type: 'text',
        width: 100,
        category: { id: 'rt', label: 'Rumah Tangga'}
    },
    {
        header: 'Bangunan Rumah',
        field: 'sta_bangunan',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data: [{
                id: 1,
                label: 'Milik sendiri'
            }, {
                id: 2,
                label: 'Kontrak/sewa'
            },{
                id: 3,
                label: 'Bebas sewa'
            },{
                id: 4,
                label: 'Dinas'
            },{
                id: 5,
                label: 'Lainnya'
        }]},
        width: 130,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Lahan Rumah',
        field: 'sta_lahan',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data: [{
                id: 1,
                label: 'Milik sendiri'
            },{
                id: 2,
                label: 'Milik orang lain'
            },{
                id: 3,
                label: 'Tanah negara'
            },{
                id: 4,
                label: 'Lainnya'
        }]},
        width: 130,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Luas Lantai',
        field: 'luas_lantai',
        type: 'text',
        width: 100,
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Jenis Lantai',
        field: 'lantai',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data: [{
                id: 1,
                label: 'Marmer/granit'
            },{
                id: 2,
                label: 'Keramik'
            }, {
                id: 3,
                label: 'Parket/vinil/permadani'
            },{
                id: 4,
                label: 'Ubin/tegel/teraso'
            },{
                id: 5,
                label: 'Kayu/papan kualitas tinggi'
            },{
                id: 6,
                label: 'Semen/bata merah'
            },{
                id: 7,
                label:  'Bambu'
            },{
                id: 8,
                label: 'Kayu/papan kualitas rendah'
            },{
                id: 9,
                label: 'Tanah'
            },{
                id: 10,
                label: 'Lainnya'
        }]},
        width: 120,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Jenis Dinding',
        field: 'dinding',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Tembok'
            },{
                id: 2,
                label: 'Plesteran anyaman bambu/kawat'
            },{
                id: 3,
                label: 'Kayu'
            },{
                id: 4,
                label: 'Anyaman bambu'
            },{
                id: 5,
                label: 'Batang kayu'
            },{
                id: 6,
                label: 'Bambu'
            },{
                id: 7,
                label: 'Lainnya'
        }]},
        width: 120,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Kondisi Dinding',
        field: 'kondisi_dinding',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Bagus/kualitas tinggi'
            },{
                id: 2,
                label: 'Jelek/kualitas rendah'
        }]},
        width: 130,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Jenis Atap',
        field: 'atap',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions:  {data:[{
                id: 1,
                label: 'Beton/genteng betoni'
            },{
                id: 2,
                label: 'Genteng keramik'
            },{
                id: 3,
                label: 'Genteng metal'
            },{
                id: 4,
                label: 'Genteng tanah liat'
            },{
                id: 5,
                label: 'Asbes'
            },{
                id: 6,
                label: 'Seng'
            },{
                id: 7,
                label: 'Sirap'
            },{
                id: 8,
                label: 'Bambu'
            },{
                id: 9,
                label: 'Jerami/ijuk/daun daunan/rumbia'
            },{
                id: 10,
                label: 'Lainnya'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Kondisi Atap',
        field: 'kondisi_atap',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Bagus/kualitas tinggi'
            },{
                id: 2,
                label: 'Jelek/kualitas rendah'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Jml Kamar',
        field: 'jumlah_kamar',
        type: 'text',
        width: 150,
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Sumber Air Minum',
        field: 'sumber_airminum',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Air kemasan bermerk'
            },{
                id: 2,
                label: 'Air isi ulang'
            },{
                id: 3,
                label: 'Leding meteran'
            },{
                id: 4,
                label: 'Leding eceran'
            },{
                id: 5,
                label: 'Sumur bor/pompa'
            },{
                id: 6,
                label: 'Sumur terlindung'
            },{
                id: 7,
                label: 'Sumur tak terlindung'
            },{
                id: 8,
                label: 'Mata air terlindung'
            },{
                id: 9,
                label: 'Mata air tak terlindung'
            },{
                id: 10,
                label: 'Air sungai/danau/waduk'
            },{
                id: 11,
                label: 'Air hujan'
            },{
                id: 12,
                label: 'Lainnya'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'ID Pelanggan PDAM',
        field: 'nomor_meter_air',
        type: 'text',
        width: 150,
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Cara Peroleh Air Minum',
        field: 'cara_peroleh_airminum',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Membeli eceran'
            },{
                id: 2,
                label: 'Langganan'
            },{
                id: 3,
                label: 'Tidak membeli'
        }]},
        width: 200,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Sumber Penerangan',
        field: 'sumber_penerangan',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Listrik PLN'
            },{
                id: 2,
                label: 'Listrik non PLN'
            },{
                id: 3,
                label: 'Bukan listrik'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Daya Listrik',
        field: 'daya',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: '450 watt'
            },{
                id: 2,
                label: '900 watt'
            },{
                id: 3,
                label: '1300 watt'
            },{
                id: 4,
                label: '2200 watt'
            },{
                id: 5,
                label: '> 2200 watt'
            },{
                id: 6,
                label: 'Tanpa meteran'
        }]},
        width: 130,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'ID Pelanggan PLN',
        field: 'nomor_pln',
        type: 'text',
        width: 150,
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Bahan Bakar Masak',
        field: 'bb_masak',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Listrik'
            },{
                id: 2,
                label: 'Gas > 3 kg'
            },{
                id: 3,
                label: 'Gas 3 kg'
            },{
                id: 4,
                label: 'Gas kota/biogas'
            },{
                id: 5,
                label: 'Minyak tanah'
            },{
                id: 6,
                label: 'Briket'
            },{
                id: 7,
                label: 'Arang'
            },{
                id: 8,
                label: 'Kayu bakar'
            },{
                id: 9,
                label: 'Tidak memasak di rumah'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'ID Pelanggan Gas',
        field: 'nomor_gas',
        type: 'text',
        width: 150,
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Status BAB',
        field: 'fasbab',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Sendiri'
            },{
                id: 2,
                label: 'Bersama'
            },{
                id: 3,
                label: 'Umum'
            },{
                id: 4,
                label: 'Tidak ada'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Jenis Kloset',
        field: 'kloset',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Leher angsa'
            },{
                id: 2,
                label: 'Plengsengan'
            },{
                id: 3,
                label: 'Cemplung/cebluk'
            },{
                id: 4,
                label: 'Tidak pakai'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'TPA Tinja',
        field: 'buang_tinja',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Tangki'
            },{
                id: 2,
                label: 'SPAL'
            },{
                id: 3,
                label: 'Lubang tanah'
            },{
                id: 4,
                label: 'Kolam/sawah/sungai/danau/laut'
            },{
                id: 5,
                label: 'Pantai/tanah lapang/kebun'
            },{
                id: 6,
                label: 'Lainnya'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'perumahan', label: 'Keterangan Perumahan'}
    },
    {
        header: 'Tabung Gas > 5,5kg',
        field: 'ada_tabung_gas',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Lemari Es',
        field: 'ada_lemari_es',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'AC',
        field: 'ada_ac',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Pemanas air',
        field: 'ada_pemanas',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Telepon rumah',
        field: 'ada_telepon',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Televisi',
        field: 'ada_tv',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Perhiasan/Tabungan',
        field: 'ada_emas',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
     {
        header: 'Komputer/Laptop',
        field: 'ada_laptop',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
     {
        header: 'Sepeda',
        field: 'ada_sepeda',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Sepeda motor',
        field: 'ada_motor',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
     {
        header: 'Mobil',
        field: 'ada_mobil',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
     {
        header: 'Perahu',
        field: 'ada_perahu',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    }, {
        header: 'Motor Tempel',
        field: 'ada_motor_tempel',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },{
        header: 'Perahu Motor',
        field: 'ada_perahu_motor',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Kapal',
        field: 'ada_kapal',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Aset lahan',
        field: 'aset_tak_bergerak',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Luas lahan',
        field: 'luas_atb',
        type: 'text',
        width: 100,
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Rumah di tempat lain',
        field: 'rumah_lain',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Jumlah Sapi',
        field: 'jumlah_sapi',
        type: 'text',
        width: 100,
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Jumlah Kerbau',
        field: 'jumlah_kerbau',
        type: 'text',
        width: 100,
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Jumlah Kuda',
        field: 'jumlah_kuda',
        type: 'text',
        width: 100,
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Jumlah Babi',
        field: 'jumlah_babi',
        type: 'text',
        width: 100,
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'Jumlah Kambing',
        field: 'jumlah_kambing',
        type: 'text',
        width: 100,
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'ART memiliki usaha sendiri/bersama',
        field: 'sta_art_usaha',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 250,
        type: 'text',
        category: { id: 'aset', label: 'Kepemilikan Aset'}
    },
    {
        header: 'KKS/KPS',
        field: 'sta_kks',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
     {
        header: 'KIP/BSM',
        field: 'sta_kip',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'KIS/BPJS/Jamkesmas',
        field: 'sta_kis',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 150,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'BPJS mandiri',
        field: 'sta_bpjs_mandiri',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'Jamsostek',
        field: 'sta_jamsostek',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'Asuransi kesehatan',
        field: 'sta_asuransi',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'PKH',
        field: 'sta_pkh',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'Raskin',
        field: 'sta_raskin',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 3,
                label: 'Ya'
            },{
                id: 4,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
    {
        header: 'KUR',
        field: 'sta_kur',
        renderer: chosenRenderer,
        editor: editors.chosen,
        chosenOptions: {data:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }]},
        width: 100,
        type: 'text',
        category: { id: 'program', label: 'Kartu Program'}
    },
];

export default schema;