// src/components/ReportePDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registrar fuentes (opcional)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '1 solid #ccc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eee',
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  tableCellOrder: { flex: 1.5 },
  tableCellHallazgos: { flex: 3 },
  tableCellEvidencias: { flex: 1 },
  tableCellAccion: { flex: 1.5 },
  tableCellCantidad: { flex: 1 },
  tableCellPorcentaje: { flex: 1 },
  // ... más estilos
});

// Función para formatear fecha
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Componente principal del PDF
export const ReportePDF = ({ datos, mes, anio, logoUrl }) => {
  const { ordenes, metrics, paretoDefectos, detalleDefectos } = datos;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={{ width: 60, height: 60 }} />}
          <View>
            <Text style={styles.title}>Reporte de Indicadores de Calidad</Text>
            <Text style={styles.subtitle}>Mes: {MONTHS[mes]} {anio}</Text>
            <Text style={styles.subtitle}>Generado: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Tabla de órdenes */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginVertical: 10 }}>Detalle de Órdenes</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableCellOrder]}>Orden</Text>
            <Text style={[styles.tableCell, styles.tableCellHallazgos]}>Hallazgos</Text>
            <Text style={[styles.tableCell, styles.tableCellEvidencias]}>Evidencias</Text>
            <Text style={[styles.tableCell, styles.tableCellAccion]}>Acción</Text>
            <Text style={[styles.tableCell, styles.tableCellCantidad]}>Piezas</Text>
            <Text style={[styles.tableCell, styles.tableCellPorcentaje]}>% de Orden</Text>
          </View>

          {ordenes.map((orden, idx) => {
            // Obtener hallazgos del mes para esta orden
            const hallazgos = obtenerHallazgos(orden.id, datos) || [];
            const totalPiezas = hallazgos.reduce((sum, h) => sum + (h.piezas_detectadas || 0), 0);
            const porcentaje = orden.piezasProducidas > 0 ? (totalPiezas / orden.piezasProducidas) * 100 : 0;
            const acciones = [...new Set(hallazgos.map(h => getCatalogoNombre(h.accion_id) || 'N/A'))].join(', ');
            const evidenciasCount = hallazgos.reduce((sum, h) => sum + (h.evidencias?.length || 0), 0);

            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellOrder]}>{orden.codigo}</Text>
                <View style={[styles.tableCell, styles.tableCellHallazgos]}>
                  {hallazgos.map((h, i) => (
                    <Text key={i}>• {i+1}. {h.descripcion || getCatalogoNombre(h.defecto_id) || 'Defecto'}</Text>
                  ))}
                </View>
                <Text style={[styles.tableCell, styles.tableCellEvidencias]}>{evidenciasCount}</Text>
                <Text style={[styles.tableCell, styles.tableCellAccion]}>{acciones}</Text>
                <Text style={[styles.tableCell, styles.tableCellCantidad]}>{totalPiezas}</Text>
                <Text style={[styles.tableCell, styles.tableCellPorcentaje]}>{porcentaje.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>

        {/* Tabla resumen */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginVertical: 10 }}>Resumen del Mes</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Concepto</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Valor</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Total de Órdenes</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.totalOrdenes}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Órdenes Internas</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.internas}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Órdenes Externas</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.externas}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Productos No Conformes (Piezas)</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.piezasDetectadas}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Piezas Totales Producidas</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.piezasProduccion}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>% No Conforme</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.calidad.toFixed(2)}%</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Observaciones</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{metrics.observaciones || 'Sin observaciones'}</Text>
          </View>
        </View>

        {/* Gráficos (opcional) */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginVertical: 10 }}>Análisis Gráfico</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Aquí irían imágenes de gráficos generadas desde Chart.js */}
          <Image src={chartImage1} style={{ width: '48%', height: 150 }} />
          <Image src={chartImage2} style={{ width: '48%', height: 150 }} />
        </View>
      </Page>
    </Document>
  );
};