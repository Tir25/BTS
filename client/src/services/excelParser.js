/**
 * Excel Parser Service
 * Handles parsing Excel/CSV files for bulk import
 */
import * as XLSX from 'xlsx';

/**
 * Parse Excel/CSV file to JSON array
 * @param {File} file - File object from input
 * @returns {Promise<Array>} Parsed rows as objects
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    defval: ''
                });

                // Normalize column names
                const normalizedData = jsonData.map(normalizeRow);

                resolve(normalizedData);
            } catch (error) {
                reject(new Error('Failed to parse file: ' + error.message));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Normalize row data - handle different column name variations
 */
function normalizeRow(row) {
    const normalized = {};

    // Map possible column names to standard names
    const columnMappings = {
        role: ['role', 'Role', 'ROLE', 'user_role', 'userRole'],
        rollNo: ['rollNo', 'RollNo', 'roll_no', 'Roll No', 'Roll Number', 'rollno', 'id', 'ID'],
        email: ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail'],
        name: ['name', 'Name', 'NAME', 'full_name', 'fullName', 'Full Name'],
        birthday: ['birthday', 'Birthday', 'dob', 'DOB', 'Date of Birth', 'dateOfBirth', 'birth_date'],
        phone: ['phone', 'Phone', 'PHONE', 'mobile', 'Mobile', 'contact', 'Contact'],
        licenseNumber: ['licenseNumber', 'license', 'License', 'License Number', 'licence', 'driver_license']
    };

    for (const [standardKey, variations] of Object.entries(columnMappings)) {
        for (const variation of variations) {
            if (row[variation] !== undefined && row[variation] !== '') {
                normalized[standardKey] = String(row[variation]).trim();
                break;
            }
        }
    }

    // Parse birthday to proper format if needed
    if (normalized.birthday) {
        normalized.birthday = parseBirthday(normalized.birthday);
    }

    return normalized;
}

/**
 * Parse various birthday formats to Date
 */
function parseBirthday(value) {
    // Already DDMMYYYY format (8 digits)
    if (/^\d{8}$/.test(value)) {
        const day = value.slice(0, 2);
        const month = value.slice(2, 4);
        const year = value.slice(4, 8);
        return new Date(year, month - 1, day);
    }

    // Try standard date parsing
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Return as-is if can't parse (will fail validation later)
    return value;
}

/**
 * Generate template Excel file for download
 */
export function generateTemplate() {
    const templateData = [
        {
            role: 'student',
            rollNo: '24084231065',
            email: '',
            name: 'Sample Student',
            birthday: '15032001',
            phone: '9876543210',
            licenseNumber: ''
        },
        {
            role: 'faculty',
            rollNo: 'FAC2024001',
            email: '',
            name: 'Sample Faculty',
            birthday: '01011980',
            phone: '9123456789',
            licenseNumber: ''
        },
        {
            role: 'driver',
            rollNo: '',
            email: 'driver@gmail.com',
            name: 'Sample Driver',
            birthday: '22051985',
            phone: '9999999999',
            licenseNumber: 'GJ01-12345'
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Download file
    XLSX.writeFile(workbook, 'user_import_template.xlsx');
}

export default {
    parseExcelFile,
    generateTemplate
};
