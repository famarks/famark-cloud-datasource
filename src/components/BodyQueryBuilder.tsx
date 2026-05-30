import { SelectableValue } from '@grafarg/data';
import { Icon, InlineField, InlineFieldRow, Select, useTheme } from '@grafarg/ui';
import { JsonDataSource } from 'datasource';
import { css } from 'emotion';
import React, { useEffect, useState } from 'react';
import { Pair } from '../types';

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
  });

export const fetchAttributeOptions = async (
  datasource: JsonDataSource,
  headers: Array<Pair<string, string>>,
  entityId: string
): Promise<Array<SelectableValue<string>>> => {
  const attributes = await datasource.api.get('POST', attributePath, [], headers, buildAttributeBody(entityId));
  return attributes.map((record: any) => ({ label: record.SystemName, value: record.SystemName }));
};

/** Parse body JSON → { columns, orderBy } */
const parseBody = (body: string) => {
  try {
    const obj = JSON.parse(body || '{}');
    const cols = String(obj?.Columns ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return { columns: cols, orderBy: String(obj?.OrderBy ?? '').trim() };
  } catch {
    return { columns: [] as string[], orderBy: '', error: 'Invalid JSON body' };
  }
};

/** Serialize columns + orderBy → JSON body string */
const toBody = (cols: string[], orderBy: string) =>
  JSON.stringify({ Columns: cols.join(', '), OrderBy: orderBy }, null, 2);

interface Props {
  datasource: JsonDataSource;
  entityId?: string;
  headers: Array<Pair<string, string>>;
  body: string;
  onBodyChange: (body: string) => void;
}

export const BodyQueryBuilder: React.FC<Props> = ({ datasource, entityId, headers, body, onBodyChange }) => {
  const theme = useTheme();
  const [columns, setColumns] = useState<string[]>(['']);
  const [orderBy, setOrderBy] = useState('');
  const [parseError, setParseError] = useState<string>();
  const [addError, setAddError] = useState<string>();
  const [attrOptions, setAttrOptions] = useState<Array<SelectableValue<string>>>([]);
  const [loading, setLoading] = useState(false);

  // Sync columns/orderBy state from the body prop
  useEffect(() => {
    const { columns: cols, orderBy: ob, error } = parseBody(body);
    setParseError(error);
    setColumns(cols.length ? cols : ['']);
    setOrderBy(ob);
  }, [body]);

  // Fetch attribute options when entityId changes
  useEffect(() => {
    if (!entityId) {
      setAttrOptions([]);
      return;
    }
    setLoading(true);
    fetchAttributeOptions(datasource, headers, entityId)
      .then(setAttrOptions)
      .catch(() => setAttrOptions([]))
      .finally(() => setLoading(false));
  }, [datasource, entityId, headers]);

  // Save helpers
  const save = (cols: string[], ob: string) => onBodyChange(toBody(cols.filter(Boolean), ob));

  const onColumnChange = (i: number, value?: string) => {
    const next = [...columns];
    next[i] = value ?? '';
    setColumns(next);
    if (value) {
      setAddError(undefined);
    }
    save(next, orderBy);
  };

  const addColumn = () => {
    if (!columns[columns.length - 1]) {
      setAddError('Select a value before adding another column.');
      return;
    }
    setColumns([...columns, '']);
  };

  const onOrderByChange = (value?: string) => {
    const ob = value ?? '';
    setOrderBy(ob);
    save(columns, ob);
  };

  // Build dropdown options, filtering out already-selected columns
  const optionsFor = (current?: string) => {
    const used = new Set(columns.filter((v) => v && v !== current));
    const filtered = attrOptions.filter((o) => !used.has(o.value ?? ''));
    if (current && !filtered.some((o) => o.value === current)) {
      return [{ label: current, value: current }, ...filtered];
    }
    return filtered;
  };

  // Validation — skip attribute checks while loading or before options are fetched
  const validValues = new Set(attrOptions.map((o) => o.value ?? ''));
  const hasOptions = !loading && attrOptions.length > 0;
  const errors: string[] = [];
  if (hasOptions) {
    columns.forEach((c) => {
      if (c && !validValues.has(c)) {
        errors.push(`"${c}" is not a valid attribute`);
      }
    });
    if (orderBy && !validValues.has(orderBy)) {
      errors.push(`"${orderBy}" is not a valid attribute`);
    }
  }
  if (addError) {
    errors.push(addError);
  }
  if (parseError) {
    errors.push(parseError);
  }

  return (
    <>
      <InlineFieldRow>
        <InlineField
          label="Columns"
          grow
          className={css`
            flex: 1 1 0;
            min-width: 0;
          `}
        >
          <div
            className={css`
              display: flex;
              flex-wrap: wrap;
              gap: ${theme.spacing.sm};
              align-items: center;
              width: 100%;
            `}
          >
            {columns.map((col, i) => (
              <Select
                key={i}
                placeholder="Column"
                isLoading={loading}
                isClearable={true}
                invalid={!!(hasOptions && col && !validValues.has(col))}
                value={col ? { label: col, value: col } : undefined}
                options={optionsFor(col)}
                onChange={(v) => onColumnChange(i, v?.value)}
                width={20}
              />
            ))}
            <a className="gf-form-label" onClick={addColumn}>
              <Icon name="plus" />
            </a>
          </div>
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="OrderBy" grow>
          <Select
            placeholder="OrderBy"
            isLoading={loading}
            isClearable={true}
            invalid={!!(hasOptions && orderBy && !validValues.has(orderBy))}
            value={orderBy ? { label: orderBy, value: orderBy } : undefined}
            options={attrOptions}
            onChange={(v) => onOrderByChange(v?.value)}
            width={20}
          />
        </InlineField>
      </InlineFieldRow>
      {errors.length > 0 && (
        <div
          className={css`
            background: rgba(255, 77, 79, 0.08);
            color: ${theme.palette.red};
            font-size: 12px;
            border: 1px solid rgba(255, 77, 79, 0.45);
            border-left: 3px solid ${theme.palette.red};
            border-radius: 3px;
            padding: ${theme.spacing.xs} ${theme.spacing.sm};
            margin-top: ${theme.spacing.xs};
            max-width: 700px;
          `}
        >
          {errors.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}
    </>
  );
};
