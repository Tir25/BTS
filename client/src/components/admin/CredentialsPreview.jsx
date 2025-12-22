/**
 * CredentialsPreview Component
 * Displays generated email and password preview for new users
 * Single responsibility: Show credentials preview
 */
import { useEffect, useState } from 'react';
import { generateEmail, birthdayToPassword } from '@/services/userCreation';

export function CredentialsPreview({ role, rollNo, email, name, birthday }) {
    const [preview, setPreview] = useState({ email: '—', password: '—' });

    useEffect(() => {
        if (birthday) {
            const generatedEmail = generateEmail(role, rollNo, email, name);
            const password = birthdayToPassword(new Date(birthday));
            setPreview({
                email: generatedEmail || '—',
                password: password || '—'
            });
        }
    }, [role, rollNo, email, name, birthday]);

    if (!birthday) return null;

    return (
        <div className="credentials-preview">
            <h4>Generated Credentials</h4>
            <div className="credential-row">
                <span className="credential-label">Email:</span>
                <code>{preview.email}</code>
            </div>
            <div className="credential-row">
                <span className="credential-label">Password:</span>
                <code>{preview.password}</code>
            </div>
        </div>
    );
}

export default CredentialsPreview;
