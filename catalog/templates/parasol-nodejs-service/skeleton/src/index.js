const express = require('express');
const { collectDefaultMetrics, register } = require('prom-client');

collectDefaultMetrics();

const app = express();
const PORT = process.env.PORT || ${{ values.port }};

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'UP' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from ${{ values.name }}' });
});

app.listen(PORT, () => {
  console.log(`${{ values.name }} listening on port ${PORT}`);
});
