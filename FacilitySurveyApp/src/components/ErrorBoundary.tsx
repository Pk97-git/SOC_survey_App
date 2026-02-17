import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: any) {
        console.error('[ErrorBoundary] Caught error:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Surface style={styles.card} elevation={2}>
                        <Text variant="titleMedium" style={styles.title}>
                            {this.props.fallbackTitle || 'Something went wrong'}
                        </Text>
                        <Text variant="bodySmall" style={styles.message}>
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </Text>
                        <Button mode="contained" onPress={this.handleRetry} style={styles.button}>
                            Try Again
                        </Button>
                    </Surface>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F5F5F5',
    },
    card: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        maxWidth: 340,
        width: '100%',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 20,
    },
    button: {
        borderRadius: 8,
    },
});
