import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import PageErrorFallback from "~/components/errors/PageErrorFallback";

interface ClientErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface ClientErrorBoundaryState {
  hasError: boolean;
}

class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Client render error", error, errorInfo);
  }

  componentDidUpdate(prevProps: ClientErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <PageErrorFallback />;
    }

    return this.props.children;
  }
}

export default ClientErrorBoundary;
