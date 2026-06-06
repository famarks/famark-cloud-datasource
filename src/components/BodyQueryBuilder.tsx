import { SelectableValue } from '@grafarg/data';
import { Icon, InlineField, InlineFieldRow, Input, Select, useTheme } from '@grafarg/ui';
import { JsonDataSource } from 'datasource';
import { css } from 'emotion';
import React, { useEffect, useState } from 'react';
import { Pair } from '../types';

const attributePath = '/System_Attribute/RetrieveMultipleRecords';
const AGG_VALUES = 'Get_Count,Get_Sum,Get_Avg,Get_StdDev,Get_Max,Get_Min'.split(',');
const AGG_OPTS = AGG_VALUES.map((value) => ({ label: `${value}_`, value }));
const validAggs = new Set(AGG_VALUES);
const splitCol = (column: string): [string, string] => {
  const matchedAgg = AGG_VALUES.find((value) => column.startsWith(value + '_'));
  if (matchedAgg) {
    return [matchedAgg, column.slice(matchedAgg.length + 1)];
  }
  return validAggs.has(column) ? [column, ''] : ['', column];
};
const DTP_OPTS = ['Date', 'Time', 'Day', 'Month', 'Year'].map((v) => ({ label: v, value: v }));

const buildAttributeBody = (entityId: string) =>
  JSON.stringify({
    Columns: 'SystemName, AttributeType',
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
  return attributes.map((record: any) => ({
    label: record.SystemName,
    value: record.SystemName,
    attributeType: record.AttributeType,
  }));
};

/** Parse body JSON → { columns, orderBy, groupBy, dateTimePart, dateTimeInterval } */
const parseBody = (body: string) => {
  try {
    const obj = JSON.parse(body || '{}');
    const cols = String(obj?.Columns ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      columns: cols,
      orderBy: String(obj?.OrderBy ?? '').trim(),
      groupBy: String(obj?.GroupBy ?? '').trim(),
      dateTimePart: String(obj?.DateTimePart ?? ''),
      dateTimeInterval: String(obj?.DateTimeInterval ?? ''),
    };
  } catch {
    return {
      columns: [] as string[],
      orderBy: '',
      groupBy: '',
      dateTimePart: '',
      dateTimeInterval: '',
      error: 'Invalid JSON body',
    };
  }
};

interface Props {
  datasource: JsonDataSource;
  entityId?: string;
  headers: Array<Pair<string, string>>;
  body: string;
  onBodyChange: (body: string) => void;
  operation?: string;
}

export const BodyQueryBuilder: React.FC<Props> = ({ datasource, entityId, headers, body, onBodyChange, operation }) => {
  const theme = useTheme();
  const [columns, setColumns] = useState<string[]>(['']);
  const [orderBy, setOrderBy] = useState('');
  const [parseError, setParseError] = useState<string>();
  const [addError, setAddError] = useState<string>();
  const [attrOptions, setAttrOptions] = useState<Array<SelectableValue<string>>>([]);
  const [loading, setLoading] = useState(false);
  const [dateTimePart, setDateTimePart] = useState('');
  const [dateTimeInterval, setDateTimeInterval] = useState('');
  const isStats = operation === 'RetrieveStats';

  // Sync columns/orderBy/dateTime state from the body prop
  useEffect(() => {
    const {
      columns: cols,
      orderBy: ob,
      groupBy: gb,
      dateTimePart: dtp,
      dateTimeInterval: dti,
      error,
    } = parseBody(body);
    setParseError(error);
    setColumns(cols.length ? cols : ['']);
    setOrderBy(isStats ? gb : ob);
    setDateTimePart(dtp);
    setDateTimeInterval(dti);
  }, [body, isStats]);

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
  const save = (cols: string[], ob: string, dtp = dateTimePart, dti = dateTimeInterval) => {
    const obj: Record<string, string> = { Columns: cols.filter(Boolean).join(', ') };
    if (isStats) {
      if (ob) {
        obj.GroupBy = ob;
      }
      if (dtp) {
        obj.DateTimePart = dtp;
        if (dtp === 'Time' && dti) {
          obj.DateTimeInterval = dti;
        }
      }
    } else {
      obj.OrderBy = ob;
    }
    onBodyChange(JSON.stringify(obj, null, 2));
  };

  const onColumnChange = (i: number, value?: string, removeIfEmpty = false) => {
    const next = [...columns];
    if (removeIfEmpty && !value) {
      if (next.length > 1) {
        next.splice(i, 1);
      } else {
        next[i] = '';
      }
    } else {
      next[i] = value ?? '';
    }
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
  columns.forEach((c) => {
    if (!c) {
      return;
    }
    if (isStats) {
      const [agg, attr] = splitCol(c);
      if (attr && !agg) {
        errors.push(`Select a function for "${attr}"`);
      }
      if (hasOptions) {
        if (agg && !validAggs.has(agg)) {
          errors.push(`"${agg}" is not a valid aggregation`);
        }
        if (attr && !validValues.has(attr)) {
          errors.push(`"${attr}" is not a valid attribute`);
        }
      }
      return;
    }
    if (hasOptions && !validValues.has(c)) {
      errors.push(`"${c}" is not a valid attribute`);
    }
  });
  if (hasOptions && orderBy && !validValues.has(orderBy)) {
    errors.push(`"${orderBy}" is not a valid attribute`);
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
            {columns.map((col, i) => {
              if (isStats) {
                const [agg, attr] = splitCol(col);
                const missingAgg = !!(attr && !agg);
                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span
                        className={css`
                          font-weight: bold;
                          padding: 0 4px;
                          opacity: 0.7;
                        `}
                      >
                        +
                      </span>
                    )}
                    <div
                      className={css`
                        display: inline-flex;
                        gap: 2px;
                        border: 1px solid rgba(204, 204, 220, 0.15);
                        border-radius: 4px;
                        padding: 2px;
                      `}
                    >
                      <Select
                        placeholder="Function"
                        value={agg ? { label: `${agg}_`, value: agg } : undefined}
                        options={AGG_OPTS}
                        isClearable={true}
                        onChange={(v) => {
                          const nextAgg = v?.value ?? '';
                          const nextValue = nextAgg ? (attr ? `${nextAgg}_${attr}` : nextAgg) : attr;
                          onColumnChange(i, nextValue, true);
                        }}
                        width={14}
                        invalid={!!(missingAgg || (col && agg && !validAggs.has(agg)))}
                      />
                      <Select
                        placeholder="Attribute"
                        isLoading={loading}
                        value={attr ? { label: attr, value: attr } : undefined}
                        options={attrOptions}
                        isClearable={true}
                        onChange={(v) => {
                          const nextAttr = v?.value ?? '';
                          const nextValue = nextAttr ? (agg ? `${agg}_${nextAttr}` : nextAttr) : agg;
                          onColumnChange(i, nextValue, true);
                        }}
                        width={18}
                        invalid={!!(hasOptions && attr && !validValues.has(attr))}
                      />
                    </div>
                  </React.Fragment>
                );
              }
              return (
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
              );
            })}
            <a className="gf-form-label" onClick={addColumn}>
              <Icon name="plus" />
            </a>
          </div>
        </InlineField>
      </InlineFieldRow>
      {isStats ? (
        <>
          <InlineFieldRow>
            <InlineField label="GroupBy" grow>
              <Select
                placeholder="GroupBy"
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
          <InlineFieldRow>
            <InlineField label="DateTimePart">
              <Select
                placeholder="DateTimePart"
                isClearable={true}
                value={dateTimePart ? { label: dateTimePart, value: dateTimePart } : undefined}
                options={DTP_OPTS}
                onChange={(v) => {
                  const dtp = v?.value ?? '';
                  setDateTimePart(dtp);
                  if (dtp !== 'Time') {
                    setDateTimeInterval('');
                  }
                  save(columns, orderBy, dtp, dtp === 'Time' ? dateTimeInterval : '');
                }}
                width={16}
              />
            </InlineField>
          </InlineFieldRow>
          {dateTimePart === 'Time' && (
            <InlineFieldRow>
              <InlineField label="DateTimeInterval">
                <Input
                  placeholder="e.g. 1h, 1m"
                  value={dateTimeInterval}
                  onChange={(e) => setDateTimeInterval(e.currentTarget.value)}
                  onBlur={(e) => save(columns, orderBy, dateTimePart, e.currentTarget.value)}
                  width={16}
                />
              </InlineField>
            </InlineFieldRow>
          )}
        </>
      ) : (
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
      )}
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
