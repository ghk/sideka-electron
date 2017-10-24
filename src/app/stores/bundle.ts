export interface BundleData {
    [key: string]: any[]
}

export interface DiffItem {
    added: any[],
    modified: any[],
    deleted: any[],
    total: number
}

export interface DiffDict {
    [key: string]: DiffItem
}

export interface BundleDiffs {
    [key: string]: DiffItem[]
}

export interface Bundle {
    apiVersion: string,
    changeId: number,
    columns: { [key: string]: string[] | string },
    data: BundleData,
    diffs: BundleDiffs,
    isServerSynchronized?: boolean;
    createdBy?: string,
    modifiedBy?: string,
    createdTimestamp?: number,
    modifiedTimestamp?: number
}
