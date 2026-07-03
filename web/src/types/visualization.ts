import type { AnalyseOneRequest } from "@/types/aiReport"

export type VisualizationTableName =
    | "prices"
    | "financial_periods"
    | "scores"
    | "peers"
    | "market_context"
    | "ai_signals"
    | "data_quality"


export interface VisualizationColumn {
    name: string
    type: string
    label?: string | null
    unit?: string | null
    derived?: boolean
    formula?: string | null
    required_history_points?: number | null
    source?: string | null
    description?: string | null
}

export interface VisualizationTable {
    name: VisualizationTableName | string
    title?: string | null
    description?: string | null
    columns: VisualizationColumn[]
    rows: Record<string, unknown>[]
    row_count?: number
    source?: string | null
}

export interface VisualizationDataset {
    schema_version: "visualization.v1" | string
    symbol: string
    exchange?: string | null
    generated_at?: string | null
    meta?: Record<string, unknown>
    tables: VisualizationTable[]
    visualization?: VisualizationV2 | null
}

export type VisualizationV1 = VisualizationDataset

export type VisualizationChart =
    | {
          id: string
          title: string
          type: "echarts"
          height?: number
          option: Record<string, unknown>
      }
    | {
          id: string
          title: string
          type: "empty"
          message?: string
      }

export interface VisualizationV2 {
    schema_version: "visualization.v2" | string
    report_id?: string | null
    symbol?: string | null
    exchange?: string | null
    generated_at?: string | null
    charts: VisualizationChart[]
    meta?: {
        chart_count?: number
        has_missing_data?: boolean
        empty_chart_count?: number
    }
}

export type VisualizationResponse = {
    code?: number
    message?: string
    data?: VisualizationV1
}

export type VisualizationCsvResponse = Blob

export type DataFormulatorImportLinkRequest = AnalyseOneRequest & {
    format?: "json" | "csv"
    table?: VisualizationTableName | string
    include_all_tables?: boolean
    create_session?: boolean
}

export type DataFormulatorImportLinkResponse = {
    code?: number
    message?: string
    data?: {
        dataset_id?: string
        dataset_url?: string
        csv_urls?: Partial<Record<VisualizationTableName | string, string>>
        data_formulator_import_url?: string
        expires_at?: string
        available_tables?: Array<VisualizationTableName | string>
        auto_import_supported?: boolean
        session_supported?: boolean
        fallback_mode?: string
    }
}

