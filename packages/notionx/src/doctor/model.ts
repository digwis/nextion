// Local model types used by the doctor module.
// Project-specific content models (built on `defineContentSource`) are
// mapped to this shape internally for diagnostic reporting.

export type NotionSortDirection = "ascending" | "descending";

export type NotionSort = {
  property: string;
  direction: NotionSortDirection;
};

export type NotionFieldMap = Record<string, string | readonly string[]>;

export type ContentModelDefinition<TFields extends NotionFieldMap = NotionFieldMap> = {
  id: string;
  kind: "article" | "catalog" | "directory";
  visibility: {
    public: boolean;
    admin: boolean;
  };
  source: {
    type: "notion";
    tokenEnv: "NOTION_TOKEN";
    dataSourceEnv: string;
    /**
     * Env var name for the Notion translation data source for this
     * model. Optional; only present when the model participates in
     * the multilingual foundation.
     */
    translationSourceEnv?: string;
    /**
     * Translation source names (matching the keys in
     * ScaffoldMetadata.translationSources) that this model relies
     * on. Each entry must resolve to a configured translation
     * data source for the doctor check to pass.
     */
    translationSources?: readonly string[];
    defaultDataSourceId?: string;
    fields: TFields;
    query: {
      pageSize: number;
      sorts?: readonly NotionSort[];
      filterProperties?: readonly string[];
    };
  };
  routes: {
    listPath: string;
    detailPath: string;
    detailParam: string;
    publicApiPath?: string;
  };
  ui: {
    name: string;
    pluralName: string;
    navLabel: string;
    listTitle: string;
    listDescription: string;
    emptyState: string;
  };
  capabilities: {
    richBlocks: boolean;
    coverImages: boolean;
    gatedAssets: boolean;
  };
};
