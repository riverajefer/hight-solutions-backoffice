/**
 * Seed ONLY the production module (StepDefinitions + ProductTemplates)
 * against a specific database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx prisma/seed-production.ts
 */
import { PrismaClient, StepType, ComponentPhase } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??  '';

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏭 Seeding PRODUCTION MODULE only...\n');

  // -------------------------------------------------------
  // Step Definitions — 10 tipos de paso atómico reutilizables
  // -------------------------------------------------------
  console.log('📐 Creating step definitions...');

  const stepDefinitionsData: Array<{
    type: StepType;
    name: string;
    description: string;
    fieldSchema: object;
  }> = [
    {
      type: StepType.PAPEL,
      name: 'Papel',
      description: 'Recepción y verificación de papel para impresión',
      fieldSchema: {
        fields: [
          { key: 'tipoPapel', label: 'Tipo de papel', type: 'text', required: true, stage: 'specification' },
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true, stage: 'specification' },
          { key: 'cantidadPliegos', label: 'Cantidad de pliegos', type: 'number', required: true, stage: 'specification' },
          { key: 'tamanoCorte', label: 'Tamaño del corte', type: 'text', required: true, stage: 'specification' },
          { key: 'destino', label: 'Destino', type: 'text', required: false, stage: 'specification' },
          { key: 'cantidadRecibida', label: 'Cantidad recibida', type: 'number', required: true, stage: 'execution' },
          { key: 'cantidadDefectuosa', label: 'Cantidad defectuosa', type: 'number', required: false, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.PLANCHAS,
      name: 'Planchas',
      description: 'Preparación y entrega de planchas al impresor',
      fieldSchema: {
        fields: [
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true, stage: 'specification' },
          { key: 'tamano', label: 'Tamaño', type: 'text', required: true, stage: 'specification' },
          { key: 'descripcion', label: 'Descripción', type: 'text', required: false, stage: 'specification' },
          { key: 'entregadaAlImpresor', label: 'Entregada al impresor', type: 'boolean', required: true, stage: 'execution' },
          { key: 'fechaEntrega', label: 'Fecha de entrega', type: 'text', required: false, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.CARTON,
      name: 'Cartón',
      description: 'Recepción y verificación de cartón para empaste/tapa',
      fieldSchema: {
        fields: [
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true, stage: 'specification' },
          { key: 'tipo', label: 'Tipo de cartón', type: 'text', required: true, stage: 'specification' },
          { key: 'descripcion', label: 'Descripción', type: 'text', required: false, stage: 'specification' },
          { key: 'cantidadRecibida', label: 'Cantidad recibida', type: 'number', required: true, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.MUESTRA_COLOR,
      name: 'Muestra de color',
      description: 'Aprobación de muestra de color antes de impresión completa',
      fieldSchema: {
        fields: [
          { key: 'aprobada', label: 'Aprobada', type: 'boolean', required: true, stage: 'execution' },
          { key: 'fechaAprobacion', label: 'Fecha de aprobación', type: 'text', required: false, stage: 'execution' },
          { key: 'observaciones', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.PLASTIFICADO,
      name: 'Plastificado',
      description: 'Proceso de plastificado de la pieza impresa',
      fieldSchema: {
        fields: [
          { key: 'tipo', label: 'Tipo de plastificado', type: 'select', options: ['mate', 'brillante', 'mate_con_uv_parcial_positivo'], required: true, stage: 'specification' },
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true, stage: 'specification' },
          { key: 'verificado', label: 'Verificado', type: 'boolean', required: true, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.CORTE,
      name: 'Corte',
      description: 'Proceso de corte de la pieza impresa',
      fieldSchema: {
        fields: [
          { key: 'tipoCorte', label: 'Tipo de corte', type: 'text', required: true, stage: 'specification' },
          { key: 'instruccionOGuias', label: 'Instrucción o guías', type: 'text', required: false, stage: 'specification' },
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: false, stage: 'specification' },
          { key: 'cantidadCortada', label: 'Cantidad cortada', type: 'number', required: true, stage: 'execution' },
          { key: 'cantidadDefectuosa', label: 'Cantidad defectuosa', type: 'number', required: false, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.TROQUEL,
      name: 'Troquel',
      description: 'Proceso de troquelado para formas especiales',
      fieldSchema: {
        fields: [
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: true, stage: 'specification' },
          { key: 'descripcionTroquelado', label: 'Descripción del troquelado', type: 'text', required: true, stage: 'specification' },
          { key: 'verificado', label: 'Verificado', type: 'boolean', required: true, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.REVISION,
      name: 'Revisión',
      description: 'Control de calidad del componente',
      fieldSchema: {
        fields: [
          { key: 'cantidadRecibida', label: 'Cantidad recibida', type: 'number', required: true, stage: 'execution' },
          { key: 'calidadAprobada', label: 'Calidad aprobada', type: 'boolean', required: true, stage: 'execution' },
          { key: 'medidaAncho', label: 'Medida ancho (cm)', type: 'number', required: false, stage: 'execution' },
          { key: 'medidaAlto', label: 'Medida alto (cm)', type: 'number', required: false, stage: 'execution' },
          { key: 'cantidadDefectuosa', label: 'Cantidad defectuosa', type: 'number', required: false, stage: 'execution' },
          { key: 'tipoDefecto', label: 'Tipo de defecto', type: 'select', options: ['registro_color', 'manchas', 'corte_descentrado', 'plastificado_burbujas', 'otro'], required: false, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.ARMADO,
      name: 'Armado',
      description: 'Ensamble final del producto',
      fieldSchema: {
        fields: [
          { key: 'tipoArmado', label: 'Tipo de armado', type: 'select', options: ['anillado', 'cosido', 'cosido_al_caballete', 'hot_melt', 'pegue', 'perforado_numeracion'], required: true, stage: 'specification' },
          { key: 'colorAnillo', label: 'Color de anillo', type: 'text', required: false, stage: 'specification' },
          { key: 'cantidad', label: 'Cantidad', type: 'number', required: false, stage: 'specification' },
          { key: 'tamano', label: 'Tamaño', type: 'text', required: false, stage: 'specification' },
          { key: 'proveedor', label: 'Proveedor', type: 'text', required: false, stage: 'specification' },
          { key: 'colorCinta', label: 'Color de cinta', type: 'text', required: false, stage: 'specification' },
          { key: 'verificado', label: 'Verificado', type: 'boolean', required: true, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
    {
      type: StepType.EMPAQUE,
      name: 'Empaque',
      description: 'Empaque y preparación para despacho',
      fieldSchema: {
        fields: [
          { key: 'tipoEmpaque', label: 'Tipo de empaque', type: 'select', options: ['cajas', 'vinipel'], required: true, stage: 'specification' },
          { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, stage: 'specification' },
          { key: 'calidadVerificada', label: 'Calidad verificada', type: 'boolean', required: true, stage: 'execution' },
          { key: 'listoParaEntregar', label: 'Listo para entregar', type: 'boolean', required: true, stage: 'execution' },
          { key: 'notas', label: 'Observaciones', type: 'text', required: false, stage: 'execution' },
        ],
      },
    },
  ];

  const stepDefs: Record<string, { id: string }> = {};
  for (const sd of stepDefinitionsData) {
    const created = await prisma.stepDefinition.upsert({
      where: { type: sd.type },
      update: { name: sd.name, description: sd.description, fieldSchema: sd.fieldSchema },
      create: sd,
    });
    stepDefs[sd.type] = created;
    console.log(`  ✓ StepDefinition: ${sd.name}`);
  }

  // -------------------------------------------------------
  // Product Templates
  // -------------------------------------------------------
  console.log('\n📋 Creating product templates...');

  const upsertTemplate = async (
    templateData: { name: string; category: string; description?: string },
    componentsData: Array<{
      name: string;
      order: number;
      phase: ComponentPhase;
      isRequired?: boolean;
      steps: Array<{ stepType: StepType; order: number; isRequired?: boolean; fieldOverrides?: object }>;
    }>,
  ) => {
    let template = await prisma.productTemplate.findFirst({ where: { name: templateData.name } });
    if (!template) {
      template = await prisma.productTemplate.create({ data: templateData });
    }

    // Eliminar componentes existentes y recrear (para idempotencia)
    await prisma.templateComponent.deleteMany({ where: { templateId: template.id } });

    for (const compData of componentsData) {
      const component = await prisma.templateComponent.create({
        data: {
          templateId: template.id,
          name: compData.name,
          order: compData.order,
          phase: compData.phase,
          isRequired: compData.isRequired !== false,
        },
      });

      for (const stepData of compData.steps) {
        const stepDefId = stepDefs[stepData.stepType]?.id;
        if (!stepDefId) throw new Error(`StepDefinition no encontrada: ${stepData.stepType}`);
        await prisma.templateComponentStep.create({
          data: {
            componentId: component.id,
            stepDefinitionId: stepDefId,
            order: stepData.order,
            isRequired: stepData.isRequired !== false,
            ...(stepData.fieldOverrides ? { fieldOverrides: stepData.fieldOverrides } : {}),
          },
        });
      }
    }

    console.log(`  ✓ Template: ${template.name} (${componentsData.length} componentes)`);
    return template;
  };

  // ---- Plantilla: Cuaderno ----
  await upsertTemplate(
    { name: 'Cuaderno', category: 'cuadernos', description: 'Cuaderno académico o institucional con anillado/cosido' },
    [
      {
        name: 'Portadas', order: 1, phase: ComponentPhase.impresion,
        steps: [
          { stepType: StepType.PAPEL, order: 1 },
          { stepType: StepType.PLANCHAS, order: 2 },
          { stepType: StepType.MUESTRA_COLOR, order: 3 },
          { stepType: StepType.PLASTIFICADO, order: 4 },
          { stepType: StepType.CORTE, order: 5 },
          { stepType: StepType.REVISION, order: 6 },
        ],
      },
      {
        name: 'Hojas internas', order: 2, phase: ComponentPhase.impresion,
        steps: [
          { stepType: StepType.PAPEL, order: 1 },
          { stepType: StepType.PLANCHAS, order: 2 },
          { stepType: StepType.MUESTRA_COLOR, order: 3 },
          { stepType: StepType.CORTE, order: 4 },
          { stepType: StepType.REVISION, order: 5 },
        ],
      },
      {
        name: 'Insertos', order: 3, phase: ComponentPhase.impresion,
        steps: [
          { stepType: StepType.PAPEL, order: 1 },
          { stepType: StepType.PLANCHAS, order: 2 },
          { stepType: StepType.MUESTRA_COLOR, order: 3 },
          { stepType: StepType.CORTE, order: 4 },
          { stepType: StepType.REVISION, order: 5 },
        ],
      },
      {
        name: 'Guardas impresas', order: 4, phase: ComponentPhase.impresion,
        steps: [
          { stepType: StepType.PAPEL, order: 1 },
          { stepType: StepType.PLASTIFICADO, order: 2, isRequired: false },
        ],
      },
      {
        name: 'Guardas en blanco', order: 5, phase: ComponentPhase.material,
        steps: [
          { stepType: StepType.PAPEL, order: 1 },
        ],
      },
      {
        name: 'Cartón', order: 6, phase: ComponentPhase.material,
        steps: [
          { stepType: StepType.CARTON, order: 1 },
        ],
      },
      {
        name: 'Armado', order: 7, phase: ComponentPhase.armado,
        steps: [
          { stepType: StepType.ARMADO, order: 1 },
        ],
      },
      {
        name: 'Empaque y despacho', order: 8, phase: ComponentPhase.despacho,
        steps: [
          { stepType: StepType.EMPAQUE, order: 1 },
          {
            stepType: StepType.REVISION, order: 2,
            fieldOverrides: {
              remove: ['medidaAncho', 'medidaAlto'],
              add: [
                { key: 'listoParaEmpacar', label: 'Listo para empacar', type: 'boolean', required: true, stage: 'execution' },
                { key: 'revisionArmado', label: 'Estado del armado', type: 'select', options: ['firme', 'suelto', 'desalineado'], required: false, stage: 'execution' },
              ],
              override: [
                { key: 'cantidadRecibida', label: 'Cantidad armada' },
              ],
            },
          },
        ],
      },
    ],
  );

  // ---- Plantilla: Carpeta ----
  await upsertTemplate(
    { name: 'Carpeta', category: 'papeleria_impresa', description: 'Carpeta de presentación con troquel y pegue' },
    [
      {
        name: 'Pieza principal', order: 1, phase: ComponentPhase.impresion,
        steps: [
          { stepType: StepType.PAPEL, order: 1 },
          { stepType: StepType.PLANCHAS, order: 2 },
          { stepType: StepType.MUESTRA_COLOR, order: 3 },
          { stepType: StepType.PLASTIFICADO, order: 4 },
          { stepType: StepType.CORTE, order: 5 },
          { stepType: StepType.REVISION, order: 6 },
        ],
      },
      {
        name: 'Troquel', order: 2, phase: ComponentPhase.impresion,
        steps: [
          { stepType: StepType.TROQUEL, order: 1 },
          { stepType: StepType.REVISION, order: 2 },
        ],
      },
      {
        name: 'Armado', order: 3, phase: ComponentPhase.armado,
        steps: [
          {
            stepType: StepType.ARMADO, order: 1,
            fieldOverrides: {
              override: [{ key: 'tipoArmado', label: 'Tipo de armado' }],
            },
          },
        ],
      },
      {
        name: 'Empaque', order: 4, phase: ComponentPhase.despacho,
        steps: [
          { stepType: StepType.EMPAQUE, order: 1 },
          {
            stepType: StepType.REVISION, order: 2,
            fieldOverrides: {
              remove: ['medidaAncho', 'medidaAlto'],
              add: [
                { key: 'listoParaEmpacar', label: 'Listo para empacar', type: 'boolean', required: true, stage: 'execution' },
                { key: 'revisionArmado', label: 'Estado del armado', type: 'select', options: ['firme', 'suelto', 'desalineado'], required: false, stage: 'execution' },
              ],
              override: [
                { key: 'cantidadRecibida', label: 'Cantidad armada' },
              ],
            },
          },
        ],
      },
    ],
  );

  console.log('\n✅ Production module seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
