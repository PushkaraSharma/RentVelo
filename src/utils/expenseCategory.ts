import { formatExpenseLabel } from './Constants';

/** Base category for duplicate recurring checks (strips Property prefix and remarks). */
export const normalizeExpenseCategory = (label?: string | null): string => {
    let base = formatExpenseLabel(label ?? '');
    const dashIdx = base.indexOf(' - ');
    if (dashIdx > 0) {
        base = base.slice(0, dashIdx);
    }
    return base.trim().toLowerCase();
};

export const isDuplicateRecurringCategory = (
    existingLabels: string[],
    newLabel: string
): boolean => {
    const key = normalizeExpenseCategory(newLabel);
    if (!key) return false;
    return existingLabels.some((existing) => normalizeExpenseCategory(existing) === key);
};
