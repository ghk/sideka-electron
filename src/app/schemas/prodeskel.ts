import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
      header: 'Id',
      field: 'id', 
      width: 0,
      type: 'text'
    },
    {
        header: 'No KK',
        field: 'no_kk', 
        type: 'text',
        readOnly: true,
        width: 140,
    },
    {
        header: 'Kepala Keluarga',
        field: 'nama_kk', 
        type: 'text',        
        readOnly: true,
        width: 200,
    },
    {
        header: 'Anggota',
        field: 'anggota', 
        type: 'text',
        width: 100,
        readOnly: true,
        renderer: renderers.anggotaRenderer
    },
    {
        header: 'Lewati',
        field: 'skip', 
        type: 'checkbox',
        readOnly: false,
        width: 70,
    },
    {
        header: 'Status',
        field: 'status', 
        type: 'text',
        readOnly: true,
        width: 140,
    },
    {
        header: 'Nama Pengisi',
        field: 'nama_pengisi', 
        type: 'text',        
        readOnly: true,
        width: 140,
    },
    {
        header: 'Username Pengisi',
        field: 'username_pengisi', 
        type: 'text',        
        readOnly: true,
        width: 140,
    },
    {
        header: 'Waktu Isi',
        field: 'waktu_isi', 
        type: 'text',        
        readOnly: true,
        width: 140,
    },
    {
        header: 'Pesan',
        field: 'pesan', 
        type: 'text',        
        readOnly: false,
        width: 1000,
    },
];

export default schema;