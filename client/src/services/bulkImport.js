/**
 * Bulk User Import Service
 * Handles batch user creation with progress tracking
 */
import { createSingleUser, validateUserData } from './userCreation';

/**
 * Process bulk user creation with progress callback
 * @param {Array} users - Array of user data objects
 * @param {Function} onProgress - Callback: ({ current, total, status, user })
 * @returns {Object} { success: [], failed: [] }
 */
export async function bulkCreateUsers(users, onProgress = () => { }) {
    const results = {
        success: [],
        failed: []
    };

    const total = users.length;

    for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const current = i + 1;

        try {
            // Validate first
            const validationErrors = validateUserData(userData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            onProgress({
                current,
                total,
                status: 'creating',
                user: userData.name
            });

            // Create user
            const createdUser = await createSingleUser(userData);
            results.success.push({
                ...userData,
                uid: createdUser.uid,
                generatedPassword: createdUser.password
            });

            onProgress({
                current,
                total,
                status: 'success',
                user: userData.name
            });

        } catch (error) {
            results.failed.push({
                ...userData,
                error: error.message
            });

            onProgress({
                current,
                total,
                status: 'failed',
                user: userData.name,
                error: error.message
            });
        }

        // Small delay to prevent rate limiting
        if (i < users.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

/**
 * Parse and validate bulk import data
 * Returns validated rows with validation status
 */
export function validateBulkData(rows) {
    const validatedRows = [];
    const seenEmails = new Set();
    const seenRollNos = new Set();

    for (const row of rows) {
        const errors = validateUserData(row);

        // Check for duplicates within the file
        const email = row.role === 'driver' ? row.email : `${row.rollNo}@gnu.ac.in`;
        if (seenEmails.has(email)) {
            errors.push('Duplicate email in file');
        }
        seenEmails.add(email);

        if (row.rollNo && seenRollNos.has(row.rollNo)) {
            errors.push('Duplicate roll number in file');
        }
        if (row.rollNo) seenRollNos.add(row.rollNo);

        validatedRows.push({
            ...row,
            isValid: errors.length === 0,
            errors
        });
    }

    return validatedRows;
}

/**
 * Generate error report CSV content
 */
export function generateErrorReport(failedUsers) {
    const headers = ['Name', 'Role', 'RollNo/Email', 'Error'];
    const rows = failedUsers.map(user => [
        user.name || '',
        user.role || '',
        user.rollNo || user.email || '',
        user.error || 'Unknown error'
    ]);

    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

export default {
    bulkCreateUsers,
    validateBulkData,
    generateErrorReport
};
