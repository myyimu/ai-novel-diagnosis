import { SQL, is } from "drizzle-orm";
import { PgDialect, PgTable, getTableConfig } from "drizzle-orm/pg-core";
import type { PgColumn } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// 程序化 DDL 生成器：从 schema.ts 的 drizzle 表定义直接推导
// CREATE TABLE / CREATE INDEX 语句，保证 PGlite 启动路径与 canonical
// schema 之间只有单一数据源 (#9.1)。
//
// 刻意保持窄覆盖：只支持 schema.ts 实际用到的列类型与默认值形态。
// 出现不支持的形态时抛出明确错误，迫使开发者扩展本文件 —— 宁可
// 启动失败，也不要静默生成与 schema 不一致的 DDL。

/** 防御性标识符引用（schema.ts 常量本身不含引号，纯保险） */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** 列的默认值渲染；返回 null 表示无数据库级默认值 */
function renderColumnDefault(column: PgColumn): string | null {
  if (!column.hasDefault || column.default === undefined) {
    // $defaultFn / $onUpdate 是客户端行为，不产生 DDL
    return null;
  }

  const value: unknown = column.default;
  if (value instanceof SQL) {
    // 用 drizzle 自己的方言渲染 SQL 默认值（如 .defaultNow() 的 now()）
    return pgDialect.sqlToQuery(value).sql;
  }

  if (Array.isArray(value)) {
    // jsonb 数组默认值，如 .default([])
    return `'${JSON.stringify(value)}'::jsonb`;
  }
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  throw new Error(
    `ddl: 不支持的默认值类型 ${typeof value}（列 ${column.name}）。` +
      "请在 ddl.ts 的 renderColumnDefault 中显式支持它。",
  );
}

const pgDialect = new PgDialect();

function renderColumnDefinition(
  column: PgColumn,
  options: { forExistingTable: boolean },
): string {
  const parts = [quoteIdent(column.name), column.getSQLType()];

  const defaultValue = renderColumnDefault(column);
  if (defaultValue !== null) {
    parts.push(`DEFAULT ${defaultValue}`);
  }

  if (column.notNull) {
    // 给已有数据的表补列时，NOT NULL 必须伴随 DEFAULT，否则历史行无法满足约束
    if (!options.forExistingTable || defaultValue !== null) {
      parts.push("NOT NULL");
    }
  }

  if (column.primary) {
    parts.push("PRIMARY KEY");
  } else if (column.isUnique) {
    parts.push("UNIQUE");
  }

  return parts.join(" ");
}

/** 生成 CREATE TABLE IF NOT EXISTS（新建库的建表路径） */
export function createTableSql(table: PgTable): string {
  const config = getTableConfig(table);
  const columns = config.columns.map((column) =>
    renderColumnDefinition(column, { forExistingTable: false }),
  );

  return (
    `CREATE TABLE IF NOT EXISTS ${quoteIdent(config.name)} (\n  ` +
    columns.join(",\n  ") +
    "\n)"
  );
}

/** 生成 ALTER TABLE ... ADD COLUMN IF NOT EXISTS（已有库的补列路径） */
export function alterTableAddColumnSql(
  table: PgTable,
  column: PgColumn,
): string {
  const config = getTableConfig(table);
  return (
    `ALTER TABLE ${quoteIdent(config.name)} ADD COLUMN IF NOT EXISTS ` +
    renderColumnDefinition(column, { forExistingTable: true })
  );
}

/** 生成 CREATE [UNIQUE] INDEX IF NOT EXISTS */
export function createIndexSql(table: PgTable): string[] {
  const config = getTableConfig(table);
  const statements: string[] = [];

  for (const index of config.indexes) {
    const columnNames = index.config.columns.map((column) => {
      if (column instanceof SQL || !("name" in column) || !column.name) {
        throw new Error(
          `ddl: 索引 ${index.config.name ?? "<匿名>"} 使用了表达式列，` +
            "请在 ddl.ts 中扩展支持。",
        );
      }
      return quoteIdent(column.name);
    });

    if (!index.config.name) {
      throw new Error(
        `ddl: 表 ${config.name} 存在匿名索引，必须显式命名以保证幂等。`,
      );
    }

    statements.push(
      `CREATE ${index.config.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ` +
        `${quoteIdent(index.config.name)} ON ${quoteIdent(config.name)} ` +
        `(${columnNames.join(", ")})`,
    );
  }

  return statements;
}

/** schema.ts 导出的全部表（按模块声明顺序） */
export function listSchemaTables(): PgTable[] {
  const values = Object.values(schema) as unknown[];
  return values.filter((value): value is PgTable => is(value, PgTable));
}
