/**
 * DriverErrorBoundary Component
 * Catches errors in driver dashboard and shows fallback UI
 * Single responsibility: Error handling for driver view
 */
import React from 'react';
import { Card, CardBody, Button } from '@/components/ui';

class DriverErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Driver Dashboard Error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="driver-view">
                    <main className="driver-content" style={{ padding: '2rem' }}>
                        <Card>
                            <CardBody style={{ textAlign: 'center' }}>
                                <h2 style={{ marginBottom: '1rem' }}>⚠️ Something went wrong</h2>
                                <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                                    The driver dashboard encountered an error.
                                </p>
                                <Button onClick={this.handleRetry} variant="primary">
                                    🔄 Try Again
                                </Button>
                            </CardBody>
                        </Card>
                    </main>
                </div>
            );
        }

        return this.props.children;
    }
}

export default DriverErrorBoundary;
