const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const Residente = require('../models/Residente');
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('🔗 Conectado a MongoDB');
    ejecutarDiagnostico();
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

async function ejecutarDiagnostico() {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE PAGOS');
    console.log('=====================================\n');

    // 1. Obtener todos los residentes con vivienda
    const residentes = await Residente.find({ vivienda: { $exists: true } })
      .populate('vivienda')
      .lean();

    console.log(`👥 Total de residentes con vivienda: ${residentes.length}\n`);

    // 2. Obtener todos los pagos
    const pagos = await Pago.find()
      .populate('residente')
      .populate('vivienda')
      .lean();

    console.log(`📋 Total de pagos: ${pagos.length}\n`);

    // 3. Analizar cada residente
    for (const residente of residentes) {
      console.log(`👤 Residente: ${residente.nombre} ${residente.apellidos}`);
      console.log(`   Vivienda: ${residente.vivienda?.numero}`);
      console.log(`   Fecha ingreso: ${new Date(residente.fechaIngreso).toLocaleDateString()}`);

      // Obtener pagos del residente
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id.toString() === residente._id.toString()
      );

      console.log(`   📋 Pagos encontrados: ${pagosResidente.length}`);

      if (pagosResidente.length === 0) {
        console.log('   ⚠️  NO TIENE PAGOS - Debería aparecer en "Todos" pero no en otros filtros\n');
        continue;
      }

      // Analizar cada pago
      let tienePendientes = false;
      let tieneVencidos = false;
      let todosPagados = true;

      for (const pago of pagosResidente) {
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));

        console.log(`   📄 Pago ${pago.mes}/${pago.año}:`);
        console.log(`      Estado: ${pago.estado}`);
        console.log(`      Monto: $${pago.monto}`);
        console.log(`      Monto pagado: $${pago.montoPagado || 0}`);
        console.log(`      Saldo pendiente: $${saldoPendiente}`);
        console.log(`      Días atraso: ${diasAtraso}`);
        console.log(`      Fecha límite: ${fechaLimite.toLocaleDateString()}`);

        // Determinar si está completamente pagado
        const estaCompletamentePagado = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente';
        
        if (estaCompletamentePagado) {
          console.log(`      ✅ Completamente pagado`);
        } else {
          console.log(`      ❌ Pendiente o vencido`);
          todosPagados = false;
        }

        // Verificar si tiene pendientes o vencidos
        if (!estaCompletamentePagado) {
          if (saldoPendiente > 0 && diasAtraso > 0) {
            tieneVencidos = true;
          } else if (saldoPendiente > 0 && diasAtraso <= 0) {
            tienePendientes = true;
          }
        }
      }

      // Determinar estado del residente
      let estadoResidente;
      if (todosPagados) {
        estadoResidente = 'Al día';
      } else if (tieneVencidos) {
        estadoResidente = 'Vencido';
      } else if (tienePendientes) {
        estadoResidente = 'Pendiente';
      } else {
        estadoResidente = 'Al día';
      }

      console.log(`   📊 Estado del residente: ${estadoResidente}`);

      // Aplicar lógica de filtros (igual que en el frontend)
      const filtros = {
        todos: !todosPagados, // Tiene pagos pendientes
        vencidas: tieneVencidos,
        pendientes: tienePendientes && !tieneVencidos,
        alDia: todosPagados
      };

      console.log(`   🔍 Filtros aplicables:`);
      console.log(`      - Todos: ${filtros.todos ? 'SÍ' : 'NO'}`);
      console.log(`      - Vencidas: ${filtros.vencidas ? 'SÍ' : 'NO'}`);
      console.log(`      - Pendientes: ${filtros.pendientes ? 'SÍ' : 'NO'}`);
      console.log(`      - Al día: ${filtros.alDia ? 'SÍ' : 'NO'}`);

      // Verificar lógica de generarMesesPendientes
      const mesesPendientes = generarMesesPendientes(residente, pagosResidente);
      console.log(`   📅 Meses pendientes generados: ${mesesPendientes.length}`);
      
      if (mesesPendientes.length > 0) {
        mesesPendientes.forEach(mes => {
          console.log(`      - ${mes.mes}/${mes.año}: $${mes.saldoPendiente} (${mes.estado})`);
        });
      }

      console.log('');
    }

    // 4. Resumen general
    console.log('📊 RESUMEN GENERAL:');
    console.log('==================');
    
    const resumen = {
      totalResidentes: residentes.length,
      alDia: 0,
      vencidos: 0,
      pendientes: 0
    };

    for (const residente of residentes) {
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id.toString() === residente._id.toString()
      );

      if (pagosResidente.length === 0) continue;

      let todosPagados = true;
      let tieneVencidos = false;
      let tienePendientes = false;

      for (const pago of pagosResidente) {
        const estaCompletamentePagado = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente';
        
        if (!estaCompletamentePagado) {
          todosPagados = false;
          const saldoPendiente = pago.monto - (pago.montoPagado || 0);
          const fechaLimite = new Date(pago.fechaLimite);
          const hoy = new Date();
          const diasAtraso = hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));

          if (saldoPendiente > 0 && diasAtraso > 0) {
            tieneVencidos = true;
          } else if (saldoPendiente > 0 && diasAtraso <= 0) {
            tienePendientes = true;
          }
        }
      }

      if (todosPagados) {
        resumen.alDia++;
      } else if (tieneVencidos) {
        resumen.vencidos++;
      } else if (tienePendientes) {
        resumen.pendientes++;
      }
    }

    console.log(`Total residentes: ${resumen.totalResidentes}`);
    console.log(`Al día: ${resumen.alDia}`);
    console.log(`Vencidos: ${resumen.vencidos}`);
    console.log(`Pendientes: ${resumen.pendientes}`);

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Función para generar meses pendientes (igual que en el frontend)
function generarMesesPendientes(residente, pagosResidente) {
  if (!residente || !residente.fechaIngreso) return [];

  const fechaIngreso = new Date(residente.fechaIngreso);
  const añoIngreso = fechaIngreso.getFullYear();
  const mesIngreso = fechaIngreso.getMonth() + 1;

  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const mesesPendientes = [];

  // Generar meses desde la fecha de ingreso hasta el mes anterior
  for (let año = añoIngreso; año <= añoActual; año++) {
    const mesInicio = año === añoIngreso ? mesIngreso : 1;
    const mesFin = año === añoActual ? mesActual - 1 : 12; // No generar mes actual automáticamente

    for (let mes = mesInicio; mes <= mesFin; mes++) {
      // Verificar si ya existe un pago para este mes
      const pagoExistente = pagosResidente.find(pago => 
        pago.mes === mes && pago.año === año
      );

      const fechaLimite = new Date(año, mes, 0); // Último día del mes
      const hoy = new Date();
      const diasAtraso = hoy > fechaLimite ? Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)) : 0;

      if (pagoExistente) {
        // Si el pago está completamente pagado, no incluirlo en pendientes
        if (pagoExistente.estado === 'Pagado' || pagoExistente.estado === 'Pagado con excedente') {
          continue; // Saltar este mes, ya está pagado
        }
        
        const saldoPendiente = pagoExistente.monto - (pagoExistente.montoPagado || 0);
        if (saldoPendiente > 0 || diasAtraso > 0 || pagoExistente.estado === 'Parcial') {
          mesesPendientes.push({
            mes,
            año,
            monto: pagoExistente.monto,
            montoPagado: pagoExistente.montoPagado || 0,
            saldoPendiente,
            estado: pagoExistente.estado,
            diasAtraso,
            fechaLimite,
            pagoId: pagoExistente._id,
            existe: true
          });
        }
      } else {
        // Crear mes pendiente que no existe en la base de datos
        const montoMantenimiento = 200; // Valor por defecto
        mesesPendientes.push({
          mes,
          año,
          monto: montoMantenimiento,
          montoPagado: 0,
          saldoPendiente: montoMantenimiento,
          estado: 'Pendiente',
          diasAtraso,
          fechaLimite,
          pagoId: null,
          existe: false
        });
      }
    }
  }

  return mesesPendientes.sort((a, b) => {
    if (a.año !== b.año) return a.año - b.año;
    return a.mes - b.mes;
  });
}
