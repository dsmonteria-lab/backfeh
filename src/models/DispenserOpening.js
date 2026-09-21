const pool = require('../config/database');

class DispenserOpening {
  static async getActiveByDispenser(dispenser_id) {
    const result = await pool.query(
      `SELECT do.*, u.nombre as usuario_nombre
       FROM dispenser_openings do
       JOIN users u ON do.user_id = u.id
       WHERE do.dispenser_id = $1 AND do.estado = 'abierta'
       ORDER BY do.fecha_apertura DESC LIMIT 1`,
      [dispenser_id]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT do.*, d.codigo as dispenser_codigo, d.nombre as dispenser_nombre, u.nombre as usuario_nombre
       FROM dispenser_openings do
       JOIN dispensers d ON do.dispenser_id = d.id
       JOIN users u ON do.user_id = u.id
       WHERE do.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async createOpeningWithReadings({ dispenser_id, user_id, lecturas, observaciones }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verificar que el surtidor esté en estado activo
      const dispenserRes = await client.query('SELECT * FROM dispensers WHERE id = $1', [dispenser_id]);
      if (dispenserRes.rows.length === 0) {
        throw new Error('Surtidor no encontrado');
      }
      const dispenser = dispenserRes.rows[0];
      if (dispenser.estado !== 'activo') {
        throw new Error(`El surtidor no está disponible para apertura (Estado actual: ${dispenser.estado})`);
      }

      // 2. Verificar que no exista apertura activa
      const activeRes = await client.query(
        "SELECT id FROM dispenser_openings WHERE dispenser_id = $1 AND estado = 'abierta'",
        [dispenser_id]
      );
      if (activeRes.rows.length > 0) {
        throw new Error('Ya existe una apertura activa para este surtidor');
      }

      // 3. Crear registro de apertura
      const openingRes = await client.query(
        `INSERT INTO dispenser_openings (dispenser_id, user_id, observaciones)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [dispenser_id, user_id, observaciones || '']
      );
      const opening = openingRes.rows[0];

      // 4. Validar e insertar lecturas iniciales por manguera
      for (const item of lecturas) {
        const { hose_id, lectura_inicial } = item;

        const hoseRes = await client.query('SELECT * FROM hoses WHERE id = $1 AND dispenser_id = $2', [hose_id, dispenser_id]);
        if (hoseRes.rows.length === 0) {
          throw new Error(`La manguera ID ${hose_id} no pertenece al surtidor ${dispenser_id}`);
        }
        const hose = hoseRes.rows[0];

        const lecturaNum = parseFloat(lectura_inicial);
        const ultimaEsperada = parseFloat(hose.ultima_lectura_final_aceptada);

        if (isNaN(lecturaNum) || lecturaNum < 0) {
          throw new Error(`Lectura inicial inválida para manguera ${hose.posicion_codigo}`);
        }

        // Regla fundamental: lectura inicial DEBE coincidir exactamente con la última lectura final aceptada
        if (Math.abs(lecturaNum - ultimaEsperada) > 0.001) {
          throw new Error(
            `Rechazo de apertura en manguera ${hose.posicion_codigo} (${hose.identificador_contador}): ` +
            `La lectura ingresable (${lecturaNum}) no coincide con la última lectura final aceptada (${ultimaEsperada}).`
          );
        }

        await client.query(
          `INSERT INTO dispenser_opening_readings (opening_id, hose_id, lectura_inicial)
           VALUES ($1, $2, $3)`,
          [opening.id, hose_id, lecturaNum]
        );
      }

      await client.query('COMMIT');
      return opening;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getReadingsByOpening(opening_id) {
    const result = await pool.query(
      `SELECT dor.*, h.posicion_codigo, h.identificador_contador, h.product_id, p.nombre as producto_nombre
       FROM dispenser_opening_readings dor
       JOIN hoses h ON dor.hose_id = h.id
       JOIN products p ON h.product_id = p.id
       WHERE dor.opening_id = $1
       ORDER BY h.id ASC`,
      [opening_id]
    );
    return result.rows;
  }

  static async closeOpeningWithReadings({ opening_id, lecturas_finales, tolerancia = 0.1, observaciones }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const openingRes = await client.query('SELECT * FROM dispenser_openings WHERE id = $1 AND estado = \'abierta\'', [opening_id]);
      if (openingRes.rows.length === 0) {
        throw new Error('Apertura activa no encontrada o ya se encuentra cerrada');
      }
      const opening = openingRes.rows[0];

      let tieneDescuadreGlobal = false;
      const resumenMangueras = [];

      for (const item of lecturas_finales) {
        const { hose_id, lectura_final } = item;

        const readingRes = await client.query(
          'SELECT * FROM dispenser_opening_readings WHERE opening_id = $1 AND hose_id = $2',
          [opening_id, hose_id]
        );
        if (readingRes.rows.length === 0) {
          throw new Error(`Registro de lectura inicial no encontrado para manguera ${hose_id}`);
        }
        const reading = readingRes.rows[0];
        const lecturaInicial = parseFloat(reading.lectura_inicial);
        const lecturaFinalNum = parseFloat(lectura_final);

        if (isNaN(lecturaFinalNum) || lecturaFinalNum < lecturaInicial) {
          throw new Error(
            `Lectura final (${lecturaFinalNum}) no puede ser menor que la lectura inicial (${lecturaInicial}). Se requiere procedimiento de mantenimiento o reemplazo.`
          );
        }

        const galonesMecanicos = parseFloat((lecturaFinalNum - lecturaInicial).toFixed(1));

        // Calcular total galones registrados en la tabla sales para este opening_id y hose_id
        const salesRes = await client.query(
          `SELECT COALESCE(SUM(galones), 0) as total_galones
           FROM sales
           WHERE opening_id = $1 AND hose_id = $2 AND (deleted IS NULL OR deleted = false)`,
          [opening_id, hose_id]
        );
        const galonesRegistrados = parseFloat(parseFloat(salesRes.rows[0].total_galones).toFixed(1));

        const diferencia = parseFloat((galonesMecanicos - galonesRegistrados).toFixed(1));
        const descuadre = Math.abs(diferencia) > tolerancia;
        const estadoConciliacion = descuadre ? 'descuadre' : 'ok';

        if (descuadre) {
          tieneDescuadreGlobal = true;
        }

        await client.query(
          `UPDATE dispenser_opening_readings
           SET lectura_final = $1,
               galones_mecanicos = $2,
               galones_registrados = $3,
               diferencia = $4,
               estado_conciliacion = $5,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [lecturaFinalNum, galonesMecanicos, galonesRegistrados, diferencia, estadoConciliacion, reading.id]
        );

        // Actualizar ultima lectura final aceptada en la manguera
        await client.query(
          'UPDATE hoses SET ultima_lectura_final_aceptada = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [lecturaFinalNum, hose_id]
        );

        resumenMangueras.push({
          hose_id,
          lecturaInicial,
          lecturaFinal: lecturaFinalNum,
          galonesMecanicos,
          galonesRegistrados,
          diferencia,
          estadoConciliacion
        });
      }

      // Marcar apertura como cerrada o en conflicto
      const estadoFinal = tieneDescuadreGlobal ? 'en_conflicto' : 'cerrada';
      await client.query(
        `UPDATE dispenser_openings
         SET fecha_cierre = CURRENT_TIMESTAMP,
             estado = $1,
             observaciones = COALESCE($2, observaciones),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [estadoFinal, observaciones, opening_id]
      );

      await client.query('COMMIT');
      return {
        opening_id,
        estado: estadoFinal,
        tieneDescuadreGlobal,
        resumenMangueras
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllOpenings(limit = 50) {
    const result = await pool.query(
      `SELECT do.*, d.codigo as dispenser_codigo, d.nombre as dispenser_nombre, u.nombre as usuario_nombre
       FROM dispenser_openings do
       JOIN dispensers d ON do.dispenser_id = d.id
       JOIN users u ON do.user_id = u.id
       ORDER BY do.fecha_apertura DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

module.exports = DispenserOpening;
