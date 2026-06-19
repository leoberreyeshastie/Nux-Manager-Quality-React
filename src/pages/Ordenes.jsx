import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { ClipboardList } from 'lucide-react';

export default function Ordenes() {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Órdenes de Producción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Módulo en construcción. Próximamente podrás gestionar órdenes de producción aquí.
        </p>
      </CardContent>
    </Card>
  );
}
