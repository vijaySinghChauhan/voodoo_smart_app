import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
  details?: string;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log for diagnostics; on web this shows in DevTools console
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ details: errorInfo?.componentStack || undefined });
  }

  handleReload = () => {
    // On web, reload the page; otherwise, attempt a soft reset by clearing state
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: undefined, details: undefined });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Oops, something went wrong</Text>
            {this.state.error?.message ? (
              <Text style={styles.message}>{this.state.error.message}</Text>
            ) : null}
            {this.state.details ? (
              <ScrollView style={styles.detailsBox} contentContainerStyle={styles.detailsContent}>
                <Text style={styles.detailsLabel}>Details</Text>
                <Text style={styles.detailsText}>{this.state.details}</Text>
              </ScrollView>
            ) : null}
            <TouchableOpacity onPress={this.handleReload} style={styles.button}>
              <Text style={styles.buttonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  detailsBox: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
  },
  detailsContent: {
    padding: 8,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 12,
    color: '#555',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
