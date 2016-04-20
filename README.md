# Code Exercise

In this part, you set up several REST API endpoints:

* `GET /category/id/:id`
* `GET /category/parent/:id`
* `GET /product/id/:id`
* `GET /product/category/:id`
* `PUT /me/cart`
* `GET /me`
* `POST /checkout`
* `GET /product/text/:query`

Which depend on 5 services:

* Category
* Product
* User
* Stripe
* fx
* Mandrill