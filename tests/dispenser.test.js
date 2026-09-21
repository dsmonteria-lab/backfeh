const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');

describe('Dispenser Module Integration Tests', () => {
  let adminToken;
  let sellerToken;
  let dispenserId;
  let hoseId;
  let productId = 1; // Gasolina Corriente
  let openingId;
  let shiftId;

  beforeAll(async () => {
    // 1. Obtener token Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@eds.com', password: 'admin123' });
    adminToken = adminLogin.body.data.token;

    // 2. Obtener token Vendedor
    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vendedor@eds.com', password: 'vendedor123' });
    sellerToken = sellerLogin.body.data.token;

    // 3. Abrir un turno para el vendedor
    const shiftRes = await request(app)
      .post('/api/shifts/start')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ lectura_inicial: 100, product_id: 1 });
    shiftId = shiftRes.body.data.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  test('1. Crear surtidor (Admin)', async () => {
    const res = await request(app)
      .post('/api/dispensers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: `SURT-TEST-${Date.now()}`, nombre: 'Surtidor Principal Test' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    dispenserId = res.body.data.id;
  });

  test('2. Configurar Manguera con contador inicial (Admin)', async () => {
    const res = await request(app)
      .post('/api/dispensers/hoses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dispenser_id: dispenserId,
        posicion_codigo: 'M1-TEST',
        product_id: productId,
        identificador_contador: 'CONT-TEST-001',
        ultima_lectura_final_aceptada: 500.0,
        digitos_enteros: 6,
        digitos_decimales: 1
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    hoseId = res.body.data.id;
  });

  test('3. Apertura rechazada por lectura errónea (no coincide con 500.0)', async () => {
    const res = await request(app)
      .post('/api/dispensers/opening/start')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        dispenser_id: dispenserId,
        lecturas: [{ hose_id: hoseId, lectura_inicial: 505.0 }]
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('no coincide');
  });

  test('4. Apertura rechazada cuando falta una lectura', async () => {
    const res = await request(app)
      .post('/api/dispensers/opening/start')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        dispenser_id: dispenserId,
        lecturas: []
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('5. Venta rechazada por surtidor sin apertura activa', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        product_id: productId,
        galones: 5.0,
        total_dinero: 100000.0,
        metodo_pago: 'efectivo',
        dispenser_id: dispenserId,
        hose_id: hoseId
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('no tiene una apertura mecánica activa');
  });

  test('6. Apertura exitosa con lectura coincidente (500.0)', async () => {
    const res = await request(app)
      .post('/api/dispensers/opening/start')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        dispenser_id: dispenserId,
        lecturas: [{ hose_id: hoseId, lectura_inicial: 500.0 }],
        observaciones: 'Apertura de prueba'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    openingId = res.body.data.id;
  });

  test('7. Venta rechazada por producto que no coincide con la manguera', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        product_id: 2, // ACPM (la manguera tiene Gasolina Corriente ID 1)
        galones: 2.0,
        total_dinero: 41000.0,
        metodo_pago: 'efectivo',
        dispenser_id: dispenserId,
        hose_id: hoseId
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('no coincide con el producto asignado');
  });

  test('8. Venta de combustible exitosa con apertura activa', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        product_id: productId,
        galones: 10.0,
        total_dinero: 200000.0,
        metodo_pago: 'efectivo',
        dispenser_id: dispenserId,
        hose_id: hoseId,
        uuid_offline: `test-uuid-${Date.now()}`
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('9. Mantenimiento de surtidor bloquea ventas', async () => {
    // Poner surtidor en mantenimiento (Admin)
    await request(app)
      .post('/api/dispensers/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dispenser_id: dispenserId,
        tipo_evento: 'mantenimiento_preventivo',
        motivo: 'Revision de fugas'
      });

    // Intentar venta durante mantenimiento
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        product_id: productId,
        galones: 2.0,
        total_dinero: 40000.0,
        metodo_pago: 'efectivo',
        dispenser_id: dispenserId,
        hose_id: hoseId
      });
    expect(saleRes.statusCode).toBe(400);
    expect(saleRes.body.success).toBe(false);
    expect(saleRes.body.message).toContain('mantenimiento');
  });

  test('10. Vendedor no puede desbloquear o autorizar retorno al servicio', async () => {
    const res = await request(app)
      .post('/api/dispensers/authorize-return')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ dispenser_id: dispenserId, motivo: 'Desbloqueo no autorizado' });
    expect(res.statusCode).toBe(403);
  });

  test('11. Admin autoriza retorno al servicio', async () => {
    const res = await request(app)
      .post('/api/dispensers/authorize-return')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dispenser_id: dispenserId, motivo: 'Mantenimiento finalizado con exito' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('12. Cierre de surtidor con lectura final y conciliación', async () => {
    // Vendimos 10 galones en la prueba 8. Lectura inicial fue 500.0. Lectura final esperada: 510.0.
    const res = await request(app)
      .post('/api/dispensers/opening/close')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        opening_id: openingId,
        lecturas_finales: [{ hose_id: hoseId, lectura_final: 510.0 }],
        observaciones: 'Cierre de prueba concuerda'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tieneDescuadreGlobal).toBe(false);
    expect(res.body.data.estado).toBe('cerrada');
  });
});
