const express = require('express');
const mercadoPago = require('mercadopago');
const app = express()
const { v4 } = require('uuid');
require('dotenv/config');


app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.set('view engine', 'ejs')

var database = {
  products: [
    {
      id: 'IGYOQAOSDBUPOWZZ',
      name: 'Carrinho de compras',
      price: 15.99
    }
  ],

  payments: [
  ]
}

mercadoPago.configure({
  sandbox: true, // Modo desenvolvimento
  access_token: process.env.ACCESS_TOKEN
})

app.get('/', (req, res) => {
  res.render('product')
})

app.get('/payments', (req, res) => {
  res.render('payment', {payments: database.payments})
})



// Rota para gerar pagamento
app.get('/pay/:product_id', async (req, res) => {
  let id = v4();
  let emailpagador = 'emailPagado@gmail.com';
  let product_id = req.params.product_id;


  var product = database.products.filter(product => product.id == product_id);

  if (product.length == 0) {
    return res.sendStatus(404)
  }

  // Dados para a API
  let dados = {
    items: [
      item = {
        id: id, // id da venda
        title: product[0].name,
        quantity: 1, // quantidade, multiplica o preço unitário
        currency_id: 'BRL',
        unit_price: parseFloat(product[0].price) // preço que o usuário vai pagar
      }
    ],

    payer: { // quem vai pagar
      email:emailpagador
    },
    external_reference: id,
  }


  try {
    // Gera um pagamento
    var pagamento = await mercadoPago.preferences.create(dados)

    // Insere um novo pagamento
    database.payments.push({
      email: emailpagador,
      id_payment: id,
      name: product[0].name,
      price: parseFloat(product[0].price),
      status: 'A pagar'
    })
    
    // Retorna o checkout para o usuário
    return res.redirect(pagamento.body.init_point);
  } catch(error) {
    return res.send(error.message)
  }
})

app.post('/notify', (req, res) => {
  var id = req.query.id;
  console.log('chegou!')

  // Esperar 20s para o mercado pago cadastrar a venda no db deles.
  setTimeout(() => {
    var filtro = { "order.id": id }

    // Verifica se o pagamento está no banco de dados do mercado pago
    mercadoPago.payment.search({
      qs: filtro
    }).then(data => {
      // Pagamento está no banco de dados
      var payment = data.body.results[0]
      if (payment != undefined) {

        if (payment.status === 'approved') {
          let id_payment = database.payments.findIndex(pay => pay.id_payment == payment.external_reference)
          database.payments[id_payment].status = 'Pago'
        } else {
          console.log('pagamento não aprovado!', payment.status)
        }
      } else {
        console.log('Pagamento não existe!', payment)
      }
    }).catch(error => {
      console.log(error)
    })
  }, 20000) // 20s

  res.send('ok');
})


app.listen(80, (req, res) => {
  console.log('Server is running');
})