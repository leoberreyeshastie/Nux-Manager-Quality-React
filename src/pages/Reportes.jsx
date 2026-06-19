import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { FileText } from 'lucide-react';

export default function Reportes() {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Reportes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Módulo en construcción. Próximamente podrás generar reportes de calidad aquí.
        </p>
      </CardContent>
    </Card>
  );
}
