import { FieldType, SelectableValue } from '@grafarg/data';
import { Icon, InlineField, InlineFieldRow, Input, Select } from '@grafarg/ui';
import { JsonDataSource } from 'datasource';
import React, { useEffect, useState } from 'react';
import { JsonField, Pair, QueryLanguage } from 'types';
import { fetchAttributeOptions } from './BodyQueryBuilder';
import { JsonataQueryField } from './JsonataQueryField';
import { JsonPathQueryField } from './JsonPathQueryField';

interface Props {
  datasource: JsonDataSource;
  entityId?: string;
  operation?: string;
  headers: Array<Pair<string, string>>;
  limit?: number;
  onChange: (value: JsonField[]) => void;
  onComplete: () => Promise<any>;
  value: JsonField[];
  body?: string;
}

const findLastAttribute = (path: string, options: Array<SelectableValue<string>>) => {
  let lastIndex = -1;
  let lastValue = '';
  for (const option of options) {
    const value = option.value ?? '';
    const index = value ? path.lastIndexOf(`.${value}`) : -1;
    if (index > lastIndex) {
      lastIndex = index;
      lastValue = value;
    }
  }
  return lastIndex >= 0 ? { lastIndex, lastValue } : undefined;
};

const getSelectedAttribute = (path: string, options: Array<SelectableValue<string>>) => {
  const last = findLastAttribute(path, options);
  return last ? options.find((option) => option.value === last.lastValue) : undefined;
};

