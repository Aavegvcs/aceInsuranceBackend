export function parseRevenueValue(value: string | number | null): number {
    if (value == null) return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
}

interface AggregatedItem {
    [key: string]: string | number;
}

export function combineItems<T extends AggregatedItem>(
        items: T[],
        keyField: keyof T,
        valueField: keyof T,
        sortAndLimit?: { sort: 'ASC' | 'DESC'; limit: number }
    ): T[] {
        const combined: { [key: string]: number } = {};
        items.forEach((item) => {
            const key = String(item[keyField]);
            const value = parseRevenueValue(item[valueField]);
            combined[key] = (combined[key] || 0) + value;
        });

        let result = Object.entries(combined).map(([key, value]) => ({
            [keyField]: key,
            [valueField]: value,
        } as T));

        if (sortAndLimit) {
            result = result
                .sort((a, b) => {
                    const aValue = parseRevenueValue(a[valueField]);
                    const bValue = parseRevenueValue(b[valueField]);
                    return sortAndLimit.sort === 'DESC' ? bValue - aValue : aValue - bValue;
                })
                .slice(0, sortAndLimit.limit);
        }

        return result;
    }
