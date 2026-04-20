import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Lock, FileText } from 'lucide-react';

const STORAGE_KEY = 'lgpd-consent-v1';

export const LgpdConsentDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `${STORAGE_KEY}:${user.id}`;
    if (!localStorage.getItem(key)) setOpen(true);
  }, [user]);

  const handleAccept = () => {
    if (!user) return;
    localStorage.setItem(`${STORAGE_KEY}:${user.id}`, new Date().toISOString());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* persistente: bloqueia fechar sem aceite */ }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Termos de Privacidade e Segurança</DialogTitle>
          </div>
          <DialogDescription>
            Em conformidade com a LGPD e ISO/IEC 27001
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p>Seus dados são tratados sob princípios de <strong className="text-foreground">confidencialidade, integridade e disponibilidade</strong>, com controles de acesso baseados em papéis.</p>
          </div>
          <div className="flex gap-3">
            <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p>As respostas das avaliações ficam vinculadas ao seu usuário e à empresa avaliada, e são utilizadas exclusivamente para gerar relatórios de maturidade de TI.</p>
          </div>
          <div className="flex gap-3">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p>Você pode solicitar a exclusão dos seus dados a qualquer momento, conforme art. 18 da LGPD.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox id="accept" checked={accepted} onCheckedChange={v => setAccepted(v === true)} />
          <label htmlFor="accept" className="text-sm cursor-pointer leading-tight">
            Li e aceito os Termos de Privacidade e a Política de Segurança da Informação.
          </label>
        </div>

        <DialogFooter>
          <Button onClick={handleAccept} disabled={!accepted} className="w-full">
            Aceitar e continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