const parseColumnsFromBody = (body?: string): string[] => {
  try {
    const obj = JSON.parse(body || '{}');
    return String(obj?.Columns ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const attributeTypeToFieldType = (attrType?: string): FieldType | undefined => {
  switch (attrType) {
    case 'TypeCurrency':
    case 'TypeDecimalNumber':
    case 'TypeFloatingNumber':
    case 'TypeWholeNumber':
      return FieldType.number;
    case 'TypeSingleLine':
    case 'TypeMultipleLine':
      return FieldType.string;
    case 'TypeDateTime':
      return FieldType.time;
    case 'TypeTwoOptions':
      return FieldType.boolean;
    case 'TypeLookup':
    case 'TypeOptionSet':
      return undefined;
    default:
      return undefined;
  }
};

export const FieldEditor = ({
  value = [],
  onChange,
  limit,
  onComplete,
  datasource,
  headers,
  entityId,
  operation,
  body,
}: Props) => {
  console.log('rendering body data', body);
  const didPrefill = React.useRef(false);
  const [attributeOptions, setAttributeOptions] = useState<Array<SelectableValue<string>>>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const isStats = operation === 'RetrieveStats';
  const getAttributeType = (name?: string) =>
    attributeOptions.find((o) => o.value === name)?.attributeType as string | undefined;

  useEffect(() => {
    if (!entityId) {
      setAttributeOptions([]);
      setAttributesLoading(false);
      return;
    }
    setAttributesLoading(true);
    fetchAttributeOptions(datasource, headers, entityId)
      .then(setAttributeOptions)
      .catch(() => setAttributeOptions([]))
      .finally(() => setAttributesLoading(false));
  }, [datasource, entityId, headers]);

  useEffect(() => {
    if (didPrefill.current || value.length) {
      return;
    }
    const columns = parseColumnsFromBody(body);
    if (!columns.length) {
      return;
    }

    const prefix = operation === 'RetrieveMultipleRecords' ? '$[*].' : '$.';
    const next = columns.map((col, idx) => {
      const existing = value[idx];
      const attrType = isStats ? undefined : getAttributeType(col);
      return {
        name: existing?.name ?? '',
        jsonPath: isStats ? '$.Data[*][*]' : `${prefix}${col}`,
        language: existing?.language ?? 'jsonpath',
        type: existing?.type ?? (isStats ? undefined : attributeTypeToFieldType(attrType)),
      };
    });

    const same =
      value.length === next.length &&
      value.every((field, i) => field.jsonPath === next[i].jsonPath && field.type === next[i].type);

    if (!same) {
      onChange(next);
    }
    didPrefill.current = true;
  }, [body, isStats, operation, value.length, onChange, attributeOptions]);

  useEffect(() => {
    if (isStats && value.some((field) => !field.jsonPath)) {
      onChange(value.map((field) => (field.jsonPath ? field : { ...field, jsonPath: '$.Data[*][*]' })));
    }
  }, [isStats, onChange, value]);
  const updateField = (i: number, patch: Partial<JsonField>) =>
    onChange(value.map((field, n) => (i === n ? { ...value[i], ...patch } : field)));
  const onChangePath = (i: number) => (e: string) => updateField(i, { jsonPath: e });
  const onLanguageChange = (i: number) => (e: SelectableValue<QueryLanguage>) => updateField(i, { language: e.value });
  const onChangeType = (i: number) => (e: SelectableValue<string>) =>
    updateField(i, { type: (e.value === 'auto' ? undefined : e.value) as FieldType });
  const onAliasChange = (i: number) => (e: any) => updateField(i, { name: e.currentTarget.value });

  const onAttributeChange = (i: number) => (e: SelectableValue<string> | null) => {
    const current = value[i]?.jsonPath ?? '';
    const last = findLastAttribute(current, attributeOptions);
    const prefix = operation === 'RetrieveMultipleRecords' ? '$[*].' : '$.';
    const nextPath = e?.value
      ? last
        ? `${current.slice(0, last.lastIndex + 1)}${e.value}${current.slice(
            last.lastIndex + 1 + last.lastValue.length
          )}`
        : `${current ? (current.endsWith('.') ? current : `${current}.`) : prefix}${e.value}`
      : last
      ? current.slice(0, last.lastIndex) + current.slice(last.lastIndex + 1 + last.lastValue.length)
      : current;
    const attrType = e?.value ? getAttributeType(e.value) : undefined;
    const mappedType = attrType ? attributeTypeToFieldType(attrType) : undefined;
    updateField(i, { jsonPath: nextPath, type: mappedType });
  };

  const addField = (i: number, defaults?: { language: QueryLanguage }) => () =>
    onChange([...value.slice(0, i + 1), { name: '', jsonPath: '', ...defaults }, ...value.slice(i + 1)]);
  const removeField = (i: number) => () => onChange(value.filter((_, n) => n !== i));

  return (
    <>
      {value.map((field, index) => (
        <InlineFieldRow key={index}>
          {!isStats && (
            <InlineField label="Attribute">
              <Select
                placeholder="Attribute"
                isLoading={attributesLoading}
                isClearable={true}
                value={getSelectedAttribute(field.jsonPath ?? '', attributeOptions)}
                width={20}
                options={attributeOptions}
                onChange={onAttributeChange(index)}
              />
            </InlineField>
          )}
          <InlineField
            tooltip={
              <div>
                A <a href="https://goessner.net/articles/JsonPath/">JSON Path</a> query that selects one or more values
                from a JSON object.
              </div>
            }
            grow
          >
            {field.language === 'jsonata' ? (
              <JsonataQueryField onBlur={() => onChange(value)} onChange={onChangePath(index)} query={field.jsonPath} />
            ) : (
              <JsonPathQueryField
                onBlur={() => onChange(value)}
                onChange={onChangePath(index)}
                query={field.jsonPath}
                onData={onComplete}
              />
            )}
          </InlineField>
          <InlineField>
            <Select
              value={field.language ?? 'jsonpath'}
              width={14}
              onChange={onLanguageChange(index)}
              options={[
                { label: 'JSONPath', value: 'jsonpath' },
                { label: 'JSONata', value: 'jsonata' },
              ]}
            />
          </InlineField>
          <InlineField label="Type" tooltip="If Auto is set, the JSON property type is used to detect the field type.">
            <Select
              value={field.type ?? 'auto'}
              width={12}
              onChange={onChangeType(index)}
              options={[
                { label: 'Auto', value: 'auto' },
                { label: 'String', value: 'string' },
                { label: 'Number', value: 'number' },
                { label: 'Time', value: 'time' },
                { label: 'Boolean', value: 'boolean' },
              ]}
            />
          </InlineField>
          <InlineField label="Alias" tooltip="If left blank, the field uses the name of the queried element.">
            <Input width={12} value={field.name} onChange={onAliasChange(index)} />
          </InlineField>

          <a className="gf-form-label" onClick={addField(index, { language: field.language ?? 'jsonpath' })}>
            <Icon name="plus" />
          </a>

          <a className="gf-form-label" onClick={removeField(index)}>
            <Icon name="minus" />
          </a>
        </InlineFieldRow>
      ))}
    </>
  );
};
