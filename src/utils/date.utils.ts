import { Logger } from '@nestjs/common';

export class DateUtils {
    private static logger = new Logger('DateUtils');


    static generateMonthKey(date: Date | string): string {
        const istDate = this.normalizeDate(new Date(date));
        return `${istDate.getFullYear()}-${(istDate.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    static getDatesBetween(start: Date, end: Date): Date[] {
        this.logger.debug(`Generating dates between ${start.toISOString()} and ${end.toISOString()}`);
        const dates: Date[] = [];
        const currentDate = new Date(start);
        while (currentDate <= end) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        this.logger.debug(`Generated ${dates.length} dates`);
        return dates;
    }
    static toMySQLDate(dateStr: string): string | null {
        if (!dateStr || typeof dateStr !== 'string') return null;

        dateStr = dateStr.trim().split(' ')[0];

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;

        let day: string, month: string, year: string;

        if (parts[0].length === 4) {
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
        } else if (parseInt(parts[0]) > 12) {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (parseInt(parts[1]) > 12) {
            day = parts[1].padStart(2, '0');
            month = parts[0].padStart(2, '0');
            year = parts[2];
        } else {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        }

        if (year.length === 2) year = '20' + year;

        return `${year}-${month}-${day}`;
    }

    static parseDate(dateInput: any, caller: string = 'unknown'): string | null {
        if (!dateInput || (typeof dateInput === 'string' && dateInput.trim() === '')) {
            return null;
        }

        let dateStr: string;
        if (dateInput instanceof Date) {
            dateStr = dateInput.toISOString().split('T')[0];
        } else if (typeof dateInput === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
            dateStr = date.toISOString().split('T')[0];
        } else {
            dateStr = String(dateInput).trim().replace(/^'|'$/g, '');
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            if (
                !isNaN(date.getTime()) &&
                date.getFullYear() === year &&
                date.getMonth() + 1 === month &&
                date.getDate() === day
            ) {
                return dateStr;
            }
        }

        const monthMap: Record<string, number> = {
            JAN: 1,
            FEB: 2,
            MAR: 3,
            APR: 4,
            MAY: 5,
            JUN: 6,
            JUL: 7,
            AUG: 8,
            SEP: 9,
            OCT: 10,
            NOV: 11,
            DEC: 12,
            JANUARY: 1,
            FEBRUARY: 2,
            MARCH: 3,
            APRIL: 4,
            JUNE: 6,
            JULY: 7,
            AUGUST: 8,
            SEPTEMBER: 9,
            OCTOBER: 10,
            NOVEMBER: 11,
            DECEMBER: 12,
        };

        const ddmmmyyyyMatch = dateStr.match(/^(\d{2})([A-Z]{3})(\d{4})$/i);
        if (ddmmmyyyyMatch) {
            const [, day, monthAbbr, year] = ddmmmyyyyMatch;
            const month = monthMap[monthAbbr.toUpperCase()];
            if (month) {
                const date = new Date(Number(year), month - 1, Number(day));
                if (!isNaN(date.getTime())) {
                    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }
            }
        }

        const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (ddmmyyyyMatch) {
            const [, day, month, year] = ddmmyyyyMatch.map(Number);
            const date = new Date(year, month - 1, day);
            if (
                !isNaN(date.getTime()) &&
                date.getDate() === day &&
                date.getMonth() + 1 === month &&
                date.getFullYear() === year
            ) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }

        const formats = [
            { regex: /^(\d{2})-(\d{2})-(\d{4})(\s+\d{2}:\d{2})?$/, order: ['day', 'month', 'year'] },
            { regex: /^(\d{2})\/(\d{2})\/(\d{4})(\s+\d{2}:\d{2})?$/, order: ['day', 'month', 'year'] },
            { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(\s+\d{1,2}:\d{2})?$/, order: ['month', 'day', 'year'] },
            { regex: /^(\d{4})-(\d{2})-(\d{2})(\s+\d{1,2}:\d{2})?$/, order: ['year', 'month', 'day'] },
        ];

        for (const { regex, order } of formats) {
            const match = dateStr.match(regex);
            if (match) {
                const parts: Record<string, number> = {};
                order.forEach((part, index) => {
                    parts[part] = Number(match[index + 1]);
                });

                let year = parts.year;
                if (year < 100) {
                    year += year < 50 ? 2000 : 1900;
                }

                const date = new Date(year, parts.month - 1, parts.day);
                if (!isNaN(date.getTime()) && date.getMonth() + 1 === parts.month && date.getDate() === parts.day) {
                    return `${year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
                }
            }
        }

        return null;
    }

    static calculateFinancialYear(columns: Record<string, any[]>, dateColumn: string): string[] {
        return (columns[dateColumn] || []).map((date) => {
            const parsed = this.parseDate(date);
            if (!parsed) return new Date().getUTCFullYear().toString();
            const [year] = parsed.split('-').map(Number);
            return year.toString();
        });
    }

    static extractDateFromScripSymbol(scripSymbol: string): string | null {
        if (!scripSymbol) return null;
        const dateStr = scripSymbol.match(/\d{2}[A-Z]{3}\d{4}/i)?.[0] || null;
        if (!dateStr) {
            return null;
        }
        return this.parseDate(dateStr);
    }

    static normalizeDate(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    // Utility to format dates (e.g., DD-MM-YYYY)
    static formatDate = (date: Date | string | null | undefined): string => {
        if
            (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    static getDateKey(date: Date, period: 'Weekly' | 'Monthly' | 'Yearly'): string {
        switch (period) {
            case 'Yearly':
                return `${date.getUTCFullYear()}`;
            case 'Monthly':
                return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
            case 'Weekly':
                // Get the start of the week (Monday)
                const startOfWeek = new Date(date);
                const day = date.getUTCDay() || 7; // Convert Sunday (0) to 7
                startOfWeek.setUTCDate(date.getUTCDate() - (day - 1));
                return `${startOfWeek.getUTCFullYear()}-${startOfWeek.getUTCMonth() + 1}-${startOfWeek.getUTCDate()}`;
            default:
                throw new Error(`Invalid period: ${period}`);

        }
    }

    // Returns array of 'YYYY-MM-DD'
    static getDateRange(start: Date, end: Date): string[] {
        const dates: string[] = [];
        let current = new Date(start);
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setUTCDate(current.getUTCDate() + 1);
        }
        return dates;
    }

    static subtractDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(date.getDate() - days);
        return this.normalizeDate(result);
    }

    // Returns array of 'YYYY-MM'
    static getMonthRange(start: Date, end: Date): string[] {
        const months: string[] = [];
        const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
        const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
        while (current <= endMonth) {
            months.push(`${current.getUTCFullYear()}-${(current.getUTCMonth() + 1).toString().padStart(2, '0')}`);
            current.setUTCMonth(current.getUTCMonth() + 1);
        }
        return months;
    }

    // Returns array of 'YYYY'
    static getYearRange(start: Date, end: Date): string[] {
        const years: string[] = [];
        const startYear = start.getUTCFullYear();
        const endYear = end.getUTCFullYear();
        for (let year = startYear; year <= endYear; year++) {
            years.push(`${year}`);
        }
        return years;
    }

    static toMonthFormat(input: Date | string): string {
        const date = typeof input === 'string' ? new Date(input) : input;
        if (isNaN(date.getTime())) throw new Error('Invalid date');

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based

        return `${year}-${month}`;
    }
}


