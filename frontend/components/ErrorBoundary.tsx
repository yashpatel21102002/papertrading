"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message };
    }

    handleReset = () => {
        this.setState({ hasError: false, message: "" });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <p className="text-foreground font-medium mb-1">Something went wrong</p>
                    {this.state.message && (
                        <p className="text-xs text-muted-foreground mb-4 font-mono max-w-sm">{this.state.message}</p>
                    )}
                    <button
                        onClick={this.handleReset}
                        className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted transition-colors text-foreground"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
