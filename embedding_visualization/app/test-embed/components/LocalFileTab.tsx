'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/lib/ui-primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/lib/ui-primitives/card';
import { Spinner } from '@/lib/ui-primitives/spinner';
import { Label } from '@/lib/ui-primitives/label';
import { Input } from '@/lib/ui-primitives/input';
import { Checkbox } from '@/lib/ui-primitives/checkbox';
import { TopicConfigForm } from './TopicConfigForm';
import type { DataType, PortionStrategy, EmbedLocalFileInput, LocalFileInfo, LocalFilePreview, EmbedDatasetResult, EmbeddingJob, GenerateLlmLabelsInput, GenerateLlmLabelsResult } from '@/lib/graphql/mutations';

import { FileUploadZone } from './FileUploadZone';
import { DataTypeSelector } from './DataTypeSelector';
import { PortionSelector } from './PortionSelector';
import { DatasetInfoDisplay } from './DatasetInfoDisplay';
import { ColumnSelector } from './ColumnSelector';
import { EmbeddingModelForm } from './EmbeddingModelForm';
import { EmbedResultCard } from './EmbedResultCard';
import { ErrorCard } from './ErrorCard';
import { EmbedProgressSection } from './EmbedProgressSection';
import { useEmbeddingModelState } from '../lib/useEmbeddingModelState';
import { updateTextTemplate, transformStoredEmbeddingModel, resumeLlmLabelingJob } from '../lib/embeddingFormUtils';

interface LocalFileTabProps {
  fetchLocalFileInfo: (filePath: string) => Promise<LocalFileInfo | null>;
  fetchLocalFilePreview: (filePath: string, nRows?: number) => Promise<LocalFilePreview | null>;
  embedLocalFile: (input: EmbedLocalFileInput) => Promise<EmbedDatasetResult | null>;
  refreshCollections: () => Promise<void>;
  localFileInfo: LocalFileInfo | null;
  localFilePreview: LocalFilePreview | null;
  infoLoading: boolean;
  previewLoading: boolean;
  embedLoading: boolean;
  error: string | null;
  clearError: () => void;
  lastEmbedResult: EmbedDatasetResult | null;
  activeJobCollectionName?: string | null;
  generateLlmLabels?: (input: GenerateLlmLabelsInput) => Promise<GenerateLlmLabelsResult | null>;
}

