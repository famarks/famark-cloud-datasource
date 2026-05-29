import { FieldType, SelectableValue } from '@grafarg/data';
import { Icon, InlineField, InlineFieldRow, Input, Select } from '@grafarg/ui';
import { JsonDataSource } from 'datasource';
import React, { useEffect, useState } from 'react';
import { JsonField, Pair, QueryLanguage } from 'types';
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
}

const attributePath = '/System_Attribute/RetrieveMultipleRecords';

const buildAttributeBody = (entityId: string) =>
  JSON.stringify({
    Columns: 'SystemName',
    Filter: {
      Operator: 0,
      Conditions: [
        {
          FieldName: 'EntityId',
          Operator: 0,
          ServerValue: 0,
          Values: [entityId],
          IsNot: false,
        },
      ],
    },
    OrderBy: 'SystemName',
    PageSize: 500,
    PageIndex: 0,
  });

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

export const FieldEditor = ({
  value = [],
  onChange,
  limit,
  onComplete,
  datasource,
  headers,
  entityId,
  operation,
}: Props) => {
  const [attributeOptions, setAttributeOptions] = useState<Array<SelectableValue<string>>>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const isStats = operation === 'RetrieveStats';

  useEffect(() => {
    if (!entityId) {
      setAttributeOptions([]);
      setAttributesLoading(false);
      return;
    }
    setAttributesLoading(true);
    datasource.api
      .get('POST', attributePath, [], headers, buildAttributeBody(entityId))
      .then((attributes) =>
        setAttributeOptions(attributes.map((record: any) => ({ label: record.SystemName, value: record.SystemName })))
      )
      .finally(() => setAttributesLoading(false));
  }, [datasource, entityId, headers]);

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
    updateField(i, { jsonPath: nextPath });
  };

  const addField = (i: number, defaults?: { language: QueryLanguage }) => () =>
    (!limit || value.length < limit) &&
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

          {(!limit || value.length < limit) && (
            <a className="gf-form-label" onClick={addField(index, { language: field.language ?? 'jsonpath' })}>
              <Icon name="plus" />
            </a>
          )}

          {value.length > 1 ? (
            <a className="gf-form-label" onClick={removeField(index)}>
              <Icon name="minus" />
            </a>
          ) : null}
        </InlineFieldRow>
      ))}
    </>
  );
};
