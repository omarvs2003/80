const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Importa y configura dotenv
require('dotenv').config();

app.use(express.json());

// Sirve archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

app.post('/process_payment', async (req, res) => {
  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: '1.00'
      }
    }]
  };

  try {
    // Obtén un token de acceso
    const authResponse = await axios.post(
      'https://api-m.paypal.com/v1/oauth2/token',  // URL de producción
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const token = authResponse.data.access_token;

    // Crea el pedido
    const orderResponse = await axios.post(
      'https://api-m.paypal.com/v2/checkout/orders',  // URL de producción
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    res.json(orderResponse.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
    res.status(500).send('Error procesando el pago');
  }
});

// Inicia el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});