export function LocalFileTab({
  fetchLocalFileInfo,
  fetchLocalFilePreview,
  embedLocalFile,
  refreshCollections,
  localFileInfo,
  localFilePreview,
  infoLoading,
  previewLoading,
  embedLoading,
  error,
  clearError,
  lastEmbedResult,
  activeJobCollectionName,
  generateLlmLabels,
}: LocalFileTabProps) {
  const model = useEmbeddingModelState();
  const [llmResumeJobId, setLlmResumeJobId] = useState<string | null>(null);

  // Local file specific state
  const [filePath, setFilePath] = useState('');
  const [dataType, setDataType] = useState<DataType>('TEXT');
  const [collectionName, setCollectionName] = useState('');

  // Column configuration
  const [selectedEmbeddingColumns, setSelectedEmbeddingColumns] = useState<string[]>([]);
  const [selectedMetadataColumns, setSelectedMetadataColumns] = useState<string[]>([]);
  const [textTemplate, setTextTemplate] = useState('');
  const [idColumn, setIdColumn] = useState('auto');

  // Portion configuration
  const [portionStrategy, setPortionStrategy] = useState<PortionStrategy>('FIRST_N');
  const [numRows, setNumRows] = useState(1000);
  const [randomSeed, setRandomSeed] = useState(42);

  const handleEmbeddingColumnsChange = (cols: string[]) => {
    setSelectedEmbeddingColumns(cols);
    setTextTemplate(updateTextTemplate(textTemplate, selectedEmbeddingColumns, cols));
  };

  // Reset columns when file changes
  useEffect(() => {
    setSelectedEmbeddingColumns([]);
    setSelectedMetadataColumns([]);
    setTextTemplate('');
    setIdColumn('auto');
  }, [filePath]);

  const autoConfigureColumns = (columns: string[]) => {
    if (columns.length === 0) return;

    let embeddingCol: string;

    if (dataType === 'VECTOR') {
      const vectorNames = ['embedding', 'embeddings', 'vector', 'vectors', 'emb'];
      const match = columns.find(col =>
        vectorNames.some(name => col.toLowerCase().includes(name))
      );
      embeddingCol = match || columns[0];
      setSelectedEmbeddingColumns([embeddingCol]);
      setTextTemplate('');
    } else {
      embeddingCol = columns[0];
      setSelectedEmbeddingColumns([embeddingCol]);
      setTextTemplate(`{${embeddingCol}}`);
    }

    setSelectedMetadataColumns(columns.filter(col => col !== embeddingCol));

    const idNames = ['id', 'index', 'idx', '_id', 'row_id', 'item_id', 'feature_id', 'doc_id'];
    const idMatch = columns.find(col =>
      idNames.some(name => col.toLowerCase() === name)
    );
    if (idMatch) {
      setIdColumn(idMatch);
    }

    if (filePath && !collectionName) {
      const filename = filePath.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'local_data';
      setCollectionName(filename);
    }
  };

  const handleFetchInfoAndPreview = async () => {
    clearError();

    if (!filePath) {
      alert('Please provide a file path');
      return;
    }
    if (!filePath.startsWith('/')) {
      alert('File path must be absolute (starting with /)');
      return;
    }

    const info = await fetchLocalFileInfo(filePath);
    if (!info || info.error) return;

    await fetchLocalFilePreview(filePath, 5);
    autoConfigureColumns(info.columns);
  };

  const handleEmbed = async () => {
    clearError();

    if (selectedEmbeddingColumns.length === 0) {
      alert(dataType === 'VECTOR' ? 'Please select a vector column' : 'Please select at least one embedding column');
      return;
    }
    if (!collectionName) {
      alert('Please provide a collection name');
      return;
    }

    const metadataColumns = selectedEmbeddingColumns.length === 1
      ? selectedMetadataColumns
      : [...selectedMetadataColumns, ...selectedEmbeddingColumns];

    await embedLocalFile({
      filePath,
      collectionName,
      dataType,
      columns: dataType === 'TEXT' ? selectedEmbeddingColumns : undefined,
      textTemplate: dataType === 'TEXT' ? (textTemplate || undefined) : undefined,
      imageColumn: dataType === 'IMAGE' ? selectedEmbeddingColumns[0] : undefined,
      vectorColumn: dataType === 'VECTOR' ? selectedEmbeddingColumns[0] : undefined,
      idColumn: idColumn !== 'auto' ? idColumn : undefined,
      metadataColumns,
      nRows: portionStrategy === 'FIRST_N' ? numRows : undefined,
      sampleN: portionStrategy === 'RANDOM_SAMPLE' ? numRows : undefined,
      sampleSeed: portionStrategy === 'RANDOM_SAMPLE' ? randomSeed : undefined,
      computeProjections: true,
      batchSize: model.batchSize,
      embeddingModel: dataType === 'TEXT' ? model.buildEmbeddingModelInput() : undefined,
      ...model.getTopicParams(),
    });

    await refreshCollections();
  };

  const handleResumeJob = async (job: EmbeddingJob) => {
    if (generateLlmLabels) {
      const handled = await resumeLlmLabelingJob(job, generateLlmLabels, {
        setLlmResumeJobId,
        refreshCollections,
      });
      if (handled) return;
    }

    const config = job.config as Record<string, unknown>;

    const dataTypeValue = config.data_type as string | undefined;
    const resumeDataType = dataTypeValue?.toUpperCase() as DataType | undefined;

    await embedLocalFile({
      filePath: config.file_path as string,
      collectionName: job.collectionName,
      dataType: resumeDataType,
      columns: config.columns as string[] | undefined,
      textTemplate: config.text_template as string | undefined,
      imageColumn: config.image_column as string | undefined,
      vectorColumn: config.vector_column as string | undefined,
      idColumn: config.id_column as string | undefined,
      metadataColumns: config.metadata_columns as string[] | undefined,
      nRows: config.n_rows as number | undefined,
      sampleN: config.sample_n as number | undefined,
      sampleSeed: config.sample_seed as number | undefined,
      computeProjections: true,
      batchSize: config.batch_size as number | undefined,
      embeddingModel: transformStoredEmbeddingModel(
        config.embedding_model as Record<string, unknown> | undefined
      ),
      resume: true,
    });
    await refreshCollections();
  };

  const isLoading = infoLoading || previewLoading;
  const isDataLoaded = Boolean(localFileInfo);
  const columns = localFileInfo?.columns.map(name => ({ name, dtype: 'unknown' })) || [];
  const totalRows = localFileInfo?.numRows;
  const isVectorMode = dataType === 'VECTOR';

  return (
    <div className="space-y-6">
      {/* Data Source Card */}
      <Card>
        <CardHeader>
          <CardTitle>Local File</CardTitle>
          <CardDescription>
            Upload or provide the path to a local data file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadZone
            filePath={filePath}
            onFilePathChange={setFilePath}
            disabled={isLoading}
          />
          <div className="space-y-2">
            <Label htmlFor="local-collection-name">Collection Name</Label>
            <Input
              id="local-collection-name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g., my_data"
            />
          </div>
          <DataTypeSelector
            dataType={dataType}
            onDataTypeChange={setDataType}
            disabled={isLoading}
          />

          <Button
            onClick={handleFetchInfoAndPreview}
            disabled={isLoading || !filePath}
            className="w-full md:w-auto"
          >
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Fetch File Info & Preview
          </Button>
        </CardContent>
      </Card>

      {error && <ErrorCard error={error} onDismiss={clearError} />}

      {/* File Info & Preview */}
      {isDataLoaded && (
        <Card>
          <CardHeader>
            <CardTitle>File Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatasetInfoDisplay
              type="local"
              info={localFileInfo}
              preview={localFilePreview}
            />
          </CardContent>
        </Card>
      )}

      {/* Column Configuration */}
      {isDataLoaded && columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Column Configuration</CardTitle>
            <CardDescription>
              {isVectorMode
                ? 'Select the vector column and metadata fields'
                : 'Select columns for embedding and configure the text template'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnSelector
              columns={columns}
              dataType={dataType}
              selectedEmbeddingColumns={selectedEmbeddingColumns}
              selectedMetadataColumns={selectedMetadataColumns}
              onEmbeddingColumnsChange={handleEmbeddingColumnsChange}
              onMetadataColumnsChange={setSelectedMetadataColumns}
              textTemplate={textTemplate}
              onTemplateChange={setTextTemplate}
              idColumn={idColumn}
              onIdColumnChange={setIdColumn}
            />
          </CardContent>
        </Card>
      )}

      {/* Portion Configuration */}
      {isDataLoaded && (
        <Card>
          <CardHeader>
            <CardTitle>Dataset Portion</CardTitle>
            <CardDescription>
              {isVectorMode
                ? 'Choose which portion of the file to import'
                : 'Choose which portion of the file to embed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortionSelector
              strategy={portionStrategy}
              onStrategyChange={setPortionStrategy}
              n={numRows}
              onNChange={setNumRows}
              start={0}
              onStartChange={() => { }}
              end={1000}
              onEndChange={() => { }}
              seed={randomSeed}
              onSeedChange={setRandomSeed}
              totalRows={totalRows || null}
              availableSplits={[]}
            />
          </CardContent>
        </Card>
      )}

      {/* Embedding Model Configuration (only for TEXT) */}
      {isDataLoaded && dataType === 'TEXT' && (
        <EmbeddingModelForm
          model={model}
          showTopics={false}
          idPrefix="local-"
        />
      )}

      {/* Topic Extraction (available for all data types) */}
      {isDataLoaded && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="local-enable-topics"
                checked={model.enableTopics}
                onCheckedChange={(checked) => model.setEnableTopics(checked === true)}
              />
              <Label htmlFor="local-enable-topics" className="cursor-pointer">
                {isVectorMode ? 'Extract topics after import' : 'Extract topics after embedding'}
              </Label>
            </div>
            {model.enableTopics && (
              <TopicConfigForm value={model.topicConfig} onChange={model.setTopicConfig} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Embed Button */}
      {isDataLoaded && (
        <Button
          onClick={handleEmbed}
          disabled={embedLoading || selectedEmbeddingColumns.length === 0}
          size="lg"
          className="w-full md:w-auto"
        >
          {embedLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          {isVectorMode ? 'Import Vectors' : 'Embed File'}
        </Button>
      )}

      {lastEmbedResult && <EmbedResultCard result={lastEmbedResult} isImportMode={isVectorMode} />}

      <EmbedProgressSection
        embedLoading={embedLoading}
        activeJobCollectionName={activeJobCollectionName}
        llmResumeJobId={llmResumeJobId}
        onResumeJob={handleResumeJob}
      />
    </div>
  );
}
