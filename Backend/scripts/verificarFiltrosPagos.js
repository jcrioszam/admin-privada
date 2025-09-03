const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');

// Cargar variables de entorno
require('dotenv').config({ path: './config.env' });

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function verificarFiltrosPagos() {
  try {
    console.log('🔍 Verificando datos para filtros de pagos...\n');

    // Obtener todos los residentes con vivienda
    const residentes = await Residente.find({ vivienda: { $exists: true } })
      .populate('vivienda', 'numero calle');

    console.log(`👥 Total de residentes: ${residentes.length}\n`);

    // Obtener todos los pagos
    const pagos = await Pago.find({}).populate('vivienda', 'numero calle').populate('residente', 'nombre apellidos');

    console.log(`📋 Total de pagos: ${pagos.length}\n`);

    // Verificar cada residente
    for (const residente of residentes) {
      console.log(`\n👤 Residente: ${residente.nombre} ${residente.apellidos}`);
      console.log(`   Vivienda: ${residente.vivienda?.numero}`);
      console.log(`   Fecha ingreso: ${residente.fechaIngreso}`);

      // Buscar pagos del residente
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id.toString() === residente._id.toString()
      );

      console.log(`   📋 Pagos encontrados: ${pagosResidente.length}`);

      if (pagosResidente.length === 0) {
        console.log(`   ✅ Estado: Sin pagos (Al día)`);
        continue;
      }

      // Analizar cada pago
      let tienePendientes = false;
      let tieneVencidos = false;
      let todosPagados = true;

      pagosResidente.forEach((pago, index) => {
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = hoy > fechaLimite ? Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)) : 0;

        console.log(`   📄 Pago ${index + 1} (${pago.mes}/${pago.año}):`);
        console.log(`      Estado: ${pago.estado}`);
        console.log(`      Monto: $${pago.monto}`);
        console.log(`      Monto pagado: $${pago.montoPagado || 0}`);
        console.log(`      Saldo pendiente: $${saldoPendiente}`);
        console.log(`      Días atraso: ${diasAtraso}`);
        console.log(`      Fecha límite: ${pago.fechaLimite}`);

        // Verificar si está completamente pagado
        if (pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente') {
          console.log(`      ✅ Completamente pagado`);
        } else if (saldoPendiente > 0 || diasAtraso > 0 || pago.estado === 'Parcial') {
          console.log(`      ❌ Pendiente o vencido`);
          tienePendientes = true;
          todosPagados = false;
          
          if (diasAtraso > 0) {
            tieneVencidos = true;
          }
        }
      });

      // Determinar estado del residente
      console.log(`\n   📊 Resumen del residente:`);
      if (todosPagados) {
        console.log(`   ✅ Estado: Al día (todos los pagos están pagados)`);
      } else if (tieneVencidos) {
        console.log(`   ❌ Estado: Vencido (tiene pagos vencidos)`);
      } else if (tienePendientes) {
        console.log(`   ⚠️  Estado: Pendiente (tiene pagos pendientes pero no vencidos)`);
      }

      // Verificar filtros
      console.log(`   🔍 Filtros aplicables:`);
      console.log(`      - Todos: ${todosPagados ? 'NO' : 'SÍ'} (tiene pagos pendientes)`);
      console.log(`      - Vencidas: ${tieneVencidos ? 'SÍ' : 'NO'}`);
      console.log(`      - Pendientes: ${tienePendientes && !tieneVencidos ? 'SÍ' : 'NO'}`);
      console.log(`      - Al día: ${todosPagados ? 'SÍ' : 'NO'}`);
    }

    // Resumen general
    console.log(`\n📊 RESUMEN GENERAL:`);
    const residentesConPagos = residentes.filter(residente => {
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id.toString() === residente._id.toString()
      );
      return pagosResidente.length > 0;
    });

    console.log(`   Total residentes con pagos: ${residentesConPagos.length}`);
    
    // Contar por estado
    let alDia = 0, vencidos = 0, pendientes = 0;
    
    for (const residente of residentesConPagos) {
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id.toString() === residente._id.toString()
      );
      
      let todosPagados = true;
      let tieneVencidos = false;
      
      for (const pago of pagosResidente) {
        if (pago.estado !== 'Pagado' && pago.estado !== 'Pagado con excedente') {
          todosPagados = false;
          const fechaLimite = new Date(pago.fechaLimite);
          const hoy = new Date();
          const diasAtraso = hoy > fechaLimite ? Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)) : 0;
          if (diasAtraso > 0) {
            tieneVencidos = true;
          }
        }
      }
      
      if (todosPagados) {
        alDia++;
      } else if (tieneVencidos) {
        vencidos++;
      } else {
        pendientes++;
      }
    }
    
    console.log(`   Al día: ${alDia}`);
    console.log(`   Vencidos: ${vencidos}`);
    console.log(`   Pendientes: ${pendientes}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verificarFiltrosPagos();
