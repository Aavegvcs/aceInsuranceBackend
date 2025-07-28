import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';

// Restored standard UPSERT (ON DUPLICATE KEY UPDATE) for all tables
export async function bulkUpsert<T extends Object>(
    tableName: string,
    data: T[],
    columns: string[],
    updateColumns: string[],
    manager: EntityManager,
    chunkSize: number = 2000,
    hasUpdatedAt: boolean = false
): Promise<{ affected: number; errors: { batch: number; error: string }[] }> {
    if (data.length === 0) {
        Logger.warn(`No data to upsert for table ${tableName}`);
        return { affected: 0, errors: [] };
    }

    if (!columns.length || !updateColumns.length) {
        throw new Error(`Columns and update columns are required for ${tableName}`);
    }

    const validTables = [
        'user',
        'client',
        'bank_account',
        'employee',
        'branch',
        'dealer',
        'user_role',
        'branch_dealer'
    ];
    if (!validTables.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
    }

    const errors: { batch: number; error: string }[] = [];
    let affected = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        const flatValues = chunk.flatMap((obj) => columns.map((col) => obj[col]));

        // Always use standard INSERT for upsert
        const insertClause = `INSERT INTO`;
        const updateClause = updateColumns.map((col) => `\`${col}\` = VALUES(\`${col}\`)`);
        if (hasUpdatedAt) updateClause.push('updatedAt = NOW()');

        const query = `
            ${insertClause} \`${tableName}\`
            (${columns.map((col) => `\`${col}\``).join(', ')})
            VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE ${updateClause.join(', ')}
        `;

        try {
            const result = await manager.query(query, flatValues);
            affected += result.affectedRows || 0;
        } catch (error) {
            const batchNo = Math.floor(i / chunkSize) + 1;
            const errMsg = error?.message || error?.sqlMessage || 'Unknown error';
            const msg = `Upsert failed for ${tableName} batch ${batchNo}: ${errMsg}`;
            errors.push({ batch: batchNo, error: msg });
            Logger.error(msg, error.stack || error);
        }
    }

    if (errors.length) {
        Logger.warn(`Encountered ${errors.length} errors during ${tableName} upsert: ${JSON.stringify(errors)}`);
    }
    Logger.debug(`bulkUpsert ${tableName}: Processed ${data.length} rows, Affected=${affected}`);
    return { affected, errors };
}
