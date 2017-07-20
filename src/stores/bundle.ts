export interface BundleData {
    [key: string]: any[]
}

export interface DiffItem {
    added: any[],
    modified: any[],
    deleted: any[],
    total: number
}

export interface BundleDiffs {
    [key: string]: DiffItem[]
}

export interface Bundle {
    apiVersion: string,
    changeId: number,
    columns: { [key: string]: string[] },
    data: BundleData,
    diffs: BundleDiffs,
    createdBy?: string,
    modifiedBy?: string,
    createdTimestamp?: number,
    modifiedTimestamp?: number
}
