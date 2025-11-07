const request = require('supertest');
const app = require('../src/app'); // Import the configured Express app
const { server, io } = require('../src/index'); // Import server and io to close them

describe('API Endpoints', () => {
  // Close server and socket connections after all tests
  afterAll((done) => {
    io.close();
    server.close(done);
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api', () => {
    it('should return API message', async () => {
      const res = await request(app).get('/api');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Server API is running!');
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/nonexistent').expect(404);
      expect(res.body).toHaveProperty('error', 'Route not found');
    });
  });
});