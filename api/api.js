var bodyparser = require('body-parser');
var express = require('express');
var status = require('http-status');
var _ = require('underscore');

module.exports = function (wagner) {
    var api = express.Router();
    api.use(bodyparser.json());
    
    //   CATEGORY API   //

    api.get('/category/id/:id', wagner.invoke(function (Category) {
        return function (req, res) {
            // EN CASO DE NO TENER UN MIDDLEWARE QUE VERIFIQUE AL USUARIO, ESTO LO HARIA
            // if (!req.user) {
            //     return res.
            //         status(status.UNAUTHORIZED).
            //         json({ error: 'Not logged in' });
            // }
            Category.findOne({ '_id': req.params.id }, function (error, category) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!category) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Category not found' });
                } else {
                    return res.json({ 'category': category });
                }
            });
        };
    }));

    api.get('/category/getChilds/:id', wagner.invoke(function (Category) {
        return function (req, res) {
            Category.find({ 'parent': req.params.id }).sort({ '_id': 1 }).exec(function (error, categories) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!categories) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'No paren categories' });
                } else {
                    return res.json({ 'categories': categories });
                }
            });
        };
    }));

    api.get('/categories', wagner.invoke(function (Category) {
        return function (req, res) {
            Category.find({}, function (error, categories) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!categories) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'categories': categories });
                }
            });
        };
    }));

    //   PRODUCT API   //

    api.get('/products', wagner.invoke(function (Product) {
        return function (req, res) {
            Product.find({}, function (error, products) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!products) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'products': products });
                }
            });
        };
    }));

    api.get('/product/id/:id', wagner.invoke(function (Product) {
        return function (req, res) {
            Product.findOne({ 'name': req.params.id }, function (error, product) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!product) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'product': product });
                }
            });
        };
    }));

    api.get('/product/category/:id', wagner.invoke(function (Product) {
        return function (req, res) {
            var sort = { 'name': 1 };
            if (req.query.price === "1") {
                sort = { 'internal.approximatePriceUSD': 1 };
            } else if (req.query.price === "-1") {
                sort = { 'internal.approximatePriceUSD': -1 };
            }
            Product.find({ 'category.ancestors': req.params.id }).sort(sort).exec(function (error, products) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!products) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'products': products });
                }
            });
        };
    }));

    api.get('/product/text/:query', wagner.invoke(function (Product) {
        return function (req, res) {
            Product.find({
                '$text': { '$search': req.params.query }
            }, {
                    score: { '$meta': 'textScore' }
                }).sort({ 'score': { '$meta': 'textScore' } }).limit(10).exec(function (error, products) {
                    if (error) {
                        return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                    }
                    if (!products || products.length == 0) {
                        return res.status(status.NOT_FOUND).json({ 'error': 'No product match this criteria' });
                    } else {
                        return res.json({ 'products': products });
                    }
                });
        };
    }));

    //   CART API   //

    api.put('/me/cart', wagner.invoke(function (User) {
        return function (req, res) {
            try {
                var cart = req.body.data.cart;
            } catch (e) {
                return res.
                    status(status.BAD_REQUEST).
                    json({ error: 'No cart specified!' });
            }

            req.user.data.cart = cart;
            req.user.save(function (error, user) {
                if (error) {
                    return res.
                        status(status.INTERNAL_SERVER_ERROR).
                        json({ error: error.toString() });
                }
                return res.json({ user: user });
            });
        };
    }));

    api.get('/me', function (req, res) {
        return res.json({ user: req.user });
        //req.user.populate({ path: 'data.cart.product', model: 'Product' }, handleOne.bind(null, 'user', res));
    });

    api.post('/checkout', wagner.invoke(function (User, Stripe) {
        return function (req, res) {
            // Populate the products in the user's cart
            req.user.populate({ path: 'data.cart.product', model: 'Product' }, function (error, user) {

                // Sum up the total price in USD
                var totalCostUSD = 0;
                _.each(user.data.cart, function (item) {
                    totalCostUSD += item.product.internal.approximatePriceUSD *
                        item.quantity;
                });

                // And create a charge in Stripe corresponding to the price
                Stripe.charges.create({
                    // Stripe wants price in cents, so multiply by 100 and round up
                    amount: Math.ceil(totalCostUSD * 100),
                    currency: 'usd',
                    source: req.body.stripeToken,
                    description: 'Example charge'
                },
                    function (err, charge) {
                        if (err && err.type === 'StripeCardError') {
                            return res.
                                status(status.BAD_REQUEST).
                                json({ error: err.toString() });
                        }
                        if (err) {
                            console.log(err);
                            return res.
                                status(status.INTERNAL_SERVER_ERROR).
                                json({ error: err.toString() });
                        }

                        req.user.data.cart = [];
                        req.user.save(function () {
                            // Ignore any errors - if we failed to empty the user's
                            // cart, that's not necessarily a failure

                            // If successful, return the charge id
                            return res.json({ id: charge.id });
                        });
                    });
            });
        };
    }));

    return api;
};

function handleOne(property, res, error, result) {
    if (error) {
        return res.
            status(status.INTERNAL_SERVER_ERROR).
            json({ error: error.toString() });
    }
    if (!result) {
        return res.
            status(status.NOT_FOUND).
            json({ error: 'Not found' });
    }

    var json = {};
    json[property] = result;
    res.json(json);
}
