const request = require('supertest');
const app = require('../src/server'); // assuming server exports the Express app

describe('Auth routes', () => {
  test('POST /api/auth/login - success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data.token');
  });

  test('POST /api/auth/login - missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });
});
