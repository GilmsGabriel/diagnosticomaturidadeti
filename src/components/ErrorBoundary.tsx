import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
            </div>
            <h1 className="text-xl font-bold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado ao renderizar esta página. Tente novamente.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/70 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.reset}>Tentar novamente</Button>
              <Button onClick={() => { this.reset(); window.location.href = '/dashboard'; }}>
                Ir para o início
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